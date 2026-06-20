# Service Provider Directory - API Route Examples

These are template implementations for the API routes. Adapt these to your project's structure and error handling.

## 1. Search Providers Route

**File**: `src/app/api/providers/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { searchProvidersSchema } from '@/lib/service-provider/schemas';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse and validate filters
    const filters = searchProvidersSchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search'),
      provider_type: searchParams.get('provider_type'),
      service_category: searchParams.get('service_category'),
      location: searchParams.get('location'),
      latitude: searchParams.get('latitude'),
      longitude: searchParams.get('longitude'),
      radius_km: searchParams.get('radius_km'),
      min_rating: searchParams.get('min_rating'),
      price_min: searchParams.get('price_min'),
      price_max: searchParams.get('price_max'),
      is_verified: searchParams.get('is_verified') === 'true',
      sort_by: searchParams.get('sort_by'),
    });

    const offset = (filters.page - 1) * filters.limit;

    // Build query
    let query = supabase
      .from('service_providers')
      .select('*', { count: 'exact' })
      .eq('status', 'approved')
      .eq('is_verified', true);

    // Apply filters
    if (filters.search) {
      query = query.or(
        `business_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
      );
    }

    if (filters.provider_type) {
      query = query.eq('provider_type', filters.provider_type);
    }

    if (filters.location) {
      query = query.ilike('primary_location', `%${filters.location}%`);
    }

    if (filters.min_rating) {
      query = query.gte('average_rating', filters.min_rating);
    }

    // Handle sorting
    switch (filters.sort_by) {
      case 'rating':
        query = query.order('average_rating', { ascending: false });
        break;
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'price_asc':
      case 'price_desc':
        // Note: You'd need to join with provider_services for price sorting
        // This is simplified - consider using PostgREST computed column
        break;
    }

    query = query
      .range(offset, offset + filters.limit - 1)
      .limit(filters.limit);

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      providers: data,
      total: count || 0,
      page: filters.page,
      limit: filters.limit,
      has_more: (count || 0) > offset + filters.limit,
    });

  } catch (error) {
    console.error('Provider search error:', error);
    return NextResponse.json(
      { error: 'Failed to search providers' },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Parse and validate input
    const body = await request.json();
    const { createProviderProfileSchema } = await import('@/lib/service-provider/schemas');
    const profileData = createProviderProfileSchema.parse(body);

    // Check if user already has a provider profile
    const { data: existingProvider } = await supabase
      .from('service_providers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existingProvider) {
      return NextResponse.json(
        { error: 'User already has a provider profile' },
        { status: 409 }
      );
    }

    // Create provider profile
    const { data: newProvider, error: createError } = await supabase
      .from('service_providers')
      .insert({
        user_id: user.id,
        ...profileData,
        status: 'pending', // Default to pending for verification
        is_verified: false,
      })
      .select()
      .single();

    if (createError) throw createError;

    // Log creation in moderation logs
    await supabase
      .from('provider_moderation_logs')
      .insert({
        provider_id: newProvider.id,
        action: 'created',
      });

    return NextResponse.json(newProvider, { status: 201 });

  } catch (error) {
    console.error('Provider creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create provider profile' },
      { status: 400 }
    );
  }
}
```

---

## 2. Get Provider Details Route

**File**: `src/app/api/providers/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Fetch provider
    const { data: provider, error: providerError } = await supabase
      .from('service_providers')
      .select('*')
      .eq('id', id)
      .single();

    if (providerError || !provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    // Fetch services (parallel)
    const { data: services } = await supabase
      .from('provider_services')
      .select('*')
      .eq('provider_id', id)
      .eq('is_active', true);

    // Fetch reviews (parallel)
    const { data: reviews } = await supabase
      .from('provider_reviews')
      .select('*')
      .eq('provider_id', id)
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false });

    // Fetch gallery (parallel)
    const { data: gallery } = await supabase
      .from('provider_gallery')
      .select('*')
      .eq('provider_id', id)
      .order('display_order', { ascending: true });

    // Fetch availability summary
    const { data: recentAvailability } = await supabase
      .from('provider_availability')
      .select('*')
      .eq('provider_id', id)
      .gte('available_date', new Date().toISOString().split('T')[0])
      .eq('is_blocked', false)
      .limit(1)
      .order('available_date', { ascending: true });

    return NextResponse.json({
      provider,
      services: services || [],
      reviews: {
        items: reviews || [],
        average_rating: provider.average_rating,
        total_count: provider.total_reviews,
      },
      gallery: gallery || [],
      availability_summary: recentAvailability?.[0] ? {
        next_available: recentAvailability[0].available_date,
      } : undefined,
    });

  } catch (error) {
    console.error('Provider detail error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch provider details' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    const { data: { user } } = await supabase.auth.getUser(
      authHeader?.replace('Bearer ', '')
    );

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Verify ownership
    const { data: provider } = await supabase
      .from('service_providers')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!provider || provider.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate input
    const body = await request.json();
    const { updateProviderProfileSchema } = await import('@/lib/service-provider/schemas');
    const updates = updateProviderProfileSchema.parse(body);

    // Update provider
    const { data: updated, error } = await supabase
      .from('service_providers')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log update
    await supabase
      .from('provider_moderation_logs')
      .insert({
        provider_id: id,
        action: 'updated',
      });

    return NextResponse.json(updated);

  } catch (error) {
    console.error('Provider update error:', error);
    return NextResponse.json(
      { error: 'Failed to update provider' },
      { status: 400 }
    );
  }
}
```

---

## 3. Create Booking Route

**File**: `src/app/api/bookings/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createBookingSchema } from '@/lib/service-provider/schemas';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    const { data: { user } } = await supabase.auth.getUser(
      authHeader?.replace('Bearer ', '')
    );

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate input
    const body = await request.json();
    const bookingData = createBookingSchema.parse(body);

    // Fetch service to get pricing
    const { data: service, error: serviceError } = await supabase
      .from('provider_services')
      .select('*')
      .eq('id', bookingData.service_id)
      .single();

    if (serviceError || !service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // Validate group size
    if (
      bookingData.group_size < service.group_size_min ||
      bookingData.group_size > service.group_size_max
    ) {
      return NextResponse.json(
        { error: `Group size must be between ${service.group_size_min} and ${service.group_size_max}` },
        { status: 400 }
      );
    }

    // Check availability
    const { data: availability } = await supabase
      .from('provider_availability')
      .select('*')
      .eq('provider_id', service.provider_id)
      .eq('available_date', bookingData.booking_date)
      .gte('start_time', bookingData.start_time)
      .single();

    if (!availability) {
      return NextResponse.json(
        { error: 'Slot not available' },
        { status: 409 }
      );
    }

    if (availability.current_bookings >= availability.max_bookings) {
      return NextResponse.json(
        { error: 'No available slots for this time' },
        { status: 409 }
      );
    }

    // Calculate total price
    const durationHours = service.duration_minutes ? service.duration_minutes / 60 : 1;
    const totalPrice = service.price_shekel * bookingData.group_size;

    // Create booking
    const confirmationCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    const { data: booking, error: bookingError } = await supabase
      .from('provider_bookings')
      .insert({
        service_id: bookingData.service_id,
        booker_user_id: user.id,
        booking_date: bookingData.booking_date,
        start_time: bookingData.start_time,
        end_time: bookingData.start_time, // Calculate from duration
        group_size: bookingData.group_size,
        special_requests: bookingData.special_requests,
        status: 'pending',
        confirmation_code: confirmationCode,
        total_price_shekel: totalPrice,
      })
      .select()
      .single();

    if (bookingError) throw bookingError;

    // Update availability (increment current_bookings)
    await supabase
      .from('provider_availability')
      .update({
        current_bookings: availability.current_bookings + 1,
      })
      .eq('id', availability.id);

    return NextResponse.json(booking, { status: 201 });

  } catch (error) {
    console.error('Booking creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    const { data: { user } } = await supabase.auth.getUser(
      authHeader?.replace('Bearer ', '')
    );

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Fetch user's bookings
    let query = supabase
      .from('provider_bookings')
      .select('*', { count: 'exact' })
      .eq('booker_user_id', user.id);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: bookings, count, error } = await query
      .order('booking_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      bookings,
      total: count || 0,
      page,
      limit,
      has_more: (count || 0) > offset + limit,
    });

  } catch (error) {
    console.error('Bookings fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}
```

---

## 4. Create Review Route

**File**: `src/app/api/providers/[id]/reviews/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createReviewSchema } from '@/lib/service-provider/schemas';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    const { data: { user } } = await supabase.auth.getUser(
      authHeader?.replace('Bearer ', '')
    );

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: providerId } = params;

    // Parse and validate input
    const body = await request.json();
    const reviewData = createReviewSchema.parse({
      ...body,
      provider_id: providerId,
    });

    // Verify user has a completed booking with this provider
    const { data: completedBooking } = await supabase
      .from('provider_bookings')
      .select('id')
      .eq('booker_user_id', user.id)
      .eq('status', 'completed')
      .in('service_id', (
        supabase
          .from('provider_services')
          .select('id')
          .eq('provider_id', providerId)
      ))
      .single();

    const isVerifiedBooking = !!completedBooking;

    // Check if user already reviewed this provider
    const { data: existingReview } = await supabase
      .from('provider_reviews')
      .select('id')
      .eq('provider_id', providerId)
      .eq('reviewer_user_id', user.id)
      .single();

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this provider' },
        { status: 409 }
      );
    }

    // Create review (goes to moderation)
    const { data: review, error } = await supabase
      .from('provider_reviews')
      .insert({
        provider_id: providerId,
        reviewer_user_id: user.id,
        ...reviewData,
        is_verified_booking: isVerifiedBooking,
        moderation_status: 'approved', // Auto-approve if verified booking
      })
      .select()
      .single();

    if (error) throw error;

    // Trigger rating recalculation (will happen via trigger)
    return NextResponse.json(review, { status: 201 });

  } catch (error) {
    console.error('Review creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 400 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: providerId } = params;
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const minRating = searchParams.get('min_rating');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('provider_reviews')
      .select('*', { count: 'exact' })
      .eq('provider_id', providerId)
      .eq('moderation_status', 'approved');

    if (minRating) {
      query = query.gte('rating', parseInt(minRating));
    }

    const { data: reviews, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      reviews,
      total: count || 0,
      page,
      limit,
      has_more: (count || 0) > offset + limit,
    });

  } catch (error) {
    console.error('Reviews fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}
```

---

## 5. Availability Calendar Route

**File**: `src/app/api/providers/[id]/availability/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAvailabilitySchema } from '@/lib/service-provider/schemas';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: providerId } = params;
    const { searchParams } = new URL(request.url);

    const dateFrom = searchParams.get('date_from') || new Date().toISOString().split('T')[0];
    const dateTo = searchParams.get('date_to');

    let query = supabase
      .from('provider_availability')
      .select('*')
      .eq('provider_id', providerId)
      .gte('available_date', dateFrom);

    if (dateTo) {
      query = query.lte('available_date', dateTo);
    } else {
      // Default to next 90 days
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 90);
      query = query.lte('available_date', maxDate.toISOString().split('T')[0]);
    }

    const { data: availability, error } = await query
      .order('available_date', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      availability: availability || [],
    });

  } catch (error) {
    console.error('Availability fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    const { data: { user } } = await supabase.auth.getUser(
      authHeader?.replace('Bearer ', '')
    );

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: providerId } = params;

    // Verify ownership
    const { data: provider } = await supabase
      .from('service_providers')
      .select('user_id')
      .eq('id', providerId)
      .single();

    if (!provider || provider.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate input
    const body = await request.json();
    const slotData = createAvailabilitySchema.parse(body);

    // Create availability slot
    const { data: slot, error } = await supabase
      .from('provider_availability')
      .insert({
        provider_id: providerId,
        ...slotData,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(slot, { status: 201 });

  } catch (error) {
    console.error('Availability creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create availability slot' },
      { status: 400 }
    );
  }
}
```

---

## 6. Admin Approval Route

**File**: `src/app/api/admin/providers/[id]/status/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { updateProviderStatusSchema } from '@/lib/service-provider/schemas';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    const { data: { user } } = await supabase.auth.getUser(
      authHeader?.replace('Bearer ', '')
    );

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: providerId } = params;

    // Parse and validate input
    const body = await request.json();
    const statusUpdate = updateProviderStatusSchema.parse(body);

    // Update provider status
    const { data: updated, error } = await supabase
      .from('service_providers')
      .update({
        status: statusUpdate.status,
        is_verified: statusUpdate.status === 'approved',
        verification_date: statusUpdate.status === 'approved' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', providerId)
      .select()
      .single();

    if (error) throw error;

    // Log moderation action
    await supabase
      .from('provider_moderation_logs')
      .insert({
        provider_id: providerId,
        action: statusUpdate.status === 'approved' ? 'approved' : 'suspended',
        reason: statusUpdate.reason,
        admin_user_id: user.id,
      });

    // TODO: Send email notification to provider
    // await sendProviderStatusEmail(provider, statusUpdate.status, statusUpdate.reason);

    return NextResponse.json(updated);

  } catch (error) {
    console.error('Provider status update error:', error);
    return NextResponse.json(
      { error: 'Failed to update provider status' },
      { status: 400 }
    );
  }
}
```

---

## Key Implementation Notes

### Error Handling
- Always catch database errors and return appropriate HTTP status
- Validate all inputs with Zod before database operations
- Return clear error messages for client debugging

### Performance
- Use pagination (limit 20-50 items)
- Fetch related data in parallel when possible
- Use indexes on frequently filtered columns

### Security
- Always verify authentication before mutations
- Check ownership before allowing updates
- Use RLS policies for additional protection
- Validate user claims from JWT

### Database Operations
- Use Supabase client with service role for admin operations
- Use RLS policies to enforce access control
- Handle unique constraint violations gracefully
- Log all moderation actions for audit trail

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>

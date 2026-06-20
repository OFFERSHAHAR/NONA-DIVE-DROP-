# Booking System - API Implementation Guide

This guide details the implementation of all booking system API endpoints for the DIVE DROP marketplace.

## File Structure

```
src/app/api/
├── bookings/
│   ├── route.ts                      # POST /api/bookings, GET /api/bookings
│   ├── [id]/
│   │   ├── route.ts                  # GET /api/bookings/:id
│   │   ├── status/route.ts           # PUT /api/bookings/:id/status
│   │   ├── cancel/route.ts           # POST /api/bookings/:id/cancel
│   │   ├── messages/route.ts         # GET/POST /api/bookings/:id/messages
│   │   ├── messages/[msgId]/route.ts # PUT /api/bookings/:id/messages/:msgId/read
│   │   ├── payment/route.ts          # GET/POST /api/bookings/:id/payment
│   │   ├── review/route.ts           # GET/POST /api/bookings/:id/review
│   │   └── details/route.ts          # GET /api/bookings/:id/details (full with relations)
│   └── stats/route.ts                # GET /api/bookings/stats (user's booking stats)
│
├── providers/
│   ├── route.ts                      # GET /api/providers (search)
│   ├── [id]/
│   │   ├── route.ts                  # GET /api/providers/:id
│   │   ├── bookings/route.ts         # GET /api/providers/:id/bookings
│   │   ├── services/route.ts         # GET/POST /api/providers/:id/services
│   │   ├── availability/route.ts     # GET /api/providers/:id/availability
│   │   └── reviews/route.ts          # GET /api/providers/:id/reviews
│   ├── availability/route.ts         # POST /api/providers/availability
│   ├── availability/block/route.ts   # POST /api/providers/availability/block
│   └── dashboard/route.ts            # GET /api/providers/dashboard (own dashboard)
│
├── reviews/
│   └── [id]/
│       └── response/route.ts         # POST /api/reviews/:id/response
│
└── payments/
    ├── route.ts                      # POST /api/payments (process payment)
    └── [id]/status/route.ts          # GET /api/payments/:id/status
```

## 1. Booking API Endpoints

### `POST /api/bookings` - Create Booking

```typescript
// src/app/api/bookings/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { CreateBookingRequest } from '@/types/booking';
import { z } from 'zod';

const CreateBookingSchema = z.object({
  diver_1_id: z.string().uuid(),
  diver_2_id: z.string().uuid(),
  provider_id: z.string().uuid(),
  dive_site_id: z.string().uuid(),
  booking_date: z.string().date(),
  booking_time: z.string().time(),
  duration_minutes: z.number().int().min(30).max(480),
  max_depth: z.number().optional(),
  difficulty_level: z.enum(['beginner', 'intermediate', 'advanced', 'instructor']),
  service_type: z.enum(['recreational', 'technical', 'rescue', 'photography']),
  guide_type: z.enum(['group', 'private']).default('group'),
  equipment_provided: z.boolean().default(true),
  special_requests: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = CreateBookingSchema.parse(body);

    // Verify user is one of the divers
    if (user.id !== validatedData.diver_1_id && user.id !== validatedData.diver_2_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate both divers exist and have matching connection
    const { data: divers, error: diverError } = await supabase
      .from('users')
      .select('id, diving_experience')
      .in('id', [validatedData.diver_1_id, validatedData.diver_2_id]);

    if (diverError || !divers || divers.length !== 2) {
      return NextResponse.json({ error: 'Invalid divers' }, { status: 400 });
    }

    // Verify provider exists and has availability
    const { data: provider, error: providerError } = await supabase
      .from('service_providers')
      .select('id, commission_percentage, is_active')
      .eq('id', validatedData.provider_id)
      .single();

    if (providerError || !provider || !provider.is_active) {
      return NextResponse.json({ error: 'Provider not found or inactive' }, { status: 404 });
    }

    // Check availability
    const { data: availability } = await supabase
      .from('provider_availability')
      .select('available_slots')
      .eq('provider_id', validatedData.provider_id)
      .eq('availability_date', validatedData.booking_date)
      .single();

    if (!availability?.available_slots?.some((slot: any) =>
      slot.start === validatedData.booking_time
    )) {
      return NextResponse.json({ error: 'Time slot not available' }, { status: 409 });
    }

    // Get service price
    const { data: service } = await supabase
      .from('services')
      .select('base_price')
      .eq('provider_id', validatedData.provider_id)
      .eq('service_category', 'guide') // default guide service
      .limit(1)
      .single();

    const service_price = service?.base_price || 100;
    const commission_amount = service_price * 2 * (provider.commission_percentage / 100);
    const total_price = (service_price * 2) + commission_amount;

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        diver_1_id: validatedData.diver_1_id,
        diver_2_id: validatedData.diver_2_id,
        provider_id: validatedData.provider_id,
        dive_site_id: validatedData.dive_site_id,
        booking_date: validatedData.booking_date,
        booking_time: validatedData.booking_time,
        duration_minutes: validatedData.duration_minutes,
        max_depth: validatedData.max_depth,
        difficulty_level: validatedData.difficulty_level,
        service_type: validatedData.service_type,
        equipment_provided: validatedData.equipment_provided,
        guide_type: validatedData.guide_type,
        special_requests: validatedData.special_requests,
        service_price,
        commission_amount,
        total_price,
        commission_percentage: provider.commission_percentage,
        status: 'pending',
      })
      .select()
      .single();

    if (bookingError) {
      return NextResponse.json({ error: bookingError.message }, { status: 400 });
    }

    // Record status history
    await supabase
      .from('booking_status_history')
      .insert({
        booking_id: booking.id,
        old_status: null,
        new_status: 'pending',
        changed_by_user_id: user.id,
        changed_by_type: 'diver',
        reason: 'Booking created',
      });

    // TODO: Send notification to provider

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: error instanceof z.ZodError ? error.errors : 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/bookings - List user's bookings
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get('role'); // 'diver' | 'provider'
    const status = searchParams.get('status'); // comma-separated
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase.from('bookings').select('*', { count: 'exact' });

    if (role === 'diver') {
      query = query.or(`diver_1_id.eq.${user.id},diver_2_id.eq.${user.id}`);
    } else if (role === 'provider') {
      // Get provider id from service_providers
      const { data: provider } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!provider) {
        return NextResponse.json({ error: 'Not a provider' }, { status: 403 });
      }

      query = query.eq('provider_id', provider.id);
    } else {
      return NextResponse.json({ error: 'Invalid role parameter' }, { status: 400 });
    }

    if (status) {
      const statuses = status.split(',');
      query = query.in('status', statuses);
    }

    const { data: bookings, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      data: bookings,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### `GET /api/bookings/:id` - Get Booking Details

```typescript
// src/app/api/bookings/[id]/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', params.id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check authorization
    const isParticipant =
      user.id === booking.diver_1_id ||
      user.id === booking.diver_2_id ||
      (await userIsProvider(supabase, user.id, booking.provider_id));

    if (!isParticipant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch related data
    const [diver1, diver2, provider, site, items, messages, payments, reviews] =
      await Promise.all([
        supabase.from('users').select('*').eq('id', booking.diver_1_id).single(),
        supabase.from('users').select('*').eq('id', booking.diver_2_id).single(),
        supabase.from('service_providers').select('*').eq('id', booking.provider_id).single(),
        supabase.from('dive_sites').select('*').eq('id', booking.dive_site_id).single(),
        supabase.from('booking_items').select('*').eq('booking_id', params.id),
        supabase.from('booking_messages').select('*').eq('booking_id', params.id),
        supabase.from('booking_payments').select('*').eq('booking_id', params.id),
        supabase.from('provider_reviews').select('*').eq('booking_id', params.id),
      ]);

    return NextResponse.json({
      ...booking,
      diver_1: diver1.data,
      diver_2: diver2.data,
      provider: provider.data,
      dive_site: site.data,
      items: items.data,
      messages: messages.data,
      payments: payments.data,
      reviews: reviews.data,
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function
async function userIsProvider(supabase: any, userId: string, providerId: string) {
  const { data } = await supabase
    .from('service_providers')
    .select('id')
    .eq('id', providerId)
    .eq('user_id', userId)
    .single();
  return !!data;
}
```

### `PUT /api/bookings/:id/status` - Update Booking Status

```typescript
// src/app/api/bookings/[id]/status/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { BookingStatus } from '@/types/booking';

const UpdateStatusSchema = z.object({
  status: z.enum([
    'confirmed', 'cancelled', 'declined', 'in_progress', 'completed', 'reviewed'
  ]),
  reason: z.string().optional(),
  provider_response: z.enum(['confirmed', 'declined']).optional(),
  decline_reason: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = UpdateStatusSchema.parse(body);

    // Fetch booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', params.id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check authorization and role
    const isProvider = await userIsProvider(supabase, user.id, booking.provider_id);
    const isDiver = user.id === booking.diver_1_id || user.id === booking.diver_2_id;

    if (!isProvider && !isDiver) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate state transition
    const validTransitions: Record<BookingStatus, BookingStatus[]> = {
      pending: ['confirmed', 'declined'],
      confirmed: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'no_show'],
      completed: ['reviewed'],
      cancelled: [],
      declined: [],
      no_show: [],
      reviewed: [],
    };

    if (!validTransitions[booking.status as BookingStatus]?.includes(validatedData.status as BookingStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${booking.status} to ${validatedData.status}` },
        { status: 409 }
      );
    }

    // Determine user type
    let changedByType = isDiver ? 'diver' : 'provider';
    let updateData: any = {
      status: validatedData.status,
      updated_at: new Date(),
    };

    if (validatedData.status === 'confirmed' && isProvider) {
      updateData.provider_response = 'confirmed';
      updateData.provider_response_at = new Date();
      updateData.confirmed_at = new Date();
    } else if (validatedData.status === 'declined' && isProvider) {
      updateData.provider_response = 'declined';
      updateData.provider_response_at = new Date();
      updateData.decline_reason = validatedData.decline_reason;
    } else if (validatedData.status === 'cancelled') {
      updateData.cancelled_at = new Date();
      updateData.cancellation_reason = validatedData.reason;
    } else if (validatedData.status === 'completed') {
      updateData.completed_at = new Date();
    }

    // Update booking
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Record status history
    await supabase
      .from('booking_status_history')
      .insert({
        booking_id: params.id,
        old_status: booking.status,
        new_status: validatedData.status,
        changed_by_user_id: user.id,
        changed_by_type: changedByType,
        reason: validatedData.reason,
      });

    // TODO: Send notifications

    return NextResponse.json(updatedBooking);
  } catch (error) {
    console.error('Error updating booking status:', error);
    return NextResponse.json(
      { error: error instanceof z.ZodError ? error.errors : 'Internal server error' },
      { status: 500 }
    );
  }
}

async function userIsProvider(supabase: any, userId: string, providerId: string) {
  const { data } = await supabase
    .from('service_providers')
    .select('id')
    .eq('id', providerId)
    .eq('user_id', userId)
    .single();
  return !!data;
}
```

### `POST /api/bookings/:id/cancel` - Cancel Booking

```typescript
// src/app/api/bookings/[id]/cancel/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const CancelBookingSchema = z.object({
  cancellation_reason: z.string().min(5),
  cancelled_by: z.enum(['diver', 'provider']),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = CancelBookingSchema.parse(body);

    // Fetch booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', params.id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if cancellable
    const cancellableStatuses = ['pending', 'confirmed'];
    if (!cancellableStatuses.includes(booking.status)) {
      return NextResponse.json(
        { error: 'Cannot cancel booking in current state' },
        { status: 409 }
      );
    }

    // Calculate refund based on timeline
    const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}`);
    const now = new Date();
    const hoursUntilDive = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    let refundPercentage = 0;
    if (hoursUntilDive > 168) refundPercentage = 100; // >7 days: full refund
    else if (hoursUntilDive > 72) refundPercentage = 75; // 3-7 days
    else if (hoursUntilDive > 24) refundPercentage = 50; // 24-72 hours
    // else < 24 hours: no refund

    const refundAmount = (booking.total_price * refundPercentage) / 100;

    // Update booking
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date(),
        cancellation_reason: validatedData.cancellation_reason,
        updated_at: new Date(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // TODO: Process refund through payment provider
    // TODO: Update provider earnings
    // TODO: Send notifications

    return NextResponse.json({
      ...updatedBooking,
      refund_status: 'processing',
      refund_amount: refundAmount,
      refund_percentage: refundPercentage,
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json(
      { error: error instanceof z.ZodError ? error.errors : 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## 2. Provider Search API

### `GET /api/providers/search` - Search Available Providers

```typescript
// src/app/api/providers/search/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const SearchProvidersSchema = z.object({
  dive_site_id: z.string().uuid(),
  booking_date: z.string().date(),
  booking_time: z.string().time(),
  difficulty_level: z.enum(['beginner', 'intermediate', 'advanced', 'instructor']).optional(),
  group_size: z.number().int().min(1).default(2),
  radius_km: z.number().int().min(1).default(50),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(20),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const searchParams = request.nextUrl.searchParams;
    const validatedData = SearchProvidersSchema.parse({
      dive_site_id: searchParams.get('dive_site_id'),
      booking_date: searchParams.get('booking_date'),
      booking_time: searchParams.get('booking_time'),
      difficulty_level: searchParams.get('difficulty_level') || undefined,
      group_size: parseInt(searchParams.get('group_size') || '2'),
      radius_km: parseInt(searchParams.get('radius_km') || '50'),
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    });

    // Get dive site location
    const { data: diveSite, error: siteError } = await supabase
      .from('dive_sites')
      .select('latitude, longitude')
      .eq('id', validatedData.dive_site_id)
      .single();

    if (siteError || !diveSite) {
      return NextResponse.json({ error: 'Dive site not found' }, { status: 404 });
    }

    // Search for providers with availability
    const offset = (validatedData.page - 1) * validatedData.limit;

    let query = supabase
      .from('service_providers')
      .select(
        `
        *,
        services(*),
        provider_reviews(rating)
        `,
        { count: 'exact' }
      )
      .eq('is_active', true)
      .eq('verified', true);

    const { data: providers, error: providersError, count } = await query
      .range(offset, offset + validatedData.limit - 1)
      .order('rating_average', { ascending: false });

    if (providersError) {
      throw providersError;
    }

    // Check availability for each provider
    const results = await Promise.all(
      (providers || []).map(async (provider) => {
        const { data: availability } = await supabase
          .from('provider_availability')
          .select('available_slots')
          .eq('provider_id', provider.id)
          .eq('availability_date', validatedData.booking_date)
          .single();

        const availableSlots = availability?.available_slots || [];

        return {
          provider,
          availability_status: availableSlots.length > 0 ? 'available' : 'unavailable',
          available_slots: availableSlots,
          services: provider.services,
          reviews: provider.provider_reviews,
          rating_summary: {
            avg: provider.rating_average,
            count: provider.review_count,
          },
        };
      })
    );

    // Filter to available providers
    const availableResults = results.filter(r => r.availability_status === 'available');

    return NextResponse.json({
      data: availableResults,
      total: availableResults.length,
      page: validatedData.page,
      limit: validatedData.limit,
    });
  } catch (error) {
    console.error('Error searching providers:', error);
    return NextResponse.json(
      { error: error instanceof z.ZodError ? error.errors : 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## 3. Messaging API

### `GET/POST /api/bookings/:id/messages`

```typescript
// src/app/api/bookings/[id]/messages/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const SendMessageSchema = z.object({
  content: z.string().min(1).max(1000),
  message_type: z.enum(['text', 'system', 'attachment']).default('text'),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Verify user is participant
    const { data: booking } = await supabase
      .from('bookings')
      .select('id')
      .eq('id', params.id)
      .single();

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Fetch messages
    const { data: messages, error, count } = await supabase
      .from('booking_messages')
      .select('*', { count: 'exact' })
      .eq('booking_id', params.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      data: messages,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = SendMessageSchema.parse(body);

    // Verify booking exists
    const { data: booking } = await supabase
      .from('bookings')
      .select('id')
      .eq('id', params.id)
      .single();

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Determine sender type
    const { data: provider } = await supabase
      .from('service_providers')
      .select('id')
      .eq('id', booking.provider_id)
      .single();

    const isProvider = provider?.id && user.id === provider.user_id;

    // Insert message
    const { data: message, error: messageError } = await supabase
      .from('booking_messages')
      .insert({
        booking_id: params.id,
        sender_id: user.id,
        sender_type: isProvider ? 'provider' : 'diver',
        message_type: validatedData.message_type,
        content: validatedData.content,
      })
      .select()
      .single();

    if (messageError) {
      throw messageError;
    }

    // TODO: Send real-time notification

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: error instanceof z.ZodError ? error.errors : 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## 4. Review API

### `POST /api/bookings/:id/review` - Post Review

```typescript
// src/app/api/bookings/[id]/review/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const CreateReviewSchema = z.object({
  reviewer_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  professionalism_rating: z.number().int().min(1).max(5).optional(),
  safety_rating: z.number().int().min(1).max(5).optional(),
  instruction_quality_rating: z.number().int().min(1).max(5).optional(),
  equipment_condition_rating: z.number().int().min(1).max(5).optional(),
  title: z.string().max(255).optional(),
  comment: z.string().min(10).max(1000).optional(),
  experience_tags: z.array(z.string()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = CreateReviewSchema.parse(body);

    // Verify booking exists and is completed
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', params.id)
      .single();

    if (bookingError || !booking || booking.status !== 'completed') {
      return NextResponse.json(
        { error: 'Booking not found or not yet completed' },
        { status: 404 }
      );
    }

    // Verify reviewer is a diver
    if (user.id !== booking.diver_1_id && user.id !== booking.diver_2_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if already reviewed
    const { data: existing } = await supabase
      .from('provider_reviews')
      .select('id')
      .eq('booking_id', params.id)
      .eq('reviewer_id', user.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Already reviewed' }, { status: 409 });
    }

    // Create review
    const { data: review, error: reviewError } = await supabase
      .from('provider_reviews')
      .insert({
        booking_id: params.id,
        provider_id: booking.provider_id,
        reviewer_id: user.id,
        rating: validatedData.rating,
        professionalism_rating: validatedData.professionalism_rating,
        safety_rating: validatedData.safety_rating,
        instruction_quality_rating: validatedData.instruction_quality_rating,
        equipment_condition_rating: validatedData.equipment_condition_rating,
        title: validatedData.title,
        comment: validatedData.comment,
        experience_tags: validatedData.experience_tags,
      })
      .select()
      .single();

    if (reviewError) {
      throw reviewError;
    }

    // Update booking review status
    const isDiver1 = user.id === booking.diver_1_id;
    await supabase
      .from('bookings')
      .update({
        [isDiver1 ? 'diver_1_reviewed' : 'diver_2_reviewed']: true,
      })
      .eq('id', params.id);

    // TODO: Send notification to provider

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: error instanceof z.ZodError ? error.errors : 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## 5. Provider API

### `POST /api/providers/availability` - Set Availability

```typescript
// src/app/api/providers/availability/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const SetAvailabilitySchema = z.object({
  date: z.string().date(),
  slots: z.array(z.object({
    start: z.string().time(),
    end: z.string().time(),
    capacity: z.number().int().min(1),
  })),
  is_blocked: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = SetAvailabilitySchema.parse(body);

    // Get provider
    const { data: provider, error: providerError } = await supabase
      .from('service_providers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (providerError || !provider) {
      return NextResponse.json({ error: 'Not a provider' }, { status: 403 });
    }

    // Upsert availability
    const { data: availability, error: availabilityError } = await supabase
      .from('provider_availability')
      .upsert(
        {
          provider_id: provider.id,
          availability_date: validatedData.date,
          available_slots: validatedData.slots,
          is_blocked: validatedData.is_blocked || false,
        },
        { onConflict: 'provider_id,availability_date' }
      )
      .select()
      .single();

    if (availabilityError) {
      throw availabilityError;
    }

    return NextResponse.json(availability);
  } catch (error) {
    console.error('Error setting availability:', error);
    return NextResponse.json(
      { error: error instanceof z.ZodError ? error.errors : 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Implementation Checklist

- [ ] Implement all POST /api/bookings endpoints
- [ ] Implement all GET /api/bookings/:id endpoints
- [ ] Implement booking status update logic
- [ ] Implement cancellation and refund logic
- [ ] Implement provider search with availability
- [ ] Implement messaging system
- [ ] Implement review system
- [ ] Add request validation with Zod
- [ ] Add authorization checks
- [ ] Add error handling
- [ ] Add logging
- [ ] Add rate limiting
- [ ] Add input sanitization
- [ ] Add CORS headers where needed
- [ ] Write integration tests
- [ ] Write E2E tests
- [ ] Document all endpoints

## Next Steps

1. Create base API utilities for error handling and auth
2. Implement notification service integration
3. Add Stripe payment integration
4. Set up real-time messaging with WebSockets
5. Create provider onboarding API
6. Add analytics tracking

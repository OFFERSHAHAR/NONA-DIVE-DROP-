import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buddyInterestSchema } from '@/lib/validations/buddy';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// GET: Fetch user's buddy interests
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('buddy_interests')
      .select(
        `
        *,
        listing:buddy_listings(
          id,
          title,
          location,
          start_date,
          end_date,
          user:users(id, email, user_metadata)
        )
        `
      )
      .eq('interested_user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a buddy interest
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = buddyInterestSchema.parse(body);

    // Check if listing exists
    const { data: listing } = await supabase
      .from('buddy_listings')
      .select('id')
      .eq('id', validatedData.listing_id)
      .single();

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Check if already interested
    const { data: existingInterest } = await supabase
      .from('buddy_interests')
      .select('id')
      .eq('listing_id', validatedData.listing_id)
      .eq('interested_user_id', user.id)
      .single();

    if (existingInterest) {
      return NextResponse.json({ error: 'Already interested in this listing' }, { status: 409 });
    }

    const { data, error } = await supabase.from('buddy_interests').insert({
      listing_id: validatedData.listing_id,
      interested_user_id: user.id,
      message: validatedData.message,
    });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

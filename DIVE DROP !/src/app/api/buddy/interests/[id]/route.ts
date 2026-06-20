import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// DELETE: Delete a buddy interest
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check ownership
    const { data: interest } = await supabase.from('buddy_interests').select('interested_user_id').eq('id', id).single();

    if (!interest || interest.interested_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase.from('buddy_interests').delete().eq('id', id);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Reveal contact for an interest
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the interest
    const { data: interest } = await supabase
      .from('buddy_interests')
      .select('listing_id, interested_user_id')
      .eq('id', id)
      .single();

    if (!interest) {
      return NextResponse.json({ error: 'Interest not found' }, { status: 404 });
    }

    // Check if user is the listing owner
    const { data: listing } = await supabase
      .from('buddy_listings')
      .select('user_id, contact_email, contact_phone, contact_hidden')
      .eq('id', interest.listing_id)
      .single();

    if (!listing || listing.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // If contact info should be revealed
    if (listing.contact_hidden) {
      // Update interest to mark contact as requested
      const { error } = await supabase
        .from('buddy_interests')
        .update({
          contact_request_sent: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Supabase error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      contact_email: listing.contact_email,
      contact_phone: listing.contact_phone,
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

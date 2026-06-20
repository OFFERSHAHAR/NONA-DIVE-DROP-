import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST /api/free-diving-sessions/[id]/book - Book a session
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;

    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { paymentMethod } = body;

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('free_diving_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check availability
    const { data: existingBooking } = await supabase
      .from('free_diving_session_bookings')
      .select('id')
      .eq('session_id', id)
      .eq('user_id', user.id)
      .single();

    if (existingBooking) {
      return NextResponse.json(
        { error: 'You are already booked for this session' },
        { status: 400 }
      );
    }

    // Check capacity
    const { data: bookings } = await supabase
      .from('free_diving_session_bookings')
      .select('id', { count: 'exact' })
      .eq('session_id', id)
      .eq('status', 'confirmed');

    const currentParticipants = bookings?.length || 0;
    if (currentParticipants >= session.capacity) {
      return NextResponse.json(
        { error: 'Session is full' },
        { status: 400 }
      );
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('free_diving_session_bookings')
      .insert([{
        session_id: id,
        user_id: user.id,
        price_paid_shekel: session.price_shekel,
        payment_method: paymentMethod || 'bit',
        payment_status: 'pending',
        status: 'pending',
      }])
      .select()
      .single();

    if (bookingError) {
      return NextResponse.json(
        { error: bookingError.message },
        { status: 400 }
      );
    }

    // TODO: Process payment via Bit API
    // For now, mark as completed
    const { data: updatedBooking } = await supabase
      .from('free_diving_session_bookings')
      .update({
        payment_status: 'completed',
        status: 'confirmed',
        payment_transaction_id: `TXN-${Date.now()}`,
      })
      .eq('id', booking.id)
      .select()
      .single();

    // Add to roster
    await supabase
      .from('free_diving_session_roster')
      .insert([{
        session_id: id,
        user_id: user.id,
        booking_id: booking.id,
      }]);

    // Update participant count
    await supabase
      .from('free_diving_sessions')
      .update({
        current_participants: currentParticipants + 1,
      })
      .eq('id', id);

    return NextResponse.json(updatedBooking, { status: 201 });
  } catch (error) {
    console.error('Error booking session:', error);
    return NextResponse.json(
      { error: 'Failed to book session' },
      { status: 500 }
    );
  }
}

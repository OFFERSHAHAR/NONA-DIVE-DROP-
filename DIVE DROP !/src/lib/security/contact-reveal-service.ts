/**
 * Contact Reveal Service
 *
 * Manages the mutual contact info reveal workflow:
 * 1. User B (interested) requests to reveal their contact to User A (listing owner)
 * 2. User A (listing owner) receives notification
 * 3. When User A accepts, both users see each other's contact info
 *
 * Security: Contact info is only visible after BOTH users have revealed
 */

import { createClient } from '@/lib/supabase/server';
import {
  requireAuth,
  requireOwnership,
  auditContactReveal,
} from './auth-middleware';
import type { AuthContext } from './auth-middleware';

export interface ContactReveal {
  id: string;
  listingId: string;
  initiatorId: string;
  recipientId: string;
  initiatorContactRevealed: boolean;
  recipientContactRevealed: boolean;
  mutualRevealedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContactInfo {
  email: string;
  phone: string;
  profilePictureUrl: string;
}

/**
 * User B (interested in listing) reveals their contact to User A (listing owner)
 *
 * Flow:
 * 1. User B clicks "Reveal my contact"
 * 2. Message sent to User A: "User X wants to connect - [name, photo]"
 * 3. User A sees User B's info in the reveal request
 * 4. User A can accept (reveal own contact back) or reject
 */
export async function initiateContactReveal(
  context: AuthContext,
  listingId: string
): Promise<ContactReveal> {
  const user = requireAuth(context);

  const supabase = await createClient();

  try {
    // Get listing to find owner
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('owner_id')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      throw new Error('Listing not found');
    }

    const ownerId = listing.owner_id;

    // Check if user is not the owner
    if (user.id === ownerId) {
      throw new Error('Cannot reveal contact to yourself');
    }

    // Check if interest exists
    const { data: interest, error: interestError } = await supabase
      .from('interests')
      .select('id')
      .eq('listing_id', listingId)
      .eq('interested_user_id', user.id)
      .single();

    if (interestError || !interest) {
      throw new Error(
        'You must express interest in the listing first'
      );
    }

    // Check if reveal already exists
    const { data: existing } = await supabase
      .from('contact_reveals')
      .select('id')
      .eq('listing_id', listingId)
      .eq('initiator_id', user.id)
      .eq('recipient_id', ownerId)
      .single();

    if (existing) {
      throw new Error('You have already initiated contact reveal for this listing');
    }

    // Create or update contact reveal record
    const { data: reveal, error: revealError } = await supabase
      .from('contact_reveals')
      .upsert(
        {
          listing_id: listingId,
          initiator_id: user.id,
          recipient_id: ownerId,
          initiator_contact_revealed: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'listing_id,initiator_id,recipient_id',
        }
      )
      .select()
      .single();

    if (revealError || !reveal) {
      throw revealError || new Error('Failed to create contact reveal');
    }

    // Audit log
    await auditContactReveal(user.id, ownerId, listingId);

    // Send notification to listing owner
    await sendContactRevealNotification(
      ownerId,
      user.id,
      listingId,
      'contact_reveal_requested'
    );

    return {
      id: reveal.id,
      listingId: reveal.listing_id,
      initiatorId: reveal.initiator_id,
      recipientId: reveal.recipient_id,
      initiatorContactRevealed: reveal.initiator_contact_revealed,
      recipientContactRevealed: reveal.recipient_contact_revealed,
      mutualRevealedAt: reveal.mutual_revealed_at,
      createdAt: reveal.created_at,
      updatedAt: reveal.updated_at,
    };
  } catch (error) {
    console.error('Contact reveal initiation failed:', error);
    throw error;
  }
}

/**
 * User A (listing owner) accepts and reveals their contact back
 *
 * Only the recipient of the reveal request can accept it
 */
export async function acceptContactReveal(
  context: AuthContext,
  revealId: string
): Promise<ContactReveal> {
  const user = requireAuth(context);

  const supabase = await createClient();

  try {
    // Get the reveal record
    const { data: reveal, error: revealError } = await supabase
      .from('contact_reveals')
      .select('*')
      .eq('id', revealId)
      .single();

    if (revealError || !reveal) {
      throw new Error('Reveal request not found');
    }

    // Check if user is the recipient
    requireOwnership(user.id, reveal.recipient_id);

    // Update to mark recipient as revealed
    const { data: updated, error: updateError } = await supabase
      .from('contact_reveals')
      .update({
        recipient_contact_revealed: true,
        mutual_revealed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', revealId)
      .select()
      .single();

    if (updateError || !updated) {
      throw updateError || new Error('Failed to update reveal status');
    }

    // Audit log
    await auditContactReveal(user.id, reveal.initiator_id, reveal.listing_id);

    // Send notification to initiator
    await sendContactRevealNotification(
      reveal.initiator_id,
      user.id,
      reveal.listing_id,
      'contact_reveal_accepted'
    );

    return {
      id: updated.id,
      listingId: updated.listing_id,
      initiatorId: updated.initiator_id,
      recipientId: updated.recipient_id,
      initiatorContactRevealed: updated.initiator_contact_revealed,
      recipientContactRevealed: updated.recipient_contact_revealed,
      mutualRevealedAt: updated.mutual_revealed_at,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };
  } catch (error) {
    console.error('Contact reveal acceptance failed:', error);
    throw error;
  }
}

/**
 * Decline contact reveal
 *
 * Only the recipient can decline
 */
export async function declineContactReveal(
  context: AuthContext,
  revealId: string
): Promise<void> {
  const user = requireAuth(context);

  const supabase = await createClient();

  try {
    // Get the reveal record
    const { data: reveal, error: revealError } = await supabase
      .from('contact_reveals')
      .select('*')
      .eq('id', revealId)
      .single();

    if (revealError || !reveal) {
      throw new Error('Reveal request not found');
    }

    // Check if user is the recipient
    requireOwnership(user.id, reveal.recipient_id);

    // Delete the reveal
    const { error: deleteError } = await supabase
      .from('contact_reveals')
      .delete()
      .eq('id', revealId);

    if (deleteError) {
      throw deleteError;
    }

    // Send notification to initiator
    await sendContactRevealNotification(
      reveal.initiator_id,
      user.id,
      reveal.listing_id,
      'contact_reveal_declined'
    );
  } catch (error) {
    console.error('Contact reveal decline failed:', error);
    throw error;
  }
}

/**
 * Get contact info if reveal is mutual
 *
 * Returns contact details only if both users have revealed
 */
export async function getRevealedContactInfo(
  context: AuthContext,
  otherUserId: string,
  listingId: string
): Promise<ContactInfo | null> {
  const user = requireAuth(context);

  const supabase = await createClient();

  try {
    // Use the database function to get visible contact info
    const { data, error } = await supabase.rpc(
      'get_visible_contact_info',
      {
        p_user_id: otherUserId,
        p_viewer_id: user.id,
        p_listing_id: listingId,
      }
    );

    if (error) {
      console.error('Failed to get contact info:', error);
      return null;
    }

    if (!data || !data[0]) {
      return null;
    }

    return {
      email: data[0].email || '',
      phone: data[0].phone || '',
      profilePictureUrl: data[0].profile_picture_url || '',
    };
  } catch (error) {
    console.error('Get contact info failed:', error);
    return null;
  }
}

/**
 * Get all reveal requests for a user's listings
 *
 * Listing owner sees all pending reveals for their listings
 */
export async function getRevealRequestsForOwner(
  context: AuthContext
): Promise<ContactReveal[]> {
  const user = requireAuth(context);

  const supabase = await createClient();

  try {
    const { data: reveals, error } = await supabase
      .from('contact_reveals')
      .select('*')
      .eq('recipient_id', user.id)
      .eq('initiator_contact_revealed', true)
      .eq('recipient_contact_revealed', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (reveals || []).map((r) => ({
      id: r.id,
      listingId: r.listing_id,
      initiatorId: r.initiator_id,
      recipientId: r.recipient_id,
      initiatorContactRevealed: r.initiator_contact_revealed,
      recipientContactRevealed: r.recipient_contact_revealed,
      mutualRevealedAt: r.mutual_revealed_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  } catch (error) {
    console.error('Get reveal requests failed:', error);
    return [];
  }
}

/**
 * Send notification about contact reveal
 *
 * @param recipientId User to notify
 * @param senderUserId User taking the action
 * @param listingId Associated listing
 * @param notificationType Type of notification
 */
async function sendContactRevealNotification(
  recipientId: string,
  senderUserId: string,
  listingId: string,
  notificationType: 'contact_reveal_requested' | 'contact_reveal_accepted' | 'contact_reveal_declined'
): Promise<void> {
  const supabase = await createClient();

  try {
    // TODO: Implement notification system
    // For now, this is a placeholder
    // Could be:
    // - In-app notifications
    // - Push notifications
    // - Email notifications
    // - WebSocket messages

    const notificationMessages: Record<string, string> = {
      contact_reveal_requested: `משתמש רוצה ליצור קשר בנוגע להנפקה שלך`,
      contact_reveal_accepted: `המשתמש קיבל את בקשת ההשקעה שלך ופתח את פרטיו`,
      contact_reveal_declined: `המשתמש דחה את בקשת ההשקעה שלך`,
    };

    console.log(
      `[NOTIFICATION] ${recipientId}: ${notificationMessages[notificationType]}`
    );

    // Insert notification record (implement as needed)
    // await supabase.from('notifications').insert({
    //   recipient_id: recipientId,
    //   sender_id: senderUserId,
    //   type: notificationType,
    //   listing_id: listingId,
    //   read: false,
    // });
  } catch (error) {
    console.error('Notification send failed:', error);
    // Don't throw - notifications shouldn't break the app
  }
}

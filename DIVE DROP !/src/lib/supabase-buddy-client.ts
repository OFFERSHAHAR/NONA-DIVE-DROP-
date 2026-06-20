/**
 * Supabase Buddy Matching Client
 * Type-safe wrapper for buddy matching operations
 *
 * Usage:
 * import { BuddyClient } from '@/lib/supabase-buddy-client';
 * const client = new BuddyClient(supabaseClient);
 * const listings = await client.getBrowsableListings();
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  BuddyListing,
  CreateBuddyListingInput,
  UpdateBuddyListingInput,
  BuddyInterest,
  CreateBuddyInterestInput,
  BuddyConnection,
  BuddyMessage,
  SendBuddyMessageInput,
  BuddyProfile,
  ListingsFilterParams,
  AcceptInterestResult,
  DivingLevel,
  DiveType,
  ListingStatus,
  InterestStatus,
} from '@/types/buddy-matching';

export class BuddyClient {
  constructor(private supabase: SupabaseClient) {}

  // =========================================================================
  // BUDDY LISTINGS
  // =========================================================================

  /**
   * Get all active listings from other users (for browsing/discovery)
   * RLS Policy: "Authenticated users can see active listings from others"
   */
  async getBrowsableListings(filters?: ListingsFilterParams) {
    let query = this.supabase
      .from('buddy_listings')
      .select(
        `*,
        owner:user_id(
          id,
          email,
          raw_user_meta_data
        )`
      )
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString());

    if (filters?.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }

    if (filters?.diving_level) {
      query = query.eq('diving_level', filters.diving_level);
    }

    if (filters?.dive_types && filters.dive_types.length > 0) {
      // PostgreSQL array overlap
      query = query.overlaps('dive_type', filters.dive_types);
    }

    if (filters?.date_from) {
      query = query.lte('date_from', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.gte('date_to', filters.date_to);
    }

    if (filters?.languages && filters.languages.length > 0) {
      query = query.overlaps('languages', filters.languages);
    }

    if (filters?.sort_by) {
      const order = filters.sort_order === 'asc' ? { ascending: true } : { ascending: false };
      query = query.order(filters.sort_by, order);
    } else {
      query = query.order('created_at', { ascending: false });
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Filter out contact info from listings (not stored in listings anyway)
    return data as BuddyListing[];
  }

  /**
   * Get a single listing by ID
   * Includes owner profile (contact info hidden unless connected)
   */
  async getListing(listingId: string) {
    const { data, error } = await this.supabase
      .from('buddy_listings')
      .select('*')
      .eq('id', listingId)
      .single();

    if (error) throw error;

    return data as BuddyListing;
  }

  /**
   * Get current user's own listings
   * RLS Policy: "Users can see own listings"
   */
  async getOwnListings(includeExpired = false) {
    let query = this.supabase
      .from('buddy_listings')
      .select('*')
      .order('created_at', { ascending: false });

    if (!includeExpired) {
      query = query.neq('status', 'expired');
    }

    const { data, error } = await query;

    if (error) throw error;

    return data as BuddyListing[];
  }

  /**
   * Create a new buddy listing
   * RLS Policy: "Users can create own listings"
   */
  async createListing(input: CreateBuddyListingInput) {
    const { data: authUser } = await this.supabase.auth.getUser();
    if (!authUser.user) throw new Error('Not authenticated');

    const expiresAt = input.expires_at || input.date_to;

    const { data, error } = await this.supabase
      .from('buddy_listings')
      .insert({
        user_id: authUser.user.id,
        location: input.location,
        latitude: input.latitude,
        longitude: input.longitude,
        date_from: input.date_from,
        date_to: input.date_to,
        diving_level: input.diving_level,
        dive_type: input.dive_type,
        description: input.description,
        languages: input.languages || ['Hebrew', 'English'],
        group_size_min: input.group_size_min || 2,
        group_size_max: input.group_size_max || 4,
        expires_at: expiresAt,
        status: 'active' as ListingStatus,
      })
      .select()
      .single();

    if (error) throw error;

    return data as BuddyListing;
  }

  /**
   * Update a listing
   * RLS Policy: "Users can update own listings"
   */
  async updateListing(listingId: string, updates: UpdateBuddyListingInput) {
    const { data, error } = await this.supabase
      .from('buddy_listings')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', listingId)
      .select()
      .single();

    if (error) throw error;

    return data as BuddyListing;
  }

  /**
   * Archive a listing (soft delete)
   * RLS Policy: "Users can archive own listings"
   */
  async archiveListing(listingId: string) {
    return this.updateListing(listingId, { status: 'archived' as ListingStatus });
  }

  // =========================================================================
  // BUDDY INTERESTS
  // =========================================================================

  /**
   * Get interests on user's own listings
   * RLS Policy: "Listing owner can see interests on their listings"
   */
  async getInterestsOnOwnListings() {
    const { data, error } = await this.supabase
      .from('buddy_interests')
      .select(
        `*,
        listing:listing_id(*),
        interested_user:interested_user_id(
          id,
          email,
          raw_user_meta_data
        )`
      )
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data;
  }

  /**
   * Get interests user has expressed
   * RLS Policy: "Users can see their own interests"
   */
  async getOwnInterests() {
    const { data, error } = await this.supabase
      .from('buddy_interests')
      .select(
        `*,
        listing:listing_id(*)
      `
      )
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data;
  }

  /**
   * Check if user already expressed interest in a listing
   */
  async hasExpressedInterest(listingId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('buddy_interests')
      .select('id')
      .eq('listing_id', listingId)
      .maybeSingle();

    if (error) throw error;

    return !!data;
  }

  /**
   * Express interest in a listing
   * RLS Policy: "Users can create interests"
   */
  async expressInterest(input: CreateBuddyInterestInput) {
    const { data: authUser } = await this.supabase.auth.getUser();
    if (!authUser.user) throw new Error('Not authenticated');

    // Check if already interested
    const alreadyInterested = await this.hasExpressedInterest(input.listing_id);
    if (alreadyInterested) {
      throw new Error('Already expressed interest in this listing');
    }

    const { data, error } = await this.supabase
      .from('buddy_interests')
      .insert({
        listing_id: input.listing_id,
        interested_user_id: authUser.user.id,
        message: input.message,
        status: 'pending' as InterestStatus,
      })
      .select()
      .single();

    if (error) throw error;

    return data as BuddyInterest;
  }

  /**
   * Accept a buddy interest (listing owner only)
   * Triggers buddy_connection creation
   * RLS Policy: "Listing owner can update interest status"
   */
  async acceptInterest(interestId: string): Promise<AcceptInterestResult> {
    const { data, error } = await this.supabase
      .rpc('accept_buddy_interest', {
        p_interest_id: interestId,
      });

    if (error) throw error;

    return data as AcceptInterestResult;
  }

  /**
   * Reject a buddy interest (listing owner only)
   * RLS Policy: "Listing owner can update interest status"
   */
  async rejectInterest(interestId: string) {
    const { data, error } = await this.supabase
      .rpc('reject_buddy_interest', {
        p_interest_id: interestId,
      });

    if (error) throw error;

    return data;
  }

  /**
   * Cancel/withdraw own interest
   * RLS Policy: "Users can delete their own interests"
   */
  async withdrawInterest(interestId: string) {
    const { error } = await this.supabase
      .from('buddy_interests')
      .delete()
      .eq('id', interestId);

    if (error) throw error;
  }

  // =========================================================================
  // BUDDY CONNECTIONS
  // =========================================================================

  /**
   * Get user's buddy connections
   * RLS Policy: "Users can see their connections"
   */
  async getConnections() {
    const { data, error } = await this.supabase
      .from('buddy_connections')
      .select(
        `*,
        user_1:user_id_1(
          id,
          email,
          raw_user_meta_data
        ),
        user_2:user_id_2(
          id,
          email,
          raw_user_meta_data
        )`
      )
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data as BuddyConnection[];
  }

  /**
   * Get a single connection
   * RLS Policy: "Users can see their connections"
   */
  async getConnection(connectionId: string) {
    const { data, error } = await this.supabase
      .from('buddy_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (error) throw error;

    return data as BuddyConnection;
  }

  /**
   * Update connection details (meeting date, location, dive type)
   * RLS Policy: "Connection users can update"
   */
  async updateConnection(connectionId: string, updates: Partial<BuddyConnection>) {
    const { data, error } = await this.supabase
      .from('buddy_connections')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId)
      .select()
      .single();

    if (error) throw error;

    return data as BuddyConnection;
  }

  /**
   * End/delete a connection
   * RLS Policy: "Connection users can delete"
   */
  async deleteConnection(connectionId: string) {
    const { error } = await this.supabase
      .from('buddy_connections')
      .delete()
      .eq('id', connectionId);

    if (error) throw error;
  }

  // =========================================================================
  // BUDDY MESSAGES
  // =========================================================================

  /**
   * Send a message to a connected buddy
   * RLS Policy: "Users can send messages to connected buddies"
   */
  async sendMessage(input: SendBuddyMessageInput) {
    const { data: authUser } = await this.supabase.auth.getUser();
    if (!authUser.user) throw new Error('Not authenticated');

    const { data, error } = await this.supabase
      .from('buddy_messages')
      .insert({
        sender_id: authUser.user.id,
        receiver_id: input.receiver_id,
        connection_id: input.connection_id,
        message: input.message,
      })
      .select()
      .single();

    if (error) throw error;

    return data as BuddyMessage;
  }

  /**
   * Get conversation with a specific buddy
   * RLS Policy: "Users can see sent/received messages"
   */
  async getConversation(otherUserId: string, limit = 50) {
    const { data, error } = await this.supabase
      .from('buddy_messages')
      .select('*')
      .or(`and(sender_id.eq.${otherUserId}),and(receiver_id.eq.${otherUserId})`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data as BuddyMessage[]).reverse(); // Return in chronological order
  }

  /**
   * Get all unread messages
   * RLS Policy: "Users can see received messages"
   */
  async getUnreadMessages() {
    const { data, error } = await this.supabase
      .from('buddy_messages')
      .select('*')
      .is('read_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data as BuddyMessage[];
  }

  /**
   * Mark message as read
   * RLS Policy: "Receiver can mark message as read"
   */
  async markAsRead(messageId: string) {
    const { data, error } = await this.supabase
      .from('buddy_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw error;

    return data as BuddyMessage;
  }

  /**
   * Mark all messages from a user as read
   */
  async markConversationAsRead(otherUserId: string) {
    const { error } = await this.supabase
      .from('buddy_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('sender_id', otherUserId)
      .is('read_at', null);

    if (error) throw error;
  }

  // =========================================================================
  // USER PROFILES
  // =========================================================================

  /**
   * Get a buddy's profile (contact info only visible if connected)
   * Uses get_buddy_profile stored function for RLS-safe access
   */
  async getBuddyProfile(userId: string): Promise<BuddyProfile> {
    const { data, error } = await this.supabase
      .rpc('get_buddy_profile', {
        p_user_id: userId,
      });

    if (error) throw error;

    return data as BuddyProfile;
  }

  /**
   * Update current user's profile metadata
   */
  async updateOwnProfile(metadata: Record<string, any>) {
    const { data: authUser } = await this.supabase.auth.getUser();
    if (!authUser.user) throw new Error('Not authenticated');

    const { data, error } = await this.supabase.auth.updateUser({
      data: metadata,
    });

    if (error) throw error;

    return data.user;
  }

  /**
   * Get current user's full profile
   */
  async getOwnProfile() {
    const { data, error } = await this.supabase.auth.getUser();
    if (error || !data.user) throw new Error('Not authenticated');

    return data.user;
  }

  // =========================================================================
  // REAL-TIME SUBSCRIPTIONS (Optional)
  // =========================================================================

  /**
   * Subscribe to changes in buddy listings
   */
  subscribeToListings(callback: (change: any) => void) {
    return this.supabase
      .channel('buddy_listings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'buddy_listings',
          filter: 'status=eq.active',
        },
        callback
      )
      .subscribe();
  }

  /**
   * Subscribe to messages with a specific user
   */
  subscribeToMessages(otherUserId: string, callback: (change: any) => void) {
    return this.supabase
      .channel(`messages_${otherUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'buddy_messages',
          filter: `or(and(sender_id.eq.${otherUserId}),and(receiver_id.eq.${otherUserId}))`,
        },
        callback
      )
      .subscribe();
  }

  /**
   * Subscribe to interests on own listings
   */
  subscribeToInterests(callback: (change: any) => void) {
    return this.supabase
      .channel('buddy_interests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'buddy_interests',
        },
        callback
      )
      .subscribe();
  }
}

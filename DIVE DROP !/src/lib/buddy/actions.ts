'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';
import type {
  CreateListingInput,
  UpdateListingInput,
  CreateInterestInput,
  UpdateInterestInput,
} from './schemas';

// ============================================================================
// LISTING ACTIONS
// ============================================================================

export async function createListing(input: CreateListingInput) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet: any) => {
            cookiesToSet.forEach(({ name, value, options }: any) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('buddy_listings')
      .insert([{ ...input, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateListing(id: string, input: UpdateListingInput) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet: any) => {
            cookiesToSet.forEach(({ name, value, options }: any) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Verify ownership
    const { data: listing } = await supabase
      .from('buddy_listings')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!listing || listing.user_id !== user.id) {
      throw new Error('You do not own this listing');
    }

    const { data, error } = await supabase
      .from('buddy_listings')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteListing(id: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet: any) => {
            cookiesToSet.forEach(({ name, value, options }: any) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Verify ownership
    const { data: listing } = await supabase
      .from('buddy_listings')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!listing || listing.user_id !== user.id) {
      throw new Error('You do not own this listing');
    }

    const { error } = await supabase
      .from('buddy_listings')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getListingDetails(id: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet: any) => {
            cookiesToSet.forEach(({ name, value, options }: any) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase
      .from('buddy_listings')
      .select(`
        *,
        users:user_id(id, first_name, last_name, avatar_url, diving_experience, bio, location),
        dive_sites:dive_site_id(id, name, location, depth, difficulty)
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// INTEREST ACTIONS
// ============================================================================

export async function createInterest(input: CreateInterestInput) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet: any) => {
            cookiesToSet.forEach(({ name, value, options }: any) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get listing owner
    const { data: listing, error: listingError } = await supabase
      .from('buddy_listings')
      .select('user_id')
      .eq('id', input.listing_id)
      .single();

    if (listingError || !listing) throw new Error('Listing not found');
    if (listing.user_id === user.id) throw new Error('Cannot request on own listing');

    const { data, error } = await supabase
      .from('buddy_interests')
      .insert([
        {
          listing_id: input.listing_id,
          requester_id: user.id,
          owner_id: listing.user_id,
          message: input.message,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateInterest(id: string, input: UpdateInterestInput) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet: any) => {
            cookiesToSet.forEach(({ name, value, options }: any) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('buddy_interests')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function cancelInterest(id: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet: any) => {
            cookiesToSet.forEach(({ name, value, options }: any) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('buddy_interests')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('requester_id', user.id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// SAFETY ACTIONS
// ============================================================================

export async function blockUser(blockedUserId: string, reason?: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet: any) => {
            cookiesToSet.forEach(({ name, value, options }: any) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (blockedUserId === user.id) throw new Error('Cannot block yourself');

    const { data, error } = await supabase
      .from('buddy_blocks')
      .insert([
        {
          user_id: user.id,
          blocked_user_id: blockedUserId,
          reason,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function unblockUser(blockedUserId: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet: any) => {
            cookiesToSet.forEach(({ name, value, options }: any) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('buddy_blocks')
      .delete()
      .eq('user_id', user.id)
      .eq('blocked_user_id', blockedUserId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function reportUser(
  reportedUserId: string,
  reason: string,
  description: string,
  attachmentUrl?: string
) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet: any) => {
            cookiesToSet.forEach(({ name, value, options }: any) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (reportedUserId === user.id) throw new Error('Cannot report yourself');

    const { data, error } = await supabase
      .from('buddy_reports')
      .insert([
        {
          reporter_id: user.id,
          reported_user_id: reportedUserId,
          reason,
          description,
          attachment_url: attachmentUrl,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// CONTACT REVEAL ACTION
// ============================================================================

export async function revealContact(listingId: string) {
  try {
    const response = await fetch('/api/buddy/contact/reveal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: listingId }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to reveal contact');
    }

    return { success: true, data: result.data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

export async function bulkDeleteListings(listingIds: string[]) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet: any) => {
            cookiesToSet.forEach(({ name, value, options }: any) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Verify all listings belong to user
    const { data: listings } = await supabase
      .from('buddy_listings')
      .select('id, user_id')
      .in('id', listingIds);

    const unauthorized = listings?.some(l => l.user_id !== user.id);
    if (unauthorized) throw new Error('You do not own all these listings');

    const { error } = await supabase
      .from('buddy_listings')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .in('id', listingIds);

    if (error) throw error;
    return { success: true, deleted: listingIds.length };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

'use client';

import { useState, useEffect } from 'react';
import { AppIcon } from '@/components/AppIcon';
import { BuddyListingCard, BuddyListingForm, BuddyFilters, ContactRevealModal } from '@/components/find-buddy';
import { useBuddyStore } from '@/store/buddy-store';
import type { BuddyListing, BuddyInterest, BuddyFilters as BuddyFiltersType } from '@/types/buddy';
import type { CreateBuddyListingInput } from '@/lib/validations/buddy';

interface FindBuddyClientProps {
  isRTL: boolean;
  isAuthenticated: boolean;
  userId?: string;
  locale: string;
}

type Tab = 'browse' | 'my-listings';

export function FindBuddyClient({ isRTL, isAuthenticated, userId, locale }: FindBuddyClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('browse');
  const [listings, setListings] = useState<BuddyListing[]>([]);
  const [myListings, setMyListings] = useState<BuddyListing[]>([]);
  const [myInterests, setMyInterests] = useState<BuddyInterest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<BuddyFiltersType>({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [revealContactId, setRevealContactId] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<BuddyListing | null>(null);
  const { revealContact, isContactRevealed } = useBuddyStore();

  // Fetch listings
  useEffect(() => {
    fetchListings();
  }, [filters]);

  const fetchListings = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.location) params.append('location', filters.location);
      if (filters.experience_level) params.append('experience_level', filters.experience_level);
      if (filters.dive_type) params.append('dive_type', filters.dive_type);
      params.append('limit', '12');

      const response = await fetch(`/api/buddy/listings?${params}`);
      const data = await response.json();
      setListings(data.data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user's listings
  useEffect(() => {
    if (isAuthenticated && activeTab === 'my-listings') {
      fetchMyListings();
      fetchMyInterests();
    }
  }, [isAuthenticated, activeTab]);

  const fetchMyListings = async () => {
    try {
      const response = await fetch('/api/buddy/my-listings');
      const data = await response.json();
      setMyListings(data || []);
    } catch (error) {
      console.error('Error fetching my listings:', error);
    }
  };

  const fetchMyInterests = async () => {
    try {
      const response = await fetch('/api/buddy/interests');
      const data = await response.json();
      setMyInterests(data || []);
    } catch (error) {
      console.error('Error fetching interests:', error);
    }
  };

  // Create listing
  const handleCreateListing = async (data: CreateBuddyListingInput) => {
    try {
      const response = await fetch('/api/buddy/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to create listing');

      await fetchMyListings();
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating listing:', error);
      throw error;
    }
  };

  // Express interest
  const handleExpressInterest = async (listingId: string) => {
    try {
      const response = await fetch('/api/buddy/interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId }),
      });

      if (!response.ok) throw new Error('Failed to express interest');

      await fetchMyInterests();
    } catch (error) {
      console.error('Error expressing interest:', error);
    }
  };

  // Reveal contact
  const handleRevealContact = async (listingId: string) => {
    setSelectedListing(listings.find((l) => l.id === listingId) || null);
    setRevealContactId(listingId);
  };

  const confirmRevealContact = async () => {
    if (!revealContactId) return;

    try {
      const interest = myInterests.find((i) => i.listing_id === revealContactId);
      if (!interest) {
        await handleExpressInterest(revealContactId);
      }

      revealContact(revealContactId);
      setRevealContactId(null);
      setSelectedListing(null);
    } catch (error) {
      console.error('Error revealing contact:', error);
    }
  };

  // Delete listing
  const handleDeleteListing = async (id: string) => {
    if (!confirm(isRTL ? 'בטוח שברצונך למחוק?' : 'Are you sure?')) return;

    try {
      await fetch(`/api/buddy/listings/${id}`, { method: 'DELETE' });
      await fetchMyListings();
    } catch (error) {
      console.error('Error deleting listing:', error);
    }
  };

  // Remove interest
  const handleRemoveInterest = async (interestId: string) => {
    try {
      await fetch(`/api/buddy/interests/${interestId}`, { method: 'DELETE' });
      await fetchMyInterests();
    } catch (error) {
      console.error('Error removing interest:', error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-md">
        <AppIcon name="lock" className="mx-auto h-12 w-12 text-slate-400 mb-4" />
        <h2 className="text-xl font-bold mb-2">
          {isRTL ? 'עליך להתחבר' : 'Please sign in'}
        </h2>
        <p className="text-slate-600 mb-6">
          {isRTL
            ? 'כדי לחפש בן צלילה או ליצור הודעה'
            : 'to find a buddy or create a listing'}
        </p>
        <a
          href={`/${locale}/sign-in`}
          className="inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
        >
          {isRTL ? 'התחבר' : 'Sign in'}
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('browse')}
          className={`px-4 py-3 font-semibold transition ${
            activeTab === 'browse'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <AppIcon name="search" className="inline mr-2 h-5 w-5" />
          {isRTL ? 'עיין בהודעות' : 'Browse Listings'}
        </button>
        <button
          onClick={() => setActiveTab('my-listings')}
          className={`px-4 py-3 font-semibold transition ${
            activeTab === 'my-listings'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <AppIcon name="user" className="inline mr-2 h-5 w-5" />
          {isRTL ? 'ההודעות שלי' : 'My Listings'}
        </button>
      </div>

      {/* Browse Tab */}
      {activeTab === 'browse' && (
        <div className="space-y-6">
          <BuddyFilters isRTL={isRTL} onFilterChange={setFilters} isLoading={isLoading} />

          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin">
                <AppIcon name="users" className="h-8 w-8 text-blue-600" />
              </div>
              <p className="mt-4 text-slate-600">{isRTL ? 'טוען...' : 'Loading...'}</p>
            </div>
          ) : listings.length === 0 ? (
            <div className="rounded-2xl bg-white p-12 text-center shadow-md">
              <AppIcon name="coral" className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-bold mb-2">
                {isRTL ? 'לא נמצאו הודעות' : 'No listings found'}
              </h3>
              <p className="text-slate-600">
                {isRTL
                  ? 'נסה לשנות את הסינון או חיזור מאוחר יותר'
                  : 'Try adjusting filters or check back later'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => {
                const userInterest = myInterests.find((i) => i.listing_id === listing.id);
                return (
                  <BuddyListingCard
                    key={listing.id}
                    listing={listing}
                    isRTL={isRTL}
                    onExpressInterest={handleExpressInterest}
                    onRevealContact={handleRevealContact}
                    isContactRevealed={isContactRevealed(listing.id)}
                    isInterested={!!userInterest}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* My Listings Tab */}
      {activeTab === 'my-listings' && (
        <div className="space-y-6">
          {showCreateForm ? (
            <div className="rounded-2xl bg-white p-8 shadow-md">
              <button
                onClick={() => setShowCreateForm(false)}
                className="mb-6 text-blue-600 hover:underline"
              >
                {isRTL ? '‹ חזור' : '‹ Back'}
              </button>
              <BuddyListingForm isRTL={isRTL} onSubmit={handleCreateListing} />
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                <AppIcon name="plus" className="h-5 w-5" />
                {isRTL ? 'צור הודעה חדשה' : 'Create New Listing'}
              </button>

              {myListings.length === 0 ? (
                <div className="rounded-2xl bg-white p-12 text-center shadow-md">
                  <AppIcon name="users" className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                  <h3 className="text-lg font-bold mb-2">
                    {isRTL ? 'אין לך הודעות' : 'No listings yet'}
                  </h3>
                  <p className="text-slate-600">
                    {isRTL
                      ? 'צור הודעה כדי להתחיל'
                      : 'Create a listing to get started'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myListings.map((listing) => (
                    <div
                      key={listing.id}
                      className="rounded-2xl bg-white p-6 shadow-md flex items-between justify-between gap-4"
                    >
                      <div className="flex-1">
                        <h3 className="text-lg font-bold">{listing.title}</h3>
                        <p className="text-sm text-slate-600">{listing.location}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(listing.start_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeleteListing(listing.id)}
                          className="rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-200"
                        >
                          {isRTL ? 'מחק' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Contact Reveal Modal */}
      <ContactRevealModal
        isRTL={isRTL}
        isOpen={!!revealContactId}
        onClose={() => setRevealContactId(null)}
        onConfirm={confirmRevealContact}
        listingTitle={selectedListing?.title || ''}
      />
    </div>
  );
}

import { create } from 'zustand';
import type { FreeDivingListing, FreeDivingInterest, FreeDivingFilters } from '@/types/free-diving';

interface FreeDivingStoreState {
  // Listings
  listings: FreeDivingListing[];
  myListings: FreeDivingListing[];
  selectedListing: FreeDivingListing | null;
  isLoadingListings: boolean;
  listingError: string | null;

  // Interests
  myInterests: FreeDivingInterest[];
  isLoadingInterests: boolean;
  interestError: string | null;

  // Filters
  filters: FreeDivingFilters;
  searchQuery: string;

  // UI State
  isCreatingListing: boolean;
  showContactModal: boolean;
  revealedContacts: Set<string>;

  // Listings actions
  setListings: (listings: FreeDivingListing[]) => void;
  setMyListings: (listings: FreeDivingListing[]) => void;
  setSelectedListing: (listing: FreeDivingListing | null) => void;
  setIsLoadingListings: (loading: boolean) => void;
  setListingError: (error: string | null) => void;
  addListing: (listing: FreeDivingListing) => void;
  updateListing: (id: string, listing: Partial<FreeDivingListing>) => void;
  removeListing: (id: string) => void;

  // Interests actions
  setMyInterests: (interests: FreeDivingInterest[]) => void;
  setIsLoadingInterests: (loading: boolean) => void;
  setInterestError: (error: string | null) => void;
  addInterest: (interest: FreeDivingInterest) => void;
  removeInterest: (id: string) => void;

  // Filters actions
  setFilters: (filters: FreeDivingFilters) => void;
  setSearchQuery: (query: string) => void;
  clearFilters: () => void;

  // UI actions
  setIsCreatingListing: (creating: boolean) => void;
  setShowContactModal: (show: boolean) => void;
  revealContact: (listingId: string) => void;
  isContactRevealed: (listingId: string) => boolean;

  // Reset
  reset: () => void;
}

export const useFreeDivingStore = create<FreeDivingStoreState>((set, get) => ({
  listings: [],
  myListings: [],
  selectedListing: null,
  isLoadingListings: false,
  listingError: null,
  myInterests: [],
  isLoadingInterests: false,
  interestError: null,
  filters: {},
  searchQuery: '',
  isCreatingListing: false,
  showContactModal: false,
  revealedContacts: new Set(),

  setListings: (listings) => set({ listings }),
  setMyListings: (listings) => set({ myListings: listings }),
  setSelectedListing: (listing) => set({ selectedListing: listing }),
  setIsLoadingListings: (loading) => set({ isLoadingListings: loading }),
  setListingError: (error) => set({ listingError: error }),

  addListing: (listing) => set((state) => ({
    listings: [listing, ...state.listings],
    myListings: [listing, ...state.myListings],
  })),

  updateListing: (id, updates) => set((state) => ({
    listings: state.listings.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    myListings: state.myListings.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    selectedListing: state.selectedListing?.id === id ? { ...state.selectedListing, ...updates } : state.selectedListing,
  })),

  removeListing: (id) => set((state) => ({
    listings: state.listings.filter((l) => l.id !== id),
    myListings: state.myListings.filter((l) => l.id !== id),
    selectedListing: state.selectedListing?.id === id ? null : state.selectedListing,
  })),

  setMyInterests: (interests) => set({ myInterests: interests }),
  setIsLoadingInterests: (loading) => set({ isLoadingInterests: loading }),
  setInterestError: (error) => set({ interestError: error }),

  addInterest: (interest) => set((state) => ({
    myInterests: [interest, ...state.myInterests],
  })),

  removeInterest: (id) => set((state) => ({
    myInterests: state.myInterests.filter((i) => i.id !== id),
  })),

  setFilters: (filters) => set({ filters }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  clearFilters: () => set({ filters: {}, searchQuery: '' }),

  setIsCreatingListing: (creating) => set({ isCreatingListing: creating }),
  setShowContactModal: (show) => set({ showContactModal: show }),

  revealContact: (listingId) => set((state) => {
    const newRevealed = new Set(state.revealedContacts);
    newRevealed.add(listingId);
    return { revealedContacts: newRevealed };
  }),

  isContactRevealed: (listingId) => get().revealedContacts.has(listingId),

  reset: () => set({
    listings: [],
    myListings: [],
    selectedListing: null,
    isLoadingListings: false,
    listingError: null,
    myInterests: [],
    isLoadingInterests: false,
    interestError: null,
    filters: {},
    searchQuery: '',
    isCreatingListing: false,
    showContactModal: false,
    revealedContacts: new Set(),
  }),
}));

import { create } from 'zustand';
import type {
  ServiceProvider,
  ProviderService,
  ProviderReview,
  ProviderFilters,
  SearchProvidersResponse,
  ProviderDetailResponse,
} from '@/types/service-provider';

interface ServiceProviderState {
  // Search & Browse
  providers: ServiceProvider[];
  searchResults: SearchProvidersResponse | null;
  selectedProvider: ServiceProvider | null;
  providerDetails: ProviderDetailResponse | null;
  isLoading: boolean;
  error: string | null;

  // Filters
  currentFilters: ProviderFilters;
  searchQuery: string;

  // Pagination
  currentPage: number;
  totalProviders: number;

  // User's reviews
  userReviews: ProviderReview[];

  // Actions
  setProviders: (providers: ServiceProvider[]) => void;
  setSearchResults: (results: SearchProvidersResponse) => void;
  setSelectedProvider: (provider: ServiceProvider | null) => void;
  setProviderDetails: (details: ProviderDetailResponse | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Filter actions
  setFilters: (filters: Partial<ProviderFilters>) => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;

  // Pagination
  setCurrentPage: (page: number) => void;
  setTotalProviders: (total: number) => void;

  // Reviews
  setUserReviews: (reviews: ProviderReview[]) => void;
  addReview: (review: ProviderReview) => void;
}

const defaultFilters: ProviderFilters = {
  page: 1,
  limit: 20,
  search: '',
  min_rating: 0,
  price_min: 0,
  price_max: 100000,
  sort_by: 'rating',
  radius_km: 50,
};

export const useServiceProviderStore = create<ServiceProviderState>((set) => ({
  providers: [],
  searchResults: null,
  selectedProvider: null,
  providerDetails: null,
  isLoading: false,
  error: null,

  currentFilters: defaultFilters,
  searchQuery: '',

  currentPage: 1,
  totalProviders: 0,

  userReviews: [],

  setProviders: (providers) => set({ providers }),
  setSearchResults: (results) => set({ searchResults: results }),
  setSelectedProvider: (provider) => set({ selectedProvider: provider }),
  setProviderDetails: (details) => set({ providerDetails: details }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  setFilters: (filters) =>
    set((state) => ({
      currentFilters: { ...state.currentFilters, ...filters },
    })),
  setSearchQuery: (query) => set({ searchQuery: query }),
  resetFilters: () =>
    set({
      currentFilters: defaultFilters,
      searchQuery: '',
      currentPage: 1,
    }),

  setCurrentPage: (page) => set({ currentPage: page }),
  setTotalProviders: (total) => set({ totalProviders: total }),

  setUserReviews: (reviews) => set({ userReviews: reviews }),
  addReview: (review) =>
    set((state) => ({
      userReviews: [review, ...state.userReviews],
    })),
}));

import { create } from 'zustand';
import type { CreateBookingInput, BookingStatusType } from '@/lib/bookings/schemas';

// State machine for booking workflow
export const BookingStates = {
  DRAFT: 'draft',
  SELECTING_DATE: 'selecting_date',
  SELECTING_LOCATION: 'selecting_location',
  SELECTING_PROVIDER: 'selecting_provider',
  PAYMENT: 'payment',
  CONFIRMED: 'confirmed',
  DIVE_IN_PROGRESS: 'dive_in_progress',
  REVIEW: 'review',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type BookingStep = (typeof BookingStates)[keyof typeof BookingStates];

export interface BookingDraft extends Partial<CreateBookingInput> {
  id?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BookingStoreState {
  // Current draft
  draft: BookingDraft;
  currentStep: BookingStep;
  isLoading: boolean;
  error: string | null;

  // Actions
  setDraft: (draft: Partial<BookingDraft>) => void;
  resetDraft: () => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: BookingStep) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  canProceed: () => boolean;
  getProgress: () => number;
}

const initialDraft: BookingDraft = {
  buddy_user_id: undefined,
  dive_date: undefined,
  dive_site_id: undefined,
  service_provider_id: undefined,
  max_depth: 30,
  water_temp: 20,
  equipment_needed: [],
  special_requirements: '',
  number_of_divers: 2,
  estimated_duration: 60,
};

const stepsOrder: BookingStep[] = [
  'draft',
  'selecting_date',
  'selecting_location',
  'selecting_provider',
  'payment',
  'confirmed',
];

export const useBookingStore = create<BookingStoreState>((set, get) => ({
  draft: initialDraft,
  currentStep: 'draft',
  isLoading: false,
  error: null,

  setDraft: (updates) =>
    set((state) => ({
      draft: { ...state.draft, ...updates },
      error: null,
    })),

  resetDraft: () =>
    set({
      draft: initialDraft,
      currentStep: 'draft',
      error: null,
    }),

  nextStep: () => {
    const { currentStep, canProceed } = get();
    if (!canProceed()) {
      set({ error: 'Please complete required fields before proceeding' });
      return;
    }

    const currentIndex = stepsOrder.indexOf(currentStep);
    if (currentIndex < stepsOrder.length - 1) {
      set({ currentStep: stepsOrder[currentIndex + 1] });
    }
  },

  previousStep: () => {
    const { currentStep } = get();
    const currentIndex = stepsOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      set({ currentStep: stepsOrder[currentIndex - 1] });
    }
  },

  goToStep: (step) => {
    const stepIndex = stepsOrder.indexOf(step);
    const currentIndex = stepsOrder.indexOf(get().currentStep);

    // Allow going back, but not forward without validation
    if (stepIndex <= currentIndex) {
      set({ currentStep: step });
    } else if (get().canProceed()) {
      set({ currentStep: step });
    }
  },

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  canProceed: () => {
    const { currentStep, draft } = get();

    const validations = {
      draft: draft.buddy_user_id !== undefined,
      selecting_date: draft.dive_date !== undefined,
      selecting_location: draft.dive_site_id !== undefined || draft.custom_location,
      selecting_provider: draft.service_provider_id !== undefined,
      payment: draft.number_of_divers !== undefined,
      confirmed: true,
    };

    return validations[currentStep] ?? false;
  },

  getProgress: () => {
    const { currentStep } = get();
    const currentIndex = stepsOrder.indexOf(currentStep);
    return Math.round(((currentIndex + 1) / stepsOrder.length) * 100);
  },
}));

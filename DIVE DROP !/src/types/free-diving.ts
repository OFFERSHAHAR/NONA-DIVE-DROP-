export type FreeDivingListingType = 'instructor' | 'partner' | 'group-session';
export type FreeDivingInstructorType = 'apnea-training' | 'courses' | 'competition' | 'depth';
export type FreeDivingExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'professional';

export interface FreeDivingListing {
  id: string;
  user_id: string;
  listing_type: FreeDivingListingType;
  instructor_type?: FreeDivingInstructorType;
  title: string;
  description: string;
  location: string;
  experience_level: FreeDivingExperienceLevel;
  max_participants: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  contact_email?: string;
  contact_phone?: string;
  contact_hidden: boolean;
  language_preference: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface FreeDivingInterest {
  id: string;
  listing_id: string;
  interested_user_id: string;
  contact_revealed: boolean;
  message: string;
  created_at: string;
  updated_at: string;
}

export interface FreeDivingListingWithUser extends FreeDivingListing {
  user?: {
    id: string;
    email?: string;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
    };
  };
  profile?: {
    avatar_url?: string;
    experience_level?: string;
    total_dives_logged?: number;
  };
  interest_count?: number;
  current_user_interest?: FreeDivingInterest;
}

export interface CreateFreeDivingListingInput {
  listing_type: FreeDivingListingType;
  instructor_type?: FreeDivingInstructorType;
  title: string;
  description: string;
  location: string;
  experience_level: FreeDivingExperienceLevel;
  max_participants: number;
  start_date: string;
  end_date: string;
  contact_email?: string;
  contact_phone?: string;
  contact_hidden?: boolean;
  language_preference?: string;
  notes?: string;
}

export interface FreeDivingFilters {
  listing_type?: FreeDivingListingType;
  instructor_type?: FreeDivingInstructorType;
  location?: string;
  experience_level?: FreeDivingExperienceLevel;
  start_date?: string;
  end_date?: string;
}

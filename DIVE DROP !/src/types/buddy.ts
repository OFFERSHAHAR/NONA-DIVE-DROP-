export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'professional';
export type DiveType = 'reef' | 'wreck' | 'open_water' | 'cave' | 'boat' | 'shore';

export interface BuddyListing {
  id: string;
  user_id: string;
  title: string;
  description: string;
  location: string;
  experience_level: ExperienceLevel;
  dive_type: DiveType;
  max_divers: number;
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

export interface BuddyInterest {
  id: string;
  listing_id: string;
  interested_user_id: string;
  contact_request_sent: boolean;
  contact_request_accepted: boolean;
  message: string;
  created_at: string;
  updated_at: string;
}

export interface BuddyConnection {
  id: string;
  listing_id: string;
  user_id_1: string;
  user_id_2: string;
  status: 'matched' | 'active' | 'completed';
  connection_date: string;
  created_at: string;
}

export interface BuddyListingWithUser extends BuddyListing {
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
  current_user_interest?: BuddyInterest;
}

export interface CreateListingInput {
  title: string;
  description: string;
  location: string;
  experience_level: ExperienceLevel;
  dive_type: DiveType;
  max_divers: number;
  start_date: string;
  end_date: string;
  contact_email?: string;
  contact_phone?: string;
  contact_hidden?: boolean;
  language_preference?: string;
  notes?: string;
}

export interface BuddyFilters {
  location?: string;
  experience_level?: ExperienceLevel;
  dive_type?: DiveType;
  start_date?: string;
  end_date?: string;
  max_divers?: number;
}

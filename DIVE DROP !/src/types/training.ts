/**
 * Free Diving Training Matching System Types
 * Comprehensive type definitions for training programs, progress, and recommendations
 */

export type TrainingDepthLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type TrainingProgramStatus = 'active' | 'inactive' | 'cancelled';

export type TrainingEnrollmentStatus = 'enrolled' | 'in_progress' | 'completed' | 'cancelled';

// ============================================================================
// TRAINING PROGRAM
// ============================================================================

export interface TrainingProgram {
  id: string;
  instructor_id: string;
  name: string;
  description: string;

  // Depth Classification
  depth_level: TrainingDepthLevel;
  depth_min_meters: number;
  depth_max_meters: number;

  // Program Details
  duration_hours: number;
  duration_days: number;
  max_students: number;
  current_enrollment: number;

  // Pricing
  price_shekel: number;
  currency: string;

  // Location & Schedule
  location: string;
  latitude?: number;
  longitude?: number;
  next_start_date?: string;
  session_days: number;

  // Requirements
  min_age: number;
  min_experience_level: string;
  medical_clearance_required: boolean;
  equipment_provided: boolean;

  // Content Coverage
  topics: string[];
  certifications_offered: string[];
  equipment_provided_list: string[];

  // Status
  is_active: boolean;
  status: TrainingProgramStatus;

  // Ratings
  average_rating: number;
  total_ratings: number;
  total_students_trained: number;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface CreateTrainingProgramInput {
  name: string;
  description: string;
  depth_level: TrainingDepthLevel;
  depth_min_meters: number;
  depth_max_meters: number;
  duration_hours: number;
  duration_days: number;
  max_students: number;
  price_shekel: number;
  location: string;
  latitude?: number;
  longitude?: number;
  next_start_date?: string;
  session_days?: number;
  min_age?: number;
  min_experience_level?: string;
  medical_clearance_required?: boolean;
  equipment_provided?: boolean;
  topics?: string[];
  certifications_offered?: string[];
  equipment_provided_list?: string[];
}

export interface UpdateTrainingProgramInput {
  name?: string;
  description?: string;
  price_shekel?: number;
  location?: string;
  next_start_date?: string;
  is_active?: boolean;
  status?: TrainingProgramStatus;
  max_students?: number;
}

// ============================================================================
// USER TRAINING PROGRESS
// ============================================================================

export interface UserTrainingProgress {
  id: string;
  user_id: string;

  // Current Depth Achievement
  depth_achieved_meters: number;
  current_level: TrainingDepthLevel;

  // Certifications Earned
  certifications: string[];

  // Training History
  total_trainings_completed: number;
  total_training_hours: number;
  last_training_date?: string;
  last_training_location?: string;

  // Medical Status
  medical_clearance_valid: boolean;
  medical_clearance_expiry?: string;
  medical_notes?: string;

  // Safety Info
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  blood_type?: string;
  allergies?: string;

  // Preferences
  preferred_location?: string;
  preferred_depth_min: number;
  preferred_depth_max: number;
  training_frequency_preference: string;

  // Progress Stats
  trainings_this_year: number;
  average_training_rating: number;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface UpdateUserProgressInput {
  depth_achieved_meters?: number;
  certifications?: string[];
  medical_clearance_valid?: boolean;
  medical_clearance_expiry?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  blood_type?: string;
  allergies?: string;
  preferred_location?: string;
  preferred_depth_min?: number;
  preferred_depth_max?: number;
  training_frequency_preference?: string;
}

// ============================================================================
// TRAINING RECOMMENDATIONS
// ============================================================================

export interface TrainingRecommendation {
  id: string;
  user_id: string;
  training_program_id: string;
  reason: string;
  confidence_score: number;
  match_details: Record<string, any>;

  // User Status
  was_recommended_at: string;
  was_viewed: boolean;
  viewed_at?: string;
  was_booked: boolean;
  booked_at?: string;

  // Scoring Components
  depth_match_score?: number;
  experience_match_score?: number;
  location_match_score?: number;
  price_match_score?: number;
  instructor_quality_score?: number;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface TrainingRecommendationWithProgram extends TrainingRecommendation {
  training_program: TrainingProgram;
  instructor_name: string;
}

export interface RecommendationResponse {
  training_program_id: string;
  program_name: string;
  instructor_name: string;
  depth_level: TrainingDepthLevel;
  confidence_score: number;
  reason: string;
  price_shekel: number;
  location: string;
}

// ============================================================================
// TRAINING ENROLLMENT
// ============================================================================

export interface TrainingEnrollment {
  id: string;
  user_id: string;
  training_program_id: string;

  // Enrollment Details
  enrollment_date: string;
  status: TrainingEnrollmentStatus;

  // Progress
  completion_date?: string;
  completion_percentage: number;
  progress_notes?: string;

  // Performance
  passed?: boolean;
  certification_earned?: string;
  depth_achieved?: number;

  // Session Attendance
  sessions_attended: number;
  sessions_missed: number;

  // Payment
  payment_status: string;
  amount_paid?: number;

  // Feedback
  student_feedback?: string;
  student_rating?: number;
  instructor_notes?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface CreateEnrollmentInput {
  training_program_id: string;
  payment_status?: string;
}

export interface UpdateEnrollmentInput {
  status?: TrainingEnrollmentStatus;
  completion_percentage?: number;
  progress_notes?: string;
  passed?: boolean;
  certification_earned?: string;
  depth_achieved?: number;
  student_feedback?: string;
  student_rating?: number;
  instructor_notes?: string;
}

// ============================================================================
// DEPTH PROGRESSION RULES
// ============================================================================

export interface DepthProgressionRule {
  id: string;
  from_level: TrainingDepthLevel;
  to_level: TrainingDepthLevel;
  min_depth_achievement: number;
  min_trainings_required: number;
  min_hours_required: number;
  min_days_between_training: number;
  certifications_required: string[];
  description?: string;
  training_programs_available: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// TRAINING FEEDBACK
// ============================================================================

export interface TrainingFeedback {
  id: string;
  training_program_id: string;
  user_id: string;

  // Feedback
  overall_rating: number;
  instructor_rating?: number;
  safety_rating?: number;
  content_quality_rating?: number;
  comment?: string;

  // Experience
  comfortable_with_depth?: boolean;
  would_recommend?: boolean;
  improvements_needed?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface CreateFeedbackInput {
  overall_rating: number;
  instructor_rating?: number;
  safety_rating?: number;
  content_quality_rating?: number;
  comment?: string;
  comfortable_with_depth?: boolean;
  would_recommend?: boolean;
  improvements_needed?: string;
}

// ============================================================================
// FILTERING & SEARCH
// ============================================================================

export interface TrainingFilterOptions {
  depth_level?: TrainingDepthLevel;
  location?: string;
  max_price?: number;
  min_price?: number;
  instructor_rating?: number;
  available_soon?: boolean;
  equipment_provided?: boolean;
  sort_by?: 'price' | 'rating' | 'date' | 'relevance';
}

export interface TrainingSearchParams {
  query?: string;
  filters?: TrainingFilterOptions;
  limit?: number;
  offset?: number;
}

// ============================================================================
// MATCHING ALGORITHM TYPES
// ============================================================================

export interface TrainingMatchingInput {
  user_id: string;
  limit?: number;
  include_details?: boolean;
}

export interface MatchingScore {
  overall_score: number;
  depth_match: number;
  experience_match: number;
  location_match: number;
  price_match: number;
  quality_match: number;
  breakdown: string;
}

export interface LevelEligibilityCheck {
  is_eligible: boolean;
  reason?: string;
  user_level: TrainingDepthLevel;
  program_level: TrainingDepthLevel;
  can_progress: boolean;
  next_level?: TrainingDepthLevel;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface TrainingAPIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedTrainingResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    pages: number;
  };
}

// ============================================================================
// INSTRUCTOR PROFILE WITH TRAININGS
// ============================================================================

export interface InstructorTrainingProfile {
  instructor_id: string;
  instructor_name: string;
  average_rating: number;
  total_reviews: number;
  total_sessions_completed: number;
  years_experience: number;
  primary_location: string;
  training_programs: TrainingProgram[];
}

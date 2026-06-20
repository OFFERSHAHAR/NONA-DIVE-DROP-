// Admin types and interfaces

export type UserRole = 'admin' | 'manager' | 'user' | 'driver';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DiveSite {
  id: string;
  name: string;
  nameHe?: string;
  description: string;
  descriptionHe?: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  difficulty: 'easy' | 'intermediate' | 'advanced';
  maxDepth: number;
  images: string[];
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Shuttle {
  id: string;
  name: string;
  driverId: string;
  capacity: number;
  registrationNumber: string;
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  status: 'available' | 'in_use' | 'maintenance' | 'offline';
  availability: {
    [key in DayOfWeek]: TimeSlot[];
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface TimeSlot {
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  sort?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface AdminStats {
  totalUsers: number;
  totalDiveSites: number;
  totalShuttles: number;
  activeShuttles: number;
  recentActivity: Activity[];
}

export interface Activity {
  id: string;
  type: 'user_created' | 'user_updated' | 'site_created' | 'site_updated' | 'shuttle_created' | 'shuttle_updated';
  userId: string;
  entityId: string;
  description: string;
  timestamp: Date;
}

export interface AuthSession {
  user: AdminUser;
  token: string;
  expiresAt: Date;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface FormState {
  isLoading: boolean;
  error: string | null;
  success: boolean;
  validationErrors: ValidationError[];
}

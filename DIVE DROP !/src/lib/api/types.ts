/**
 * Unified API response type definitions
 * Standardized response format for all API routes
 */

export type ApiResponseStatus = 'success' | 'error' | 'validation_error';

/**
 * Standard API response envelope
 */
export interface ApiResponse<T = any> {
  status: ApiResponseStatus;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>; // Zod validation errors
  timestamp: string;
  requestId?: string; // For tracing
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

/**
 * Generic result type for operation outcomes
 */
export type OperationResult<T = any> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

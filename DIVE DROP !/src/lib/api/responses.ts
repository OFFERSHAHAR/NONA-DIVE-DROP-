/**
 * Unified API Response Factory
 * Provides consistent response formatting for all API routes
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import type { ApiResponse, PaginatedResponse, OperationResult } from './types';

export class ApiResponseFactory {
  /**
   * Format a successful response
   */
  static success<T>(
    data: T,
    status = 200,
    requestId?: string
  ): NextResponse<ApiResponse<T>> {
    return NextResponse.json(
      {
        status: 'success',
        data,
        timestamp: new Date().toISOString(),
        ...(requestId && { requestId }),
      },
      { status }
    );
  }

  /**
   * Format an error response
   */
  static error(
    message: string,
    status = 500,
    requestId?: string
  ): NextResponse<ApiResponse> {
    return NextResponse.json(
      {
        status: 'error',
        error: message,
        timestamp: new Date().toISOString(),
        ...(requestId && { requestId }),
      },
      { status }
    );
  }

  /**
   * Format a validation error response (typically from Zod)
   */
  static validationError(
    errors: Record<string, string[]>,
    status = 400,
    requestId?: string
  ): NextResponse<ApiResponse> {
    return NextResponse.json(
      {
        status: 'validation_error',
        errors,
        timestamp: new Date().toISOString(),
        ...(requestId && { requestId }),
      },
      { status }
    );
  }

  /**
   * Format a paginated response
   */
  static paginated<T>(
    items: T[],
    total: number,
    page: number,
    pageSize: number,
    requestId?: string
  ): NextResponse<PaginatedResponse<T>> {
    return NextResponse.json(
      {
        status: 'success',
        data: items,
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
        timestamp: new Date().toISOString(),
        ...(requestId && { requestId }),
      },
      { status: 200 }
    );
  }

  /**
   * Convert Zod validation error to API response
   */
  static fromZodError(
    error: ZodError,
    requestId?: string
  ): NextResponse<ApiResponse> {
    const formattedErrors = error.flatten().fieldErrors;
    return this.validationError(
      formattedErrors as Record<string, string[]>,
      400,
      requestId
    );
  }

  /**
   * Convert OperationResult to API response
   */
  static fromOperationResult<T>(
    result: OperationResult<T>,
    requestId?: string
  ): NextResponse<ApiResponse<T>> {
    if (result.success) {
      return this.success(result.data, 200, requestId);
    } else {
      return this.error(result.error, 400, requestId);
    }
  }
}

/**
 * Utility function to generate request ID (for tracing)
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

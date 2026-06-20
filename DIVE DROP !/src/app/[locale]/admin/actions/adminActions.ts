'use server';

import { ApiResponse, AdminUser, DiveSite, Shuttle, AdminStats, Activity } from '@/lib/types/admin';
import { CreateUserInput, UpdateUserInput, CreateDiveSiteInput, UpdateDiveSiteInput, CreateShuttleInput, UpdateShuttleInput, LoginInput } from '@/lib/validation/adminValidation';

// Mock data for demo purposes
const mockUsers: AdminUser[] = [
  {
    id: '1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    email: 'manager@example.com',
    name: 'Manager User',
    role: 'manager',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockDiveSites: DiveSite[] = [
  {
    id: '1',
    name: 'Coral Reef Paradise',
    nameHe: 'גן אלמוגים פרדיס',
    description: 'Beautiful coral reef with diverse marine life',
    descriptionHe: 'גן אלמוגים יפה עם חיי ים מגוונים',
    location: {
      latitude: 29.5505,
      longitude: 34.9255,
      address: 'Eilat, Israel',
    },
    difficulty: 'intermediate',
    maxDepth: 40,
    images: ['/dive-site-1.png'],
    tags: ['coral', 'marine-life', 'scenic'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockShuttles: Shuttle[] = [
  {
    id: '1',
    name: 'Shuttle 01',
    driverId: '2',
    capacity: 6,
    registrationNumber: 'SH001',
    status: 'available',
    availability: {
      monday: [{ startTime: '08:00', endTime: '18:00' }],
      tuesday: [{ startTime: '08:00', endTime: '18:00' }],
      wednesday: [{ startTime: '08:00', endTime: '18:00' }],
      thursday: [{ startTime: '08:00', endTime: '18:00' }],
      friday: [{ startTime: '08:00', endTime: '18:00' }],
      saturday: [{ startTime: '09:00', endTime: '17:00' }],
      sunday: [{ startTime: '09:00', endTime: '17:00' }],
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Authentication
export async function loginAdmin(input: LoginInput): Promise<ApiResponse<{ user: AdminUser; token: string }>> {
  try {
    // Mock authentication - in production, connect to your database
    if (input.email === 'admin@example.com' && input.password === 'password123') {
      const user = mockUsers[0];
      return {
        success: true,
        data: {
          user,
          token: 'mock-jwt-token-' + Date.now(),
        },
      };
    }

    return {
      success: false,
      error: 'Invalid email or password',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Login failed',
    };
  }
}

// Users
export async function fetchUsers(): Promise<ApiResponse<AdminUser[]>> {
  try {
    // In production, fetch from database
    await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API delay
    return {
      success: true,
      data: mockUsers,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch users',
    };
  }
}

export async function createUser(input: CreateUserInput): Promise<ApiResponse<AdminUser>> {
  try {
    const newUser: AdminUser = {
      id: Math.random().toString(36).substr(2, 9),
      email: input.email,
      name: input.name,
      role: input.role,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockUsers.push(newUser);

    return {
      success: true,
      data: newUser,
      message: 'User created successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create user',
    };
  }
}

export async function updateUser(input: UpdateUserInput): Promise<ApiResponse<AdminUser>> {
  try {
    const index = mockUsers.findIndex((u) => u.id === input.id);
    if (index === -1) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    const updatedUser: AdminUser = {
      ...mockUsers[index],
      email: input.email,
      name: input.name,
      role: input.role,
      updatedAt: new Date(),
    };

    mockUsers[index] = updatedUser;

    return {
      success: true,
      data: updatedUser,
      message: 'User updated successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user',
    };
  }
}

export async function deleteUser(userId: string): Promise<ApiResponse<void>> {
  try {
    const index = mockUsers.findIndex((u) => u.id === userId);
    if (index === -1) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    mockUsers.splice(index, 1);

    return {
      success: true,
      message: 'User deleted successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete user',
    };
  }
}

// Dive Sites
export async function fetchDiveSites(): Promise<ApiResponse<DiveSite[]>> {
  try {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      success: true,
      data: mockDiveSites,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch dive sites',
    };
  }
}

export async function createDiveSite(input: CreateDiveSiteInput): Promise<ApiResponse<DiveSite>> {
  try {
    const newSite: DiveSite = {
      id: Math.random().toString(36).substr(2, 9),
      name: input.name,
      nameHe: input.nameHe,
      description: input.description,
      descriptionHe: input.descriptionHe,
      location: input.location,
      difficulty: input.difficulty,
      maxDepth: input.maxDepth,
      images: input.images || [],
      tags: input.tags || [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockDiveSites.push(newSite);

    return {
      success: true,
      data: newSite,
      message: 'Dive site created successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create dive site',
    };
  }
}

export async function updateDiveSite(input: UpdateDiveSiteInput): Promise<ApiResponse<DiveSite>> {
  try {
    const index = mockDiveSites.findIndex((s) => s.id === input.id);
    if (index === -1) {
      return {
        success: false,
        error: 'Dive site not found',
      };
    }

    const updatedSite: DiveSite = {
      ...mockDiveSites[index],
      name: input.name,
      nameHe: input.nameHe,
      description: input.description,
      descriptionHe: input.descriptionHe,
      location: input.location,
      difficulty: input.difficulty,
      maxDepth: input.maxDepth,
      images: input.images || [],
      tags: input.tags || [],
      updatedAt: new Date(),
    };

    mockDiveSites[index] = updatedSite;

    return {
      success: true,
      data: updatedSite,
      message: 'Dive site updated successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update dive site',
    };
  }
}

export async function deleteDiveSite(siteId: string): Promise<ApiResponse<void>> {
  try {
    const index = mockDiveSites.findIndex((s) => s.id === siteId);
    if (index === -1) {
      return {
        success: false,
        error: 'Dive site not found',
      };
    }

    mockDiveSites.splice(index, 1);

    return {
      success: true,
      message: 'Dive site deleted successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete dive site',
    };
  }
}

// Shuttles
export async function fetchShuttles(): Promise<ApiResponse<Shuttle[]>> {
  try {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      success: true,
      data: mockShuttles,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch shuttles',
    };
  }
}

export async function createShuttle(input: CreateShuttleInput): Promise<ApiResponse<Shuttle>> {
  try {
    const newShuttle: Shuttle = {
      id: Math.random().toString(36).substr(2, 9),
      name: input.name,
      driverId: input.driverId,
      capacity: input.capacity,
      registrationNumber: input.registrationNumber,
      status: 'offline',
      availability: input.availability || {},
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockShuttles.push(newShuttle);

    return {
      success: true,
      data: newShuttle,
      message: 'Shuttle created successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create shuttle',
    };
  }
}

export async function updateShuttle(input: UpdateShuttleInput): Promise<ApiResponse<Shuttle>> {
  try {
    const index = mockShuttles.findIndex((s) => s.id === input.id);
    if (index === -1) {
      return {
        success: false,
        error: 'Shuttle not found',
      };
    }

    const updatedShuttle: Shuttle = {
      ...mockShuttles[index],
      name: input.name,
      driverId: input.driverId,
      capacity: input.capacity,
      registrationNumber: input.registrationNumber,
      availability: input.availability || {},
      updatedAt: new Date(),
    };

    mockShuttles[index] = updatedShuttle;

    return {
      success: true,
      data: updatedShuttle,
      message: 'Shuttle updated successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update shuttle',
    };
  }
}

export async function deleteShuttle(shuttleId: string): Promise<ApiResponse<void>> {
  try {
    const index = mockShuttles.findIndex((s) => s.id === shuttleId);
    if (index === -1) {
      return {
        success: false,
        error: 'Shuttle not found',
      };
    }

    mockShuttles.splice(index, 1);

    return {
      success: true,
      message: 'Shuttle deleted successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete shuttle',
    };
  }
}

// Stats
export async function fetchAdminStats(): Promise<ApiResponse<AdminStats>> {
  try {
    const mockActivity: Activity[] = [
      {
        id: '1',
        type: 'user_created',
        userId: '1',
        entityId: '2',
        description: 'New user registered',
        timestamp: new Date(Date.now() - 3600000),
      },
      {
        id: '2',
        type: 'site_updated',
        userId: '1',
        entityId: '1',
        description: 'Dive site updated',
        timestamp: new Date(Date.now() - 7200000),
      },
    ];

    return {
      success: true,
      data: {
        totalUsers: mockUsers.length,
        totalDiveSites: mockDiveSites.length,
        totalShuttles: mockShuttles.length,
        activeShuttles: mockShuttles.filter((s) => s.status === 'available').length,
        recentActivity: mockActivity,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch stats',
    };
  }
}

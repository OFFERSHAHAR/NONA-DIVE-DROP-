import { z } from 'zod';

export const userRoleEnum = z.enum(['admin', 'manager', 'user', 'driver']);

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  role: userRoleEnum,
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const updateUserSchema = createUserSchema.extend({
  id: z.string().uuid(),
}).omit({ password: true }).extend({
  password: z.string().min(6).optional(),
});

export const createDiveSiteSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  nameHe: z.string().optional(),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000),
  descriptionHe: z.string().optional(),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    address: z.string().min(5),
  }),
  difficulty: z.enum(['easy', 'intermediate', 'advanced']),
  maxDepth: z.number().positive('Max depth must be positive'),
  tags: z.array(z.string()).default([]),
  images: z.array(z.string().url()).default([]),
});

export const updateDiveSiteSchema = createDiveSiteSchema.extend({
  id: z.string().uuid(),
});

export const timeSlotSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
});

export const createShuttleSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  driverId: z.string().uuid('Invalid driver ID'),
  capacity: z.number().int().positive('Capacity must be positive'),
  registrationNumber: z.string().min(3).max(20),
  availability: z.record(
    z.array(timeSlotSchema)
  ).optional(),
});

export const updateShuttleSchema = createShuttleSchema.extend({
  id: z.string().uuid(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Type exports
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateDiveSiteInput = z.infer<typeof createDiveSiteSchema>;
export type UpdateDiveSiteInput = z.infer<typeof updateDiveSiteSchema>;
export type CreateShuttleInput = z.infer<typeof createShuttleSchema>;
export type UpdateShuttleInput = z.infer<typeof updateShuttleSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

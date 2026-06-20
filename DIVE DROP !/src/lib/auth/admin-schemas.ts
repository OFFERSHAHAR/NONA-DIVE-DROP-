import { z } from 'zod';

// Email validation
const emailSchema = z.string().email('Invalid email address').max(255);

// Password validation
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Admin login schema
export const adminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

// 2FA verification schema
export const admin2FAVerifySchema = z.object({
  token: z.string().length(6, 'Code must be 6 digits').regex(/^\d{6}$/, 'Code must be all digits'),
});

export type Admin2FAVerifyInput = z.infer<typeof admin2FAVerifySchema>;

// 2FA setup schema
export const admin2FASetupSchema = z.object({
  secret: z.string(),
  token: z.string().length(6, 'Code must be 6 digits').regex(/^\d{6}$/, 'Code must be all digits'),
});

export type Admin2FASetupInput = z.infer<typeof admin2FASetupSchema>;

// Admin invitation schema
export const adminInviteSchema = z.object({
  email: emailSchema,
  role: z.enum(['super_admin', 'admin', 'moderator', 'viewer']),
});

export type AdminInviteInput = z.infer<typeof adminInviteSchema>;

// Accept invitation schema
export const acceptInvitationSchema = z
  .object({
    token: z.string().min(1, 'Invalid invitation token'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

// Change role schema
export const changeAdminRoleSchema = z.object({
  admin_user_id: z.string().uuid('Invalid admin user ID'),
  role: z.enum(['super_admin', 'admin', 'moderator', 'viewer']),
});

export type ChangeAdminRoleInput = z.infer<typeof changeAdminRoleSchema>;

// Update admin status schema
export const updateAdminStatusSchema = z.object({
  admin_user_id: z.string().uuid('Invalid admin user ID'),
  status: z.enum(['active', 'suspended', 'pending']),
});

export type UpdateAdminStatusInput = z.infer<typeof updateAdminStatusSchema>;

// Add IP to whitelist schema
export const addIPWhitelistSchema = z.object({
  ip_address: z
    .string()
    .ip({ version: 'v4' })
    .or(z.string().regex(/^(\d+\.\d+\.\d+\.0)\/24$/, 'Invalid CIDR notation'))
    .or(z.string().regex(/^::1$/, 'IPv6 localhost'))
    .or(z.string().regex(/^fe80::/i, 'IPv6 link-local')),
});

export type AddIPWhitelistInput = z.infer<typeof addIPWhitelistSchema>;

// Permissions enum
export enum AdminPermission {
  // Users
  READ_USERS = 'read_users',
  CREATE_USERS = 'create_users',
  EDIT_USERS = 'edit_users',
  DELETE_USERS = 'delete_users',
  BAN_USERS = 'ban_users',

  // Dive Sites
  READ_DIVE_SITES = 'read_dive_sites',
  CREATE_DIVE_SITES = 'create_dive_sites',
  EDIT_DIVE_SITES = 'edit_dive_sites',
  DELETE_DIVE_SITES = 'delete_dive_sites',
  PUBLISH_DIVE_SITES = 'publish_dive_sites',

  // Shuttles
  READ_SHUTTLES = 'read_shuttles',
  CREATE_SHUTTLES = 'create_shuttles',
  EDIT_SHUTTLES = 'edit_shuttles',
  DELETE_SHUTTLES = 'delete_shuttles',
  MANAGE_SHUTTLE_SCHEDULE = 'manage_shuttle_schedule',

  // Admin Management
  MANAGE_ADMINS = 'manage_admins',
  INVITE_ADMINS = 'invite_admins',
  CHANGE_ADMIN_ROLE = 'change_admin_role',

  // System
  VIEW_AUDIT_LOGS = 'view_audit_logs',
  MANAGE_SETTINGS = 'manage_settings',
}

// Role definitions
export const rolePermissionMap: Record<string, AdminPermission[]> = {
  super_admin: [
    AdminPermission.READ_USERS,
    AdminPermission.CREATE_USERS,
    AdminPermission.EDIT_USERS,
    AdminPermission.DELETE_USERS,
    AdminPermission.BAN_USERS,
    AdminPermission.READ_DIVE_SITES,
    AdminPermission.CREATE_DIVE_SITES,
    AdminPermission.EDIT_DIVE_SITES,
    AdminPermission.DELETE_DIVE_SITES,
    AdminPermission.PUBLISH_DIVE_SITES,
    AdminPermission.READ_SHUTTLES,
    AdminPermission.CREATE_SHUTTLES,
    AdminPermission.EDIT_SHUTTLES,
    AdminPermission.DELETE_SHUTTLES,
    AdminPermission.MANAGE_SHUTTLE_SCHEDULE,
    AdminPermission.MANAGE_ADMINS,
    AdminPermission.INVITE_ADMINS,
    AdminPermission.CHANGE_ADMIN_ROLE,
    AdminPermission.VIEW_AUDIT_LOGS,
    AdminPermission.MANAGE_SETTINGS,
  ],
  admin: [
    AdminPermission.READ_USERS,
    AdminPermission.CREATE_USERS,
    AdminPermission.EDIT_USERS,
    AdminPermission.DELETE_USERS,
    AdminPermission.BAN_USERS,
    AdminPermission.READ_DIVE_SITES,
    AdminPermission.CREATE_DIVE_SITES,
    AdminPermission.EDIT_DIVE_SITES,
    AdminPermission.DELETE_DIVE_SITES,
    AdminPermission.PUBLISH_DIVE_SITES,
    AdminPermission.READ_SHUTTLES,
    AdminPermission.CREATE_SHUTTLES,
    AdminPermission.EDIT_SHUTTLES,
    AdminPermission.DELETE_SHUTTLES,
    AdminPermission.MANAGE_SHUTTLE_SCHEDULE,
    AdminPermission.VIEW_AUDIT_LOGS,
  ],
  moderator: [
    AdminPermission.READ_USERS,
    AdminPermission.BAN_USERS,
    AdminPermission.READ_DIVE_SITES,
    AdminPermission.CREATE_DIVE_SITES,
    AdminPermission.EDIT_DIVE_SITES,
    AdminPermission.PUBLISH_DIVE_SITES,
    AdminPermission.READ_SHUTTLES,
    AdminPermission.VIEW_AUDIT_LOGS,
  ],
  viewer: [
    AdminPermission.READ_USERS,
    AdminPermission.READ_DIVE_SITES,
    AdminPermission.READ_SHUTTLES,
    AdminPermission.VIEW_AUDIT_LOGS,
  ],
};

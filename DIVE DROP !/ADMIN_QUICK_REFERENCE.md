# Admin Panel - Quick Reference

## Access Points

| Page | URL | Purpose |
|------|-----|---------|
| Login | `/en/admin/login` or `/he/admin/login` | Admin authentication |
| Dashboard | `/en/admin` or `/he/admin` | Overview & stats |
| Users | `/en/admin/users` | User management |
| Dive Sites | `/en/admin/dive-sites` | Dive location management |
| Shuttles | `/en/admin/shuttles` | Fleet management |
| Settings | `/en/admin/settings` | Admin settings |

## Demo Credentials

Email: admin@example.com
Password: password123

## Quick Start

1. npm install
2. npm run dev
3. Visit http://localhost:3000/en/admin/login

## File Locations

- Pages: src/app/[locale]/admin/*/page.tsx
- Components: src/app/[locale]/admin/*/components/
- Store: src/lib/stores/adminStore.ts
- Types: src/lib/types/admin.ts
- Validation: src/lib/validation/adminValidation.ts
- Actions: src/app/[locale]/admin/actions/adminActions.ts
- Database: src/lib/db/migrations/001_create_admin_tables.sql
- Translations: src/i18n/messages/en|he/admin.json

## Common Tasks

### Add Page
1. mkdir src/app/[locale]/admin/new-page
2. Create page.tsx with component
3. Add navigation item in AdminNavigation.tsx
4. Add translations

### Add Form Field
1. Update Zod schema
2. Update type definition
3. Add form input in Modal
4. Add translations

### Use Store
```typescript
import { useAdminStore } from '@/lib/stores/adminStore';
const { users, addUser } = useAdminStore();
```

### Server Action
```typescript
'use server';
export async function myAction(input): Promise<ApiResponse<T>> {
  // Implementation
}
```

## Styling

Primary: bg-blue-600
Success: bg-green-600
Danger: bg-red-600
Dark mode: dark:bg-slate-800

## Common Issues

- Blank pages: Check console, verify [locale] path
- Forms not submitting: Check validation, verify action import
- Store not updating: Check action called, verify import
- Translations missing: Check JSON, restart dev server

## Database

PostgreSQL setup:
psql < src/lib/db/migrations/001_create_admin_tables.sql

Docker setup:
docker-compose -f docker-compose.admin.yml up

## Commands

npm run dev          # Start dev
npm run build        # Build
npm run lint         # Lint

---
Version: 1.0.0

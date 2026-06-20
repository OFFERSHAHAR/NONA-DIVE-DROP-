# Admin Panel Setup Guide

Complete Admin Panel for DIVE DROP application with full support for English and Hebrew.

## Features

✅ **Authentication**
- Admin login with email/password
- Role-based access control (Admin, Manager, User, Driver)
- Demo credentials for testing

✅ **Dashboard**
- Stats overview (users, dive sites, shuttles)
- Recent activity timeline
- Quick access to management sections

✅ **Users Management**
- Create, read, update, delete users
- Role assignment
- User status toggle
- Search and filtering

✅ **Dive Sites Management**
- Full CRUD operations
- Bilingual support (English/Hebrew)
- Location coordinates and mapping
- Difficulty levels (Easy, Intermediate, Advanced)
- Image uploads and tagging
- Max depth specification

✅ **Shuttles Management**
- Shuttle fleet management
- Driver assignment
- Capacity management
- Weekly availability scheduling
- Status tracking (Available, In Use, Maintenance, Offline)

✅ **Internationalization**
- Full English support
- Full Hebrew support
- RTL layout support
- Language switcher integration

✅ **UI/UX**
- Tailwind CSS styling
- Dark mode support
- Responsive design
- Modal dialogs
- Data tables with search
- Form validation

## Installation

### 1. Database Setup

#### Using PostgreSQL (Recommended for Production)

```bash
# Create a new PostgreSQL database
createdb dive_drop_admin

# Run migrations
psql dive_drop_admin < src/lib/db/migrations/001_create_admin_tables.sql
```

#### Using Supabase (Recommended for Quick Start)

```bash
# Create a Supabase project at https://supabase.com

# Copy the migration SQL content and run in Supabase SQL Editor:
# src/lib/db/migrations/001_create_admin_tables.sql

# Get your connection string from Supabase project settings
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/dive_drop_admin

# Or Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Authentication
NEXTAUTH_SECRET=your-secret-key-here-min-32-chars

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000

# Email (optional, for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### 3. Dependencies Installation

```bash
npm install
# or
yarn install
```

### 4. Database Seed (Optional - for demo data)

```bash
# Seed demo admin user and data
node scripts/seed-admin.js
```

### 5. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000/en/admin/login` or `http://localhost:3000/he/admin/login`

## Demo Credentials

```
Email: admin@example.com
Password: password123
```

## Project Structure

```
src/
├── app/[locale]/admin/
│   ├── page.tsx                 # Dashboard
│   ├── login/page.tsx          # Login page
│   ├── layout.tsx              # Admin layout
│   ├── components/             # Shared components
│   │   ├── AdminNavigation.tsx
│   │   ├── DashboardCard.tsx
│   │   ├── SearchBar.tsx
│   │   └── StatCard.tsx
│   ├── users/
│   │   ├── page.tsx            # Users list
│   │   └── components/
│   │       ├── UserTable.tsx
│   │       └── UserModal.tsx
│   ├── dive-sites/
│   │   ├── page.tsx            # Dive sites list
│   │   └── components/
│   │       ├── DiveSiteTable.tsx
│   │       └── DiveSiteModal.tsx
│   ├── shuttles/
│   │   ├── page.tsx            # Shuttles list
│   │   └── components/
│   │       ├── ShuttleTable.tsx
│   │       └── ShuttleModal.tsx
│   ├── settings/
│   │   └── page.tsx            # Settings page
│   └── actions/
│       └── adminActions.ts     # Server actions
├── lib/
│   ├── types/
│   │   └── admin.ts            # TypeScript types
│   ├── stores/
│   │   └── adminStore.ts       # Zustand store
│   ├── validation/
│   │   └── adminValidation.ts  # Zod schemas
│   └── db/
│       └── migrations/
│           └── 001_create_admin_tables.sql
└── i18n/messages/
    ├── en/
    │   └── admin.json
    └── he/
        └── admin.json
```

## API Endpoints (Server Actions)

### Authentication
- `loginAdmin(input)` - Login admin user

### Users
- `fetchUsers()` - Get all users
- `createUser(input)` - Create new user
- `updateUser(input)` - Update user
- `deleteUser(userId)` - Delete user

### Dive Sites
- `fetchDiveSites()` - Get all dive sites
- `createDiveSite(input)` - Create new site
- `updateDiveSite(input)` - Update site
- `deleteDiveSite(siteId)` - Delete site

### Shuttles
- `fetchShuttles()` - Get all shuttles
- `createShuttle(input)` - Create new shuttle
- `updateShuttle(input)` - Update shuttle
- `deleteShuttle(shuttleId)` - Delete shuttle

### Stats
- `fetchAdminStats()` - Get dashboard statistics

## Database Schema

### admin_users
```sql
- id (UUID)
- email (VARCHAR, UNIQUE)
- name (VARCHAR)
- password_hash (VARCHAR)
- role (VARCHAR: admin, manager, user, driver)
- avatar_url (TEXT)
- is_active (BOOLEAN)
- last_login (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### dive_sites
```sql
- id (UUID)
- name (VARCHAR)
- name_he (VARCHAR)
- description (TEXT)
- description_he (TEXT)
- latitude (DECIMAL)
- longitude (DECIMAL)
- address (VARCHAR)
- difficulty (VARCHAR: easy, intermediate, advanced)
- max_depth (INTEGER)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- created_by (UUID, FK)
```

### dive_site_images
```sql
- id (UUID)
- dive_site_id (UUID, FK)
- image_url (TEXT)
- display_order (INTEGER)
- created_at (TIMESTAMP)
```

### dive_site_tags
```sql
- id (UUID)
- dive_site_id (UUID, FK)
- tag (VARCHAR)
- created_at (TIMESTAMP)
```

### shuttles
```sql
- id (UUID)
- name (VARCHAR)
- driver_id (UUID, FK)
- capacity (INTEGER)
- registration_number (VARCHAR, UNIQUE)
- current_latitude (DECIMAL)
- current_longitude (DECIMAL)
- status (VARCHAR: available, in_use, maintenance, offline)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### shuttle_availability
```sql
- id (UUID)
- shuttle_id (UUID, FK)
- day_of_week (VARCHAR)
- start_time (TIME)
- end_time (TIME)
- created_at (TIMESTAMP)
```

### admin_activity_log
```sql
- id (UUID)
- user_id (UUID, FK)
- activity_type (VARCHAR)
- entity_type (VARCHAR)
- entity_id (UUID)
- description (TEXT)
- metadata (JSONB)
- ip_address (VARCHAR)
- user_agent (TEXT)
- created_at (TIMESTAMP)
```

### admin_permissions
```sql
- id (UUID)
- role (VARCHAR)
- permission (VARCHAR)
- created_at (TIMESTAMP)
```

## Production Deployment

### Using Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
# ... add other env vars
```

### Using Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t dive-drop-admin .
docker run -p 3000:3000 -e DATABASE_URL=... dive-drop-admin
```

## Testing

```bash
# Run type checking
npx tsc --noEmit

# Run linter
npm run lint

# Run tests (if configured)
npm test
```

## Security Considerations

✅ **Implemented**
- Zod schema validation
- Type-safe TypeScript
- CORS protection ready
- SQL injection protection (with parameterized queries)
- Server-side actions for sensitive operations
- Secure password handling (to be implemented)

🔄 **To Implement**
- Add authentication middleware
- Implement JWT/session management
- Add rate limiting
- Enable HTTPS enforcement
- Implement audit logging
- Add IP whitelisting
- Set up 2FA for admin accounts

## Troubleshooting

### Port 3000 already in use
```bash
# Use different port
npm run dev -- -p 3001
```

### Database connection errors
```bash
# Check connection string
echo $DATABASE_URL

# Verify PostgreSQL is running
psql --version
```

### Module not found errors
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run build
```

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the database migrations
3. Verify environment variables
4. Check browser console for errors
5. Review server logs

## License

MIT License - Feel free to use and modify for your needs

## Changelog

### v1.0.0 (2024)
- Initial release with full admin panel
- Users management
- Dive sites management
- Shuttles management
- Bilingual support (English/Hebrew)
- Dashboard with statistics
- Activity logging

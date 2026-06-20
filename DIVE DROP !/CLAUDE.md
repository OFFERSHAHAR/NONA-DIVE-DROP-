# DIVE DROP Project Documentation

**Last Updated:** June 20, 2026  
**Version:** 1.0  
**Status:** Production-Ready

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Overview](#project-overview)
3. [Architecture](#architecture)
4. [Tech Stack](#tech-stack)
5. [Key Features](#key-features)
6. [Security Implementation](#security-implementation)
7. [Development Workflow](#development-workflow)
8. [Documentation Index](#documentation-index)

---

## Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- Supabase account (local or cloud)
- Anthropic API key (for feedback system)

### Setup

```bash
# Clone and install
git clone <repository>
cd "DIVE DROP !"
npm install

# Environment setup
cp .env.example .env.local

# Add to .env.local:
# NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
# SUPABASE_SERVICE_ROLE_KEY=your_service_key
# ANTHROPIC_API_KEY=your_api_key

# Development server
npm run dev
# Opens at http://localhost:3000
```

### First-Time Onboarding (30 minutes)

1. **Read this file** (5 min) - You're here!
2. **Review ARCHITECTURE.md** (10 min) - Understand system design
3. **Read SECURITY_CHECKLIST.md** (5 min) - Know security requirements
4. **Check DEPLOYMENT_PROCEDURES.md** (5 min) - Know release process
5. **Clone/fork security modules** (5 min) - Copy security code

---

## Project Overview

### What is DIVE DROP?

DIVE DROP is a buddy-finding and service provider platform for dive enthusiasts, built in Hebrew (מצא באדי). The platform enables:

- **Buddies:** Find dive partners matching your skill level and schedule
- **Service Providers:** List and manage diving services (instruction, equipment rental, transportation)
- **Privacy First:** Contact information protected by mutual consent flows
- **Community Safe:** Blocking, reporting, and moderation built-in

### Core Statistics

| Metric | Value |
|--------|-------|
| **TypeScript Files** | 493 |
| **Codebase Type** | Full-stack web (React + Node.js) |
| **Framework** | Next.js 16.2.9 |
| **Database** | Supabase (PostgreSQL) |
| **Frontend** | React 19.2.4 + TailwindCSS 4 |
| **Security Framework** | Custom auth system + RLS policies |
| **Testing** | Vitest + Playwright |

---

## Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                   CLIENT (React Components)                  │
│  - Listings (create, view, filter)                          │
│  - User profiles & account settings                         │
│  - Contact reveal workflow                                  │
│  - Blocking & reporting UI                                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              SERVER ACTIONS & API ROUTES                     │
│  - Authorization checks (permissions.ts)                    │
│  - Auth middleware (auth-middleware.ts)                     │
│  - Business logic (contact-reveal-service.ts, etc.)         │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│             SUPABASE DATABASE (PostgreSQL)                   │
│  - Row Level Security (RLS) policies                         │
│  - Tables: users, listings, interests, contact_reveals,     │
│    blocks, reports, audit_log, feedback                     │
└─────────────────────────────────────────────────────────────┘
```

### Three Layers of Security

1. **Application Layer** (TypeScript)
   - Permission matrix validation
   - Auth context enforcement
   - Input validation and sanitization

2. **Server Layer** (Next.js)
   - Server actions with authorization
   - Rate limiting
   - CORS validation

3. **Database Layer** (RLS)
   - Row-level security policies
   - Field-level visibility control
   - Automatic query filtering

### File Organization

```
src/
├── app/
│   ├── [locale]/                    # Localized routes (Hebrew)
│   │   ├── admin/                   # Admin dashboard
│   │   ├── auth/                    # Authentication pages
│   │   ├── find-buddy/              # Main buddy search
│   │   └── find-service/            # Service provider search
│   ├── api/
│   │   ├── admin/                   # Admin endpoints
│   │   └── auth/                    # Auth endpoints
│   └── middleware.ts                # Global middleware
├── components/
│   ├── ui/                          # Reusable UI components
│   ├── pages/                       # Page-level components
│   └── [feature]/                   # Feature-specific components
├── lib/
│   ├── security/                    # Security modules (see below)
│   ├── auth/                        # Authentication logic
│   ├── supabase/                    # Database client
│   ├── email/                       # Email services
│   ├── payments/                    # Payment integration
│   └── [domain]/                    # Feature domains
├── store/                           # Zustand state management
├── styles/                          # Global styles
└── __tests__/                       # Test files
```

---

## Tech Stack

### Core Frontend
- **React 19.2.4** - UI framework
- **Next.js 16.2.9** - React framework with SSR/SSG
- **TailwindCSS 4** - Utility-first CSS
- **TypeScript 5** - Type safety
- **Zustand** - State management

### Backend & Database
- **Supabase** - PostgreSQL database + Auth + Realtime
- **Jose** - JWT token handling
- **Resend** - Email delivery
- **Next.js Server Actions** - Server-side RPC

### Security & Validation
- **Zod** - Runtime schema validation
- **Custom Auth System** - Role-based permissions
- **Row-Level Security (RLS)** - Database access control
- **Rate Limiting** - Request throttling
- **CORS & Security Headers** - HTTP security

### Testing & Quality
- **Vitest** - Unit & integration tests
- **Playwright** - E2E testing
- **ESLint** - Code linting

### Infrastructure
- **Vercel** - Hosting & CI/CD
- **GitHub Actions** - Automated workflows

---

## Key Features

### For Buddy Seekers

1. **Listings Creation**
   - Create dive trip listings (skill level, location, date)
   - Set max buddy count
   - Manage your listings

2. **Buddy Search**
   - Browse active listings
   - Filter by level, location, date
   - Express interest in listings

3. **Contact Reveal**
   - Request contact info from listing owner
   - Accept/reject contact requests
   - Mutual consent model

4. **Community Controls**
   - Block abusive users
   - Report inappropriate listings
   - Audit trail of all actions

### For Service Providers

1. **Service Listing**
   - List diving services (instruction, rental, transport)
   - Manage pricing & availability
   - Track inquiries

2. **Provider Directory**
   - Featured provider profiles
   - Service categorization
   - Rating system (planned)

### For Administrators

1. **Dashboard**
   - User & listing statistics
   - Abuse reports queue
   - Admin user management

2. **Moderation Tools**
   - Review user reports
   - Ban abusive users
   - Manage service providers

3. **System Health**
   - Database monitoring
   - Performance metrics
   - Audit log inspection

---

## Security Implementation

### Overview

The security system provides three-layer protection:

1. **Permission Matrix** - What roles can do
2. **Auth Middleware** - Enforcement via server actions
3. **RLS Policies** - Enforcement at database level

### Key Security Modules

#### 1. Token Security (`token-security.ts`)
- HttpOnly/Secure/SameSite cookies
- Refresh token rotation (prevents token reuse attacks)
- Token revocation list
- Token family validation (detects compromised tokens)

**Key Functions:**
- `setTokenCookie()` - Set secure token
- `getTokenCookie()` - Retrieve token
- `revokeToken()` - Add to revocation list
- `validateTokenFamily()` - Detect reuse attacks

#### 2. Rate Limiting (`rate-limiter.ts`)
- Per-IP rate limiting
- Per-user rate limiting
- Per-endpoint custom limits
- Account lockout after repeated failures

**Configuration Example:**
```javascript
// Login: 5 attempts per 5 minutes, then 15-min lockout
'POST /api/auth/login': {
  maxRequests: 5,
  windowSeconds: 300,
  lockoutThreshold: 5,
  lockoutDurationSeconds: 900,
}
```

#### 3. CORS & Origin Validation (`cors.ts`)
- Origin whitelist per environment
- Preflight request handling
- Credential validation
- Secure cross-origin communication

**Environment Config:**
```javascript
development: ['http://localhost:3000']
production: ['https://dive-drop.com', 'https://www.dive-drop.com']
```

#### 4. Security Headers (`headers.ts`)
- HSTS (force HTTPS for 1 year)
- CSP (prevent XSS and injection)
- X-Frame-Options (prevent clickjacking)
- Permissions Policy (disable risky browser features)

**Policies by Page Type:**
- `default` - General pages
- `admin` - Stricter CSP
- `public` - Analytics/ads allowed

#### 5. Input Validation (`input-validation.ts`)
- Schema validation with Zod
- Sanitization of user input
- Type coercion
- Error normalization

#### 6. Route Authorization (`route-auth.ts`)
- Permission-based access control
- Resource ownership validation
- Role-based endpoint protection

#### 7. Session Management (`session-manager.ts`)
- Session storage in Redis/database
- Session expiration
- Multi-device logout
- Session auditing

#### 8. Contact Reveal Service (`contact-reveal-service.ts`)
- Mutual consent workflow
- Contact info visibility control
- Reveal history tracking
- Privacy enforcement

---

## Development Workflow

### Branch Strategy

```
main (production) ← release/X.X.X ← develop ← feature/TASK-123
```

### Commit Format

```
type: description

type: one of [feat, fix, docs, style, refactor, test, chore]
scope: optional, e.g. (auth), (security), (payments)
example: feat(security): add token rotation
```

### Code Review Checklist

- [ ] Security review (auth, validation, RLS)
- [ ] Performance impact assessed
- [ ] Test coverage ≥ 80%
- [ ] Documentation updated
- [ ] No hardcoded secrets
- [ ] OWASP Top 10 risks mitigated

### Testing

```bash
# Unit tests
npm run test

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e

# UI test viewer
npm run test:ui
```

### Environment Variables

**Development (`.env.local`)**
```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_test_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
ANTHROPIC_API_KEY=your_api_key
```

**Production (Vercel)**
```
All secrets stored in Vercel Environment Variables
Never commit .env files
```

---

## Documentation Index

### For Different Roles

#### Product Managers
- Start with: `IMPLEMENTATION_ROADMAP.md` (4-week plan)
- Then read: `ARCHITECTURE.md` (system design)

#### Engineers
- Start with: `ARCHITECTURE.md` (system overview)
- Then read: `SECURITY_CHECKLIST.md` (security requirements)
- Deep dive: Individual security module guides in `SECURITY_MODULES/`

#### DevOps / Deployment Team
- Start with: `DEPLOYMENT_PROCEDURES.md` (release process)
- Then read: `SECURITY_CHECKLIST.md` (pre-launch checks)

#### Security Team
- Start with: `SECURITY_CHECKLIST.md` (quick overview)
- Then read: Individual security module guides
- Reference: `src/lib/security/SECURITY_DESIGN.md` (detailed specs)

### Documentation Files

| File | Purpose | Audience |
|------|---------|----------|
| **CLAUDE.md** | This file - project overview | Everyone |
| **ARCHITECTURE.md** | System design & decisions | Engineers, Tech Leads |
| **IMPLEMENTATION_ROADMAP.md** | 4-week execution plan | PMs, Engineers |
| **SECURITY_CHECKLIST.md** | Pre-launch verification | Security, QA, Ops |
| **DEPLOYMENT_PROCEDURES.md** | Release & rollback process | DevOps, Ops |
| **SECURITY_MODULES/** | Individual module guides | Engineers |

### Security Module Guides

Located in `SECURITY_MODULES/`:

```
SECURITY_MODULES/
├── TOKEN_SECURITY.md          # JWT & cookie handling
├── RATE_LIMITING.md           # Request throttling
├── CORS.md                    # Cross-origin handling
├── SECURITY_HEADERS.md        # HTTP headers
├── INPUT_VALIDATION.md        # Data validation
├── ROUTE_AUTHORIZATION.md     # Endpoint protection
├── SESSION_MANAGEMENT.md      # Session control
└── CONTACT_REVEAL.md          # Privacy workflow
```

---

## Common Tasks

### Creating a New Feature

1. Create feature branch from `develop`
2. Implement with server actions + components
3. Add Zod validation
4. Add RLS policies if touching user data
5. Write tests
6. Create PR with checklist
7. Merge to `develop` after review
8. Feature enters next release cycle

### Fixing a Security Bug

1. Create branch from `main` (hotfix)
2. Fix in code + database
3. Add regression test
4. Deploy to staging
5. Test thoroughly
6. Deploy to production
7. Announce to team
8. Create incident report

### Deploying to Production

1. Merge `develop` to `main`
2. Create GitHub release
3. CI/CD automatically deploys to Vercel
4. Monitor error logs
5. Run post-deployment checks
6. Update team

See `DEPLOYMENT_PROCEDURES.md` for detailed steps.

---

## Compliance & Standards

### GDPR
- Contact info requires explicit consent (mutual reveal)
- Right to delete (account deletion)
- Data portability (export)

### CCPA
- Transparency (audit logs visible to users)
- User control (blocking, deletion)
- Opt-out mechanisms

### SOC 2 Type II
- Complete audit trail
- Access control via RLS
- Incident monitoring
- Annual certification

### Security Standards
- OWASP Top 10 compliance
- CWE/SANS Top 25 coverage
- NIST Cybersecurity Framework alignment

---

## Support & Resources

### Getting Help

1. **Code Question?** → Check relevant security module guide in `SECURITY_MODULES/`
2. **Architecture Question?** → See `ARCHITECTURE.md`
3. **Deployment Issue?** → See `DEPLOYMENT_PROCEDURES.md`
4. **Security Concern?** → See `SECURITY_CHECKLIST.md`

### Key Contacts

| Role | Responsibility |
|------|-----------------|
| **Tech Lead** | Architecture decisions |
| **Security Officer** | Security reviews, compliance |
| **DevOps Lead** | Deployment, infrastructure |
| **Product Manager** | Feature prioritization |

---

## Roadmap & Next Steps

### Completed (v1.0)
- ✅ Core buddy search & listing system
- ✅ Contact reveal with mutual consent
- ✅ Blocking & reporting system
- ✅ Three-layer security architecture
- ✅ Rate limiting & CORS
- ✅ Comprehensive security headers
- ✅ Session management
- ✅ Audit logging

### In Progress (v1.1)
- Rating system for service providers
- Advanced search filters
- Real-time notifications
- Payment integration completion

### Planned (v1.2+)
- Mobile app
- Video verification for service providers
- Insurance integration
- Advanced analytics dashboard

See `IMPLEMENTATION_ROADMAP.md` for 4-week execution plan.

---

## Quick Reference

### Most Important Files

```
# Security
src/lib/security/
├── permissions.ts           # Role & permission definitions
├── auth-middleware.ts       # Auth context & authorization
├── token-security.ts        # Token handling
├── rate-limiter.ts          # Rate limiting
└── rls-policies.sql         # Database RLS setup

# Core Features
src/app/actions/
├── listings.ts              # Listing CRUD
├── interests.ts             # Express interest
├── contact-reveal.ts        # Contact reveal workflow
├── blocking.ts              # Block/unblock users
└── reports.ts               # Abuse reporting
```

### Essential Commands

```bash
npm run dev                   # Start dev server
npm run test                  # Run tests
npm run build                 # Build for production
npm run lint                  # Check code quality
npm run test:coverage         # Coverage report
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-20 | Initial release with complete security system |
| 0.5 | 2026-06-15 | Alpha with basic features |

---

## Document Status

**Current:** Production-Ready (v1.0)  
**Last Review:** 2026-06-20  
**Next Review:** 2026-07-20  
**Maintained By:** Engineering Team

---

**For detailed implementation specifics, see the specialized documentation files:**
- Architecture decisions → `ARCHITECTURE.md`
- Step-by-step execution → `IMPLEMENTATION_ROADMAP.md`
- Pre-launch checklist → `SECURITY_CHECKLIST.md`
- Release procedures → `DEPLOYMENT_PROCEDURES.md`
- Security module details → `SECURITY_MODULES/*.md`

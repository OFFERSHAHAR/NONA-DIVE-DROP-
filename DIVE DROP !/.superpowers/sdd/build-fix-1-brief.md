# Task 1: Fix Equipment Route Handlers

**Context:** Next.js 16 changed route handler signatures. The `params` parameter should now be `Promise<{ ... }>` instead of `{ ... }`. Several equipment API routes have outdated signatures causing TypeScript compilation errors.

**Files to Fix:**
- `src/app/api/equipment/listings/route.ts`
- `src/app/api/equipment/listings/[id]/route.ts`
- `src/app/api/equipment/listings/mine/route.ts`
- `src/app/api/equipment/rentals/route.ts`
- `src/app/api/equipment/rentals/[id]/route.ts`
- `src/app/api/equipment/rentals/payment/route.ts`
- `src/app/api/equipment/reviews/route.ts`

**Fix Pattern:**

Change from:
```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: { [key: string]: string } }
) {
  const { [key] } = params;
```

To:
```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ [key: string]: string }> }
) {
  const { [key] } = await params;
```

**Steps:**
1. Read each file
2. Update function signature: `{ params }: { params: { ... } }` → `{ params }: { params: Promise<{ ... }> }`
3. Update usage: `const { x } = params` → `const { x } = await params`
4. Commit with message: "fix: Update route handlers to use async params (Next.js 16)"

**Test:** TypeScript should compile without errors for these files.

**Report Location:** `.superpowers/sdd/build-fix-1-report.md`

# Authorization Quick Start Guide

## 🚀 5-Minute Overview

### What Was Built
A complete authorization system with:
- ✅ User status display in Header
- ✅ Protected page middleware 
- ✅ Login/register redirects
- ✅ Role-based access control
- ✅ Error pages (401/403)
- ✅ Bilingual support (EN/HE)

---

## 📍 Show User Status (Already Done!)

The Header now shows:
- **Logged Out:** Login and Register buttons
- **Logged In:** User avatar, name, settings, logout

No action needed - it's in the Header!

---

## 🔒 Protect Your Pages

### Step 1: Wrap your page
```tsx
import { ProtectedPageWrapper } from '@/components/ProtectedPageWrapper';

export default function MyPage() {
  return (
    <ProtectedPageWrapper>
      <h1>This is protected!</h1>
      {/* Your content */}
    </ProtectedPageWrapper>
  );
}
```

### Step 2: Server-side (Optional)
Also add route to `src/middleware.ts`:
```typescript
const PROTECTED_ROUTES = [
  '/my-protected-route',  // ← Add your route
];
```

---

## 👤 Access User Data

In any client component:
```tsx
import { useAuthStore } from '@/store/authStore';

export function MyComponent() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  return (
    <div>
      {isAuthenticated && <p>Hello {user?.email}</p>}
    </div>
  );
}
```

---

## 🔑 Admin Only Pages

```tsx
<ProtectedPageWrapper requiredRole="admin">
  <AdminPanel />
</ProtectedPageWrapper>
```

**To make someone admin:**
1. Go to Supabase Dashboard
2. Auth → Users
3. Find user
4. Click "User Metadata"
5. Add: `{ "role": "admin" }`

---

## 🧪 Test It

1. **Logout** - Click logout in Header
2. **Try protected page** - Go to `/find-buddy`
3. **See error** - Should show 401 Unauthorized
4. **Login** - Click Login button
5. **Try again** - Should work now!

---

## 🗂️ File Map

| File | Purpose |
|------|---------|
| `Header.tsx` | Shows user status |
| `UserStatus.tsx` | Login/logout buttons + user info |
| `ProtectedPageWrapper.tsx` | Wraps pages that need login |
| `middleware.ts` | Server-side route protection |
| `useAuthInit.ts` | Fetches user on page load |
| `AuthProvider.tsx` | Initializes auth (in layout) |
| `unauthorized.tsx` | 401 error page |
| `forbidden.tsx` | 403 error page |

---

## ✅ Already Protected Routes

These routes auto-redirect if not logged in:
- `/find-buddy`
- `/bookings`
- `/my-dives`
- `/my-profile`
- `/settings`
- `/free-diving/my-trainings`
- `/equipment/rentals`
- `/admin/*`

---

## 📖 Detailed Docs

See `AUTHORIZATION.md` for:
- Complete API reference
- Permission matrix
- Troubleshooting
- Advanced usage

---

## 🎯 Common Tasks

### Show content only if logged in
```tsx
const { isAuthenticated } = useAuthStore();

return isAuthenticated ? <Protected /> : <Public />;
```

### Redirect to login
```tsx
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

const router = useRouter();
const locale = useLocale();

router.push(`/${locale}/auth/login`);
```

### Check if user owns a resource
```tsx
const user = useAuthStore((state) => state.user);

if (user?.id === resource.owner_id) {
  // User owns this
}
```

### Get user email
```tsx
const user = useAuthStore((state) => state.user);
const email = user?.email;
```

---

## 🆘 Troubleshooting

### User status not showing
- Make sure `AuthProvider` wraps your content (in `layout.tsx`)
- Check browser console for errors

### Still seeing login page after login
- Clear browser cookies
- Check Supabase session is valid
- Verify page has `ProtectedPageWrapper`

### Admin routes not working
- Make sure user has `role: "admin"` in Supabase metadata
- Clear cache and reload

### Hydration errors
- These are prevented by `useEffect` in `UserStatus`
- If you see them, check console

---

## 🚀 Next Steps

1. ✅ Authorization system is live
2. Test protected pages
3. Update any pages that need protection
4. Add email verification (optional)
5. Set up 2FA for admins (optional)

---

**Ready to go! Start protecting your pages!** 🎯

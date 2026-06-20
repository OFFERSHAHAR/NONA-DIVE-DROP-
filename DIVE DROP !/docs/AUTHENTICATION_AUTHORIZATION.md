# Authentication & Authorization ב- DIVE DROP

## תוכן עניינים
1. [תרחיש כללי](#תרחיש-כללי)
2. [Authentication - כניסה למערכת](#authentication---כניסה-למערכת)
3. [Authorization - הרשאות](#authorization---הרשאות)
4. [תפקידים והרשאות](#תפקידים-והרשאות)
5. [הגנת נתונים](#הגנת-נתונים)
6. [תכונות אבטחה](#תכונות-אבטחה)
7. [דוגמאות זרימה](#דוגמאות-זרימה)
8. [פתרון בעיות](#פתרון-בעיות)

---

## תרחיש כללי

### מה זה Authentication?
**Authentication** (אימות / זיהוי) = התחקות שהמשתמש הוא כן מי שהוא טוען שהוא.

דוגמה:
- משתמש מכניס דוא"ל וסיסמה
- המערכת מאמתת שהסיסמה נכונה
- המערכת מנפקת Token (כרטיס כניסה) שמאשר שהמשתמש מזוהה

### מה זה Authorization?
**Authorization** (הרשאות / אישור) = ההחלטה מה המשתמש יכול לעשות עכשיו.

דוגמה:
- משתמש רגיל יכול להציג עניין בהערכה (Listing)
- בעל הערכה יכול לפתוח/לסגור את הערכה שלו
- Admin יכול לאשר הערכות ולמודרט משתמשים

### איך הם עובדים ביחד?

```
משתמש → כניסה דוא"ל וסיסמה → Authentication ✓ → JWT Token
                                              ↓
                                    Authorization Check
                                    (למה המשתמש רוצה לעשות?)
                                              ↓
                                    בדיקת הרשאות (Permissions)
                                              ↓
                          ✓ מותר / ✗ אסור גישה
```

---

## Authentication - כניסה למערכת

### טכנולוגיה: Supabase Auth

DIVE DROP משתמשת ב- **Supabase Auth** - שירות אימות ענן מאובטח:

#### 1. הרשמה חדשה (Sign Up)

```typescript
// src/lib/auth/actions.ts
export async function registerAction(data: RegisterInput) {
  const supabase = await createClient();
  
  const { error } = await supabase.auth.signUp({
    email: validatedData.email,
    password: validatedData.password,
    options: {
      data: {
        first_name: validatedData.firstName,
        last_name: validatedData.lastName,
      },
    },
  });
  
  // משלחת דוא"ל אימות
  return { success: true };
}
```

**מה קורה:**
1. משתמש מכניס דוא"ל, סיסמה, שם מלא
2. המערכת בדוקה שהדוא"ל לא קיים כבר
3. הסיסמה מוצפנת (bcrypt) - לא שמורה בטקסט
4. Supabase שולח דוא"ל אימות
5. רק אחרי קליק על הקישור בדוא"ל החשבון פעיל

#### 2. כניסה (Login)

```typescript
export async function loginAction(data: LoginInput) {
  const supabase = await createClient();
  
  const { error } = await supabase.auth.signInWithPassword({
    email: validatedData.email,
    password: validatedData.password,
  });
  
  return { success: true };
}
```

**מה קורה:**
1. משתמש מכניס דוא"ל וסיסמה
2. המערכת משווה הסיסמה המוצפנת בדאטהבייס
3. אם נכון → Supabase מנפקת JWT Token

### JWT Token (כרטיס כניסה)

**JWT** (JSON Web Token) = טוקן המכיל מידע על המשתמש, חתום בצורה מאובטחת.

#### מבנה Token:

```
Header.Payload.Signature

Header:     { "alg": "HS256", "type": "JWT" }
Payload:    { "sub": "user-id", "email": "user@example.com", "exp": 1234567890 }
Signature:  hmacSHA256(header.payload, secret_key)
```

#### תוקף Token:
- **Access Token**: תוקף **1 שעה** (60 דקות)
- **Refresh Token**: תוקף **7 ימים**

### Session Management (ניהול הפעילות)

```typescript
// src/store/authStore.ts - Zustand store
interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
}
```

**איך זה עובד:**
1. כשמשתמש נכנס → Token שמור בעוגיה (Cookie)
2. בכל בקשה (API Request) → Token נשלח אוטומטית
3. המערכת בדוקה את Token
4. אם Token תקף → בקשה מאושרת
5. אם Token פג → משתמש מתנותק אוטומטית

### Logout (יציאה)

```typescript
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Token מחוק, פעילות מסתיימת
  return { success: true };
}
```

---

## Authorization - הרשאות

### מטריצת הרשאות

הערכת הזכויות של כל משתמש בהתאם לתפקידו:

```typescript
// src/lib/security/permissions.ts

enum UserRole {
  ANONYMOUS = 'anonymous',         // לא רשום
  REGISTERED = 'registered',        // רשום, דוא"ל אומת
  LISTING_OWNER = 'listing_owner'  // בעל הערכה
}

enum ResourceAction {
  VIEW_LISTING = 'view_listing',
  CREATE_LISTING = 'create_listing',
  UPDATE_LISTING = 'update_listing',
  DELETE_LISTING = 'delete_listing',
  VIEW_CONTACT_INFO = 'view_contact_info',
  REVEAL_CONTACT = 'reveal_contact',
  BLOCK_USER = 'block_user',
}
```

### טבלת הרשאות

| פעולה | Anonymous | Registered | Listing Owner | Admin |
|------|-----------|-----------|---------------|-------|
| צפייה בהערכה | ✓ | ✓ | ✓ | ✓ |
| יצירת הערכה | ✗ | ✓ | ✓ | ✓ |
| עריכת הערכה שלי | ✗ | ✗ | ✓ | ✓ |
| מחיקת הערכה שלי | ✗ | ✗ | ✓ | ✓ |
| ביטוי עניין | ✗ | ✓ | ✓ | ✓ |
| צפייה בדוא"ל הבעלים | ✗ | ✗ | ✓ (אחרים) | ✓ |
| חסימת משתמש | ✗ | ✓ | ✓ | ✓ |
| גישה ל-Admin Panel | ✗ | ✗ | ✗ | ✓ |

### בדיקת הרשאות

```typescript
export function hasPermission(role: UserRole, action: ResourceAction): boolean {
  return PERMISSION_MATRIX[role]?.has(action) ?? false;
}

// שימוש:
if (hasPermission(userRole, ResourceAction.UPDATE_LISTING)) {
  // לעדכן הערכה
} else {
  throw new UnauthorizedError('אינך מורשה');
}
```

### Row-Level Security (RLS)

RLS = כללי אבטחה ברמת שורה בדאטהבייס:

```sql
-- רק Super Admin יכול להציג את רשימת כל ה-Admins
CREATE POLICY admin_users_super_admin_select
  ON admin_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.role = 'super_admin'
      AND au.is_active = true
    )
  );

-- משתמש יכול לראות רק שלו
CREATE POLICY admin_users_self_select
  ON admin_users FOR SELECT
  USING (user_id = auth.uid());
```

**למה RLS חשוב?**
- אפילו אם מישהו מצליח לחמוק מבדיקת ה-Backend
- הדאטהבייס לא יאפשר גישה לשורות שאינן שלו
- שכבה נוספת של הגנה

---

## תפקידים והרשאות

### 1. ANONYMOUS משתמש (אורח)
- **מי:** לא רשום, לא התחבר
- **יכול:**
  - צפייה בהערכות ציבוריות (בלי דוא"ל/טלפון)
  - עיון בפרופיל משתמשים

- **לא יכול:**
  - יצירת הערכה
  - ביטוי עניין
  - גישה למידע קשור

### 2. REGISTERED משתמש (רשום)
- **מי:** רשום, אימת דוא"ל
- **יכול:**
  - יצירת הערכות
  - ביטוי עניין בהערכות אחרות
  - חסימת משתמש
  - צפייה בפרופיל משתמשים

- **לא יכול:**
  - צפייה בדוא"ל/טלפון בלי הסכמה הדדית
  - עריכת הערכות של אחרים

### 3. LISTING OWNER (בעל הערכה)
- **מי:** משתמש רשום שיצר הערכה
- **יכול:**
  - כל מה ש-REGISTERED יכול
  - עריכת הערכות שלו
  - מחיקת הערכות שלו
  - צפייה מי בא לחדר (interested users)
  - גילוי דוא"ל/טלפון לאחרים

### 4. ADMIN
- **מי:** מנהל מערכת (יצור ב-Table `admin_users`)
- **תפקידים:**
  - **super_admin**: שליטה מלאה
  - **admin**: ניהול משתמשים והערכות
  - **moderator**: בדיקה ודחיקת תוכן
  - **viewer**: צפייה בלבד

- **יכול (Admin):**
  - עיון בכל הערכה
  - עריכה/מחיקה של הערכות
  - עיון בכל משתמש
  - חסימה של משתמשים
  - גישה ל-Dashboard

- **יכול (Super Admin):**
  - כל מה ש-Admin יכול
  - ניהול מנהלים אחרים
  - שינוי תפקידים
  - ראיית כל הביקורות (Audit Logs)

---

## הגנת נתונים

### סיסמאות
```
Plaintext Password: "Dive123!"
            ↓
        bcrypt Hash
            ↓
Stored in DB: $2b$12$abcd1234...xyz (אי אפשר להחזור)
```

**חשוב:** סיסמאות לא יכול להחזור! רק "שינוי סיסמה" אפשרי.

### דוא"ל וטלפון
- **שמורים בדאטהבייס** בצורה מוצפנת
- **גילוי מהר רק בהסכמה הדדית** (mutual reveal)
- כל גילוי מתורגם ב-Audit Log

### RLS - Row-Level Security
```
משתמש A → יכול לראות רק נתוני משתמש A
משתמש B → יכול לראות רק נתוני משתמש B
Admin    → יכול לראות הכל (עם ביקורת)
```

דוגמה: משתמש לא יכול לשנות הערכה של אחרים, גם אם הוא יוקם API query ישירות.

### HTTPS - כל התנועה מוצפנת
```
משתמש ↔️ HTTPS (TLS 1.3) ↔️ Supabase
        (כל הנתונים מוצפנים בדרך)
```

### Session Tokens
- **httpOnly Cookies**: Token אחסון בעוגיה שלא יכול JavaScript לגשת אליה
- **Secure Flag**: Cookie נשלח רק דרך HTTPS
- **SameSite**: הגנה מפני CSRF (Cross-Site Request Forgery)

---

## תכונות אבטחה

### 1. Rate Limiting (הגבלת קצב)

```sql
-- Supabase tracks login attempts
CREATE TABLE admin_login_attempts (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  ip_address text NOT NULL,
  success boolean NOT NULL,
  created_at timestamp DEFAULT now()
);

-- כללים: עד 5 ניסיונות כושלים בתוך 15 דקות = חסם ה-IP
```

**מטרה:** הגנה מפני brute force (ניסיונות סיסמה רבים)

### 2. IP Tracking

```typescript
// Track IP address of every login
const { ip_address, user_agent } = request.headers;
// שמור ב-admin_sessions table
```

**מטרה:** 
- זיהוי פעילות חשודה
- נוכחות משתמשים מ-IP משונה

### 3. Audit Logging

```typescript
// כל פעולה חשובה מתורגמת:
await supabase.from('admin_audit_logs').insert({
  admin_user_id: userId,
  action: 'listing_created',
  resource_type: 'listing',
  resource_id: listingId,
  ip_address: ipAddress,
  user_agent: userAgent,
  created_at: new Date(),
});
```

**מה מתורגם?**
- יצירת/עריכה/מחיקת הערכות
- גילוי דוא"ל
- חסימת משתמשים
- משנה ב-Admin Panel
- כניסה/יציאה (ב-Admin)

### 4. 2FA - Two-Factor Authentication (אופציונאלי)

```sql
-- Admin 2FA Setup
ALTER TABLE admin_users ADD COLUMN (
  totp_secret text,           -- Secret code ל-Google Authenticator
  totp_enabled boolean,        -- האם מופעל
  backup_codes text[]          -- קודים חירום
);
```

**איך זה עובד:**
1. Admin מפעיל 2FA בהגדרות
2. סורקת QR Code ב-Google Authenticator
3. כשנכנסת, מבקש: דוא"ל + סיסמה + 6-ספרות מהאפליקציה
4. אפילו אם סיסמה דולפה - גם קוד זמני צריך

### 5. Device Fingerprinting

```typescript
// זיהוי רכיב בהתבסס על:
const deviceFingerprint = crypto
  .createHash('sha256')
  .update(userAgent + ipAddress + deviceName)
  .digest('hex');

// שומר בטבלה admin_sessions
// אם משתמש מחזור מ-Device חדש - אפשר להתריע
```

---

## דוגמאות זרימה

### דוגמה 1: משתמש חדש נרשם וכנס

```
1. משתמש מלא טופס הרשמה
   ↓
2. registerAction() בודק נתונים
   ↓
3. supabase.auth.signUp() - שומר דוא"ל + סיסמה מוצפנת
   ↓
4. Supabase שולח דוא"ל אימות
   ↓
5. משתמש לוחץ קישור בדוא"ל
   ↓
6. חשבון מאומת, עכשיו יכול להתחבר
   ↓
7. משתמש מכניס דוא"ל וסיסמה בדף Login
   ↓
8. supabase.auth.signInWithPassword() - תקף סיסמה
   ↓
9. Supabase מנפקת:
   - Access Token (תוקף 1 שעה)
   - Refresh Token (תוקף 7 ימים)
   ↓
10. Token שמור בעוגיה httpOnly
   ↓
11. משתמש עכשיו יכול:
    - יצירת הערכות
    - ביטוי עניין
    - צפייה בפרופיל אחרים
```

### דוגמה 2: משתמש רוצה לערוך הערכה שלו

```
משתמש → לוחץ "עריכה" על הערכה שלו
    ↓
Frontend בודק: "האם הנוכחי הוא בעלים?"
    ↓
Authorization Check:
  - יש להם Token?
  - Token עדיין תקף?
  - Role שלהם = LISTING_OWNER?
  ↓
✓ כן → שדות עריכה מופיעים
✗ לא → "אינך מורשה לעדוד פעולה זו"
    ↓
API Request: PUT /api/listings/{id}
    ↓
Backend בודק:
  - Token תקף?
  - משתמש = בעלים בדאטהבייס?
  ↓
Database RLS Policy:
  - אפילו Backend מנסה - RLS מבטל אם לא בעלים
  ↓
✓ עדכון הצליח
✗ RLS חסם - שגיאה 403 Forbidden
```

### דוגמה 3: Admin גם משתמש רגיל

```
Admin משתמש → משתמש רגיל
             + Admin Privileges
             
Role = 'admin'
→ יכול לערוך כל הערכה
→ יכול לראות כל משתמש
→ יכול להציג דוא"לים

Admin Access → IP Whitelisting יכול להידרש
             → Audit Logging של כל פעולה
             → 2FA חיוני
             → Session Tracking (device + IP)
```

### דוגמה 4: API Request עם Authentication

```
Frontend Code:
═══════════════════════════════════════════
const response = await fetch('/api/listings', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    title: 'Diving at Red Sea',
    description: '...'
  })
});

Backend Handler (Route):
═══════════════════════════════════════════
export async function POST(request: Request) {
  // 1. בדוק Token (Supabase עושה זה אוטומטית)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return Response.json({ error: 'Unauthenticated' }, { status: 401 });
  }
  
  // 2. בדוק הרשאה
  const { role } = await getUserRole(user.id);
  if (!hasPermission(role, ResourceAction.CREATE_LISTING)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // 3. בצע את הפעולה
  const body = await request.json();
  const { data, error } = await supabase
    .from('listings')
    .insert({
      owner_id: user.id,
      title: body.title,
      description: body.description,
    });
  
  // 4. Audit Log
  await auditListingCreation(user.id, data.id, body.title);
  
  return Response.json({ success: true, listing: data });
}
```

---

## פתרון בעיות

### בעיה 1: "סיסמה שכחתי"

```
משתמש לוחץ "שכחתי סיסמה"
    ↓
מכניס דוא"ל
    ↓
Supabase שולח לינק איפוס (תקף 24 שעות)
    ↓
משתמש לוחץ וניתן לך להגדיר סיסמה חדשה
    ↓
סיסמה חדשה מוצפנת
    ↓
כשחוזרים להתחבר - סיסמה חדשה עובדת
```

**מה לא יעבוד:**
- "שלח לי את הסיסמה שלי" - סיסמות לא יכול להחזור
- Supabase לא שומר סיסמה טקסט

### בעיה 2: "Token פג - התנתקתי אוטומטית"

```
משתמש התחבר 1 שעה קודם
    ↓
Token פג רק עכשיו (Access Token 1 שעה)
    ↓
frontend עדיין שומר Refresh Token (7 ימים)
    ↓
בדיקה אוטומטית בקרה הבאה:
  - אם Access Token פג
  - נשתמש Refresh Token
  - נקבל Access Token חדש
    ↓
משתמש לא יודע שקרה זה - יותך המשוכ ללא הפסקה
```

**אם גם Refresh Token פג (7+ ימים):**
```
משתמש חייב להתחבר שוב
התנתקות מתרחשת בדף /auth/login
```

### בעיה 3: "Permission Denied - אינני מורשה"

```
בדיקת סדר הגנה:

1. בדוק: האם התחברתי?
   ✓ יש Token? ✗ → התחבר קודם

2. בדוק: התפקיד שלי?
   - ANONYMOUS? יכול רק צפייה ציבורית
   - REGISTERED? יכול להשתתף
   - ADMIN? יכול הכל
   ✗ → אם תפקיד שלך לא תומך בפעולה זו

3. בדוק: בעלות משאב
   - ניסיון לערוך הערכה של אחר?
   ✗ → אתה לא בעלים

4. בדוק: RLS Policy בדאטהבייס
   - אפילו אם Backend כתב שכול, RLS עשוי לחסום
```

**דוגמה: רציתי לערוך הערכה של חברים**
```
- Frontend: כול מאן סך מרשה?
  ✗ לא, אתה לא בעלים
  
אם somehow עברת Frontend בודק:

- Backend: כול מאן סך מרשה?
  ✗ לא, אתה לא בעלים
  
אם somehow עברת Backend בודק:

- RLS Policy בדאטהבייס:
  ✗ לא מאפשר update בשורה זו
  → 403 Forbidden מדאטהבייס
```

**שלוש שכבות הגנה!**

### בעיה 4: "חשבון נחסם - טלחתי סיסמה 5 פעמים"

```
משתמש: 5 ניסיונות כושלים בתוך 15 דקות
    ↓
Rate Limiter חסם ה-IP למשך 15 דקות
    ↓
לא יכול לנסות להתחבר שוב
    ↓
אחרי 15 דקות: רשמה מנוקה, יכול לנסות שוב
    ↓
או: הקשר עם Admin להסרת חסימה
```

**למה זה משמר?**
- Brute Force Attack = ניסיון לנחש סיסמה בהזמנה רבה
- Rate Limiting עוצר זה מבטחא

### בעיה 5: "Admin חברים מחי חשבון שלי"

```
Admin ראה:
- Audit Log: כל הפעולות שלך
- IP Address: מאיפה התחברת
- Device: איזה דברים מחשב/טלפון
- Login Times: מתי התחברת
```

**הגנה: 2FA**
```
אפילו אם Admin קיבל סיסמה (דולף/מנחש)
לא יכול להתחבר בלי:
- משהו שיודע (סיסמה)
- משהו שיש לך (טלפון עם Authenticator)
```

**אם 2FA מופעל:**
- סיסמה לבד לא מספיק
- צריך גם 6 ספרות מ-Google Authenticator
- או קוד חירום (Backup Code)

### בעיה 6: "רציתי להציג דוא"ל מהשחקנים, אבל אני לא יכול"

```
זה צפוי - הגנה על פרטיות

דוא"ל/טלפון תחות:
- בעלים ליסטינג בלבד
- או שתיים חושים שחסוא "זה קריא"

זרימת Reveal:
1. משתמש A לוחץ "בקשה דוא"ל"
2. Notification לבעל ליסטינג
3. בעל לוחץ "גל דוא"ל" ← אם הסכים
4. משתמש A רואה דוא"ל
5. Audit Log: "contact_revealed" + IP + זמן
```

---

## ריכוז: 3 שכבות הגנה

```
┌─────────────────────────────────────────────────────────┐
│                   FRONTEND (User Interface)              │
│  בודק: התחברת? יש הרשאה? בעלית משאב?                  │
│  אם לא → הודעת שגיאה, אין כפתור                         │
└─────────────────────────────────────────────────────────┘
                         ↓ (אפילו אם מרים)
┌─────────────────────────────────────────────────────────┐
│                  BACKEND (API Routes)                    │
│  בודק שוב: Token תקף? Role תואם? בעלות משאב?          │
│  אם לא → 401 Unauthorized / 403 Forbidden               │
└─────────────────────────────────────────────────────────┘
                         ↓ (אפילו Backend מתבלבל)
┌─────────────────────────────────────────────────────────┐
│                DATABASE (Supabase + RLS)                 │
│  RLS Policy סופית בדק: בדיוק מי יכול גישה            │
│  אם לא → 0 שורות תוצאה / שגיאה דאטהבייס               │
└─────────────────────────────────────────────────────────┘
```

**תוקף:** אפילו אם מישהו התקדם דרך Frontend + Backend
**הדאטהבייס תוקף:** הגם אם שניהם תקלו, ה-RLS חוסם.

---

## סיכום

| חלק | מה זה | כיצד עובד | זמן תוקף |
|-----|------|---------|---------|
| **Authentication** | זיהוי משתמש | דוא"ל + סיסמה → Supabase → JWT Token | - |
| **Access Token** | כרטיס כניסה | שדרות בכל API Request | 1 שעה |
| **Refresh Token** | ריזרזה | משנים Access Token פג | 7 ימים |
| **Authorization** | הרשאות | בדוק Role ו-Permissions | כל בקשה |
| **RLS** | הגנה דאטהבייס | מדיניות בשורה-לשורה | כל שאילתה |
| **Rate Limit** | הגנה Brute Force | 5 ניסיונות → 15 דקות חסום | 15 דקות |
| **2FA** | כפול טיפול | סיסמה + Authenticator | תלוי ב-Token |
| **Audit Log** | תיעוד | רשום כל פעולה חשובה | מעל 90 ימים |

---

## קישורים שימושיים

- **Supabase Auth**: https://supabase.com/docs/guides/auth
- **JWT.io**: https://jwt.io
- **OWASP Authentication**: https://owasp.org/www-community/attacks/authentication_cheat_sheet.html
- **Supabase RLS**: https://supabase.com/docs/guides/auth/row-level-security

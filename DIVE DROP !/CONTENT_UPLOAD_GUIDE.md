# DiveDrop - העלאת חומר אמיתי

הממשק מוכן לקבל תוכן אמיתי דרך טבלת `content_items` ופניות הזמנה דרך `booking_requests`.

## 1. הגדרות חובה ב-Render

להוסיף ל-Service ב-Render:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
CONTENT_ADMIN_TOKEN=LONG_RANDOM_SECRET
```

`CONTENT_ADMIN_TOKEN` הוא טוקן פרטי לייבוא תוכן. לא לשים אותו בקוד ולא לשלוח ללקוח.

## 2. מיגרציה ב-Supabase

להריץ את הקובץ:

```text
supabase/migrations/20260629_create_content_upload_tables.sql
```

זה יוצר:

- `content_items` - תוכן ציבורי לאתר: אתרי צלילה, מועדונים, מדריכים, הסעות, סירות, ציוד, צלילה חופשית.
- `booking_requests` - פניות אמיתיות מטופס ההזמנה באתר.

## 3. פורמט תוכן

קובץ דוגמה מוכן:

```text
content/real-content.sample.json
```

שדות חשובים:

- `kind`: אחד מ-`dive_site`, `club`, `instructor`, `pickup`, `boat`, `dive_option`, `free_diving`, `equipment`, `asset`
- `slug`: מזהה URL קבוע, באנגלית או עברית ללא רווחים
- `title_he`: שם בעברית
- `summary_he`: תיאור קצר
- `location`: מיקום
- `image_url`: נתיב לתמונה, למשל `/assets/uploads/site-1.jpg`
- `metadata`: עומק, קושי, דירוג, תגית, אייקון וכל שדה נוסף

## 4. ייבוא תוכן

לייבוא ללוקאל:

```bash
node scripts/import-content.mjs content/real-content.sample.json http://localhost:3000 YOUR_CONTENT_ADMIN_TOKEN
```

לייבוא לאתר החי:

```bash
node scripts/import-content.mjs content/real-content.sample.json https://nona-dive-drop.onrender.com YOUR_CONTENT_ADMIN_TOKEN
```

אחרי הייבוא התוכן אמור להופיע במסכים:

- `/he`
- `/he/explore`
- `/he/explore?category=clubs`
- `/he/explore?category=instructors`
- `/he/explore?category=pickups`
- `/he/explore?category=boat`
- `/he/bookings`

## 5. תמונות

בינתיים הדרך הכי יציבה ל-MVP:

1. להעלות תמונות לתיקייה ציבורית בפרויקט תחת `public/assets/uploads/`.
2. לשים ב-JSON את הנתיב: `/assets/uploads/filename.jpg`.
3. להריץ ייבוא תוכן.

בהמשך אפשר לחבר Supabase Storage, אבל ל-MVP מחר בבוקר זה פחות מסוכן.

# DiveDrop Graphics Pack

חבילת גרפיקה מלאה לאתר: רקעי Hero, גרסאות מובייל/ווב, לוגואים ורכיבי PNG מופרדים עם שקיפות.

תיקיות:
- 01_backgrounds_web: רקעי אתר רחבים
- 02_backgrounds_mobile: רקעים אנכיים למובייל
- 03_transparent_png: אלמנטים מופרדים על רקע שקוף
- 04_logo_brand: לוגואים ואייקונים
- 05_social: קבצים לרשתות
- 06_preview: תצוגת כל הקבצים

CSS מומלץ:
```css
.hero {
  background-image: linear-gradient(90deg, rgba(0,18,35,.62), rgba(0,18,35,.08)), url('./01_backgrounds_web/hero_underwater_split_1920x1080_text_safe.png');
  background-size: cover;
  background-position: center;
}
@media (max-width: 768px) {
  .hero {
    background-image: linear-gradient(180deg, rgba(0,18,35,.65), rgba(0,18,35,.1)), url('./02_backgrounds_mobile/hero_underwater_split_1080x1920.png');
  }
}
```

הערה: חלק מהחיתוכים הם חיתוכים רכים כדי שהאלמנטים יישבו יפה על רקעי ים, שמיים ושקיעה.


עדכון נוסף:
- 07_instructor_explainer: תמונת הסבר/הזמנה לשליחה למדריכי צלילה + גרסת סטורי.
- 08_interface_kit: לוח השראה לממשק האפליקציה/אתר.
- 09_transparent_ui_components: כפתורים, צ'יפים, כרטיסים וניווט תחתון ב-PNG שקוף לשימוש ישיר בפרונט.

שימוש מומלץ:
- Hero לדסקטופ: `01_backgrounds_web/*_1920x1080_text_safe.png`
- Hero למובייל: `02_backgrounds_mobile/*_1080x1920.png`
- רכיבי Overlay: `03_transparent_png/*.png`
- רכיבי UI שקופים: `09_transparent_ui_components/*.png`

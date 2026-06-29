import { graphics } from '@/lib/showcase/graphics';
import type { PartnerPresentationContent } from '@/components/PartnerPresentationPage';

type Locale = 'he' | 'en';

export function getPartnerHubContent(locale: string): PartnerPresentationContent {
  const isHe = locale === 'he';

  return {
    eyebrow: isHe ? 'מצגת פיילוט לשותפים' : 'Partner pilot presentation',
    title: isHe ? 'כך מציגים את DiveDrop למדריכים ולנהגי שאטל' : 'Present DiveDrop to instructors and shuttle drivers',
    subtitle: isHe
      ? 'עמוד קצר לשיחת זום שמראה את הערך, המסכים והזרימה התפעולית בלי הסברים ארוכים.'
      : 'A focused Zoom-ready page that shows the value, screens and operating flow without a long explanation.',
    primaryCta: isHe ? 'הצג למדריכים' : 'Show instructors',
    primaryHref: `/${locale}/partners/instructors`,
    secondaryCta: isHe ? 'הצג לנהגי שאטל' : 'Show shuttle drivers',
    secondaryHref: `/${locale}/partners/shuttle-drivers`,
    heroDesktop: graphics.heroMain,
    heroMobile: graphics.heroMainMobile,
    visual: graphics.uiFlow,
    metrics: [
      { value: '3', label: isHe ? 'קהלים להצגה: מדריכים, נהגים וצלילה חופשית' : 'Audiences: instructors, drivers and free diving' },
      { value: '1', label: isHe ? 'זרימת הזמנה אחידה לכל פעילות' : 'One booking flow for every activity' },
      { value: '24/7', label: isHe ? 'לידים נשמרים גם לפני חיבור מלא' : 'Leads are stored before full onboarding' },
      { value: 'OBS', label: isHe ? 'גרפיקה מוכנה לשידור זום' : 'Graphics ready for Zoom and OBS' },
    ],
    featuresTitle: isHe ? 'מה מראים בשיחה' : 'What to show in the call',
    features: [
      {
        icon: 'user',
        title: isHe ? 'מדריך מסמן זמינות' : 'Instructor availability',
        text: isHe ? 'המדריך רואה בקשות, מתאים רמה ושפה, ומקבל ליד ברור.' : 'The instructor sees requests, matches level and language, and gets a clear lead.',
      },
      {
        icon: 'van',
        title: isHe ? 'נהג מקבל משימת איסוף' : 'Driver pickup mission',
        text: isHe ? 'מלון, ציוד, אתר צלילה ושעת יציאה נמצאים במקום אחד.' : 'Hotel, gear, dive site and departure time sit in one place.',
      },
      {
        icon: 'waves',
        title: isHe ? 'צלילה חופשית כמוצר נפרד' : 'Free diving as a product',
        text: isHe ? 'אימונים, דיסציפלינות וציוד נפתחים כקטגוריה מלאה, לא כנספח.' : 'Training, disciplines and gear become a full category, not an add-on.',
      },
    ],
    flowTitle: isHe ? 'סדר הצגה מומלץ' : 'Recommended demo order',
    flow: [
      {
        title: isHe ? 'פותחים את ערך הפלטפורמה' : 'Open with platform value',
        text: isHe ? 'DiveDrop מחבר צולל, מדריך, שאטל וציוד באותו תהליך.' : 'DiveDrop connects diver, instructor, shuttle and gear in the same flow.',
      },
      {
        title: isHe ? 'מציגים מסך לפי קהל' : 'Show the audience screen',
        text: isHe ? 'למדריך מציגים זמינות והתאמה. לנהג מציגים מסלול ואיסוף.' : 'For instructors show availability and matching. For drivers show route and pickup.',
      },
      {
        title: isHe ? 'מסיימים בפעולה אחת' : 'Close with one action',
        text: isHe ? 'השארת פרטים, סימון זמינות או פתיחת בקשת פיילוט.' : 'Leave details, mark availability, or open a pilot request.',
      },
    ],
    closingTitle: isHe ? 'שפה ויזואלית אחידה' : 'Unified visual language',
    closingText: isHe
      ? 'כל עמודי ההצגה משתמשים באותה חבילת גרפיקה של DiveDrop כדי שהשיחה תיראה כמו מוצר חי.'
      : 'All presentation pages use the same DiveDrop graphics pack so the call feels like a live product.',
  };
}

export function getInstructorContent(locale: string): PartnerPresentationContent {
  const isHe = locale === 'he';

  return {
    eyebrow: isHe ? 'למדריכי צלילה' : 'For dive instructors',
    title: isHe ? 'יותר לידים מסודרים, פחות תיאומים מפוזרים' : 'More structured leads, fewer scattered messages',
    subtitle: isHe
      ? 'המדריך מקבל בקשה עם אתר, דרגת צולל, שפה, ציוד ושעת יציאה, במקום שרשור הודעות לא ברור.'
      : 'The instructor gets site, diver level, language, gear and departure time instead of scattered messages.',
    primaryCta: isHe ? 'פתח בקשת מדריך' : 'Open instructor request',
    primaryHref: `/${locale}/bookings?category=instructors`,
    secondaryCta: isHe ? 'חזרה לעמוד שותפים' : 'Back to partners',
    secondaryHref: `/${locale}/partners`,
    heroDesktop: graphics.heroInstructor,
    heroMobile: graphics.heroInstructorMobile,
    heroObjectPosition: 'center',
    visual: graphics.instructorExplainer,
    metrics: [
      { value: '1 TAP', label: isHe ? 'סימון זמינות ליום פעילות' : 'Mark availability for the day' },
      { value: 'Level', label: isHe ? 'התאמה לפי דרגת צולל ושפה' : 'Match by diver level and language' },
      { value: 'Lead', label: isHe ? 'פרטי לקוח מלאים במקום אחד' : 'Full customer details in one place' },
      { value: 'Gear', label: isHe ? 'ציוד ושאטל מחוברים להזמנה' : 'Gear and shuttle connected to the booking' },
    ],
    featuresTitle: isHe ? 'מה מדריך מקבל במערכת' : 'What instructors get',
    features: [
      {
        icon: 'check',
        title: isHe ? 'זמינות ברורה' : 'Clear availability',
        text: isHe ? 'סימון מהיר של זמני פעילות, בלי לחזור לכל לקוח בנפרד.' : 'Fast availability marking without replying to every customer manually.',
      },
      {
        icon: 'level',
        title: isHe ? 'התאמה מקצועית' : 'Professional matching',
        text: isHe ? 'הזמנה מגיעה עם דרגה, ניסיון, אתר וצרכים מיוחדים.' : 'Each request includes certification, experience, site and special needs.',
      },
      {
        icon: 'message',
        title: isHe ? 'מעקב אחרי ליד' : 'Lead follow-up',
        text: isHe ? 'בקשה לא נעלמת בוואטסאפ. היא נשמרת וניתנת לטיפול.' : 'A request does not disappear in WhatsApp. It is stored and actionable.',
      },
    ],
    flowTitle: isHe ? 'זרימת מדריך' : 'Instructor flow',
    flow: [
      {
        title: isHe ? 'מדריך מצטרף לפיילוט' : 'Instructor joins the pilot',
        text: isHe ? 'מזינים פרטים, שפות, דרגות הסמכה ואתרים מועדפים.' : 'Add details, languages, certifications and preferred dive sites.',
      },
      {
        title: isHe ? 'מערכת מתאימה בקשות' : 'System matches requests',
        text: isHe ? 'DiveDrop מחבר צולל לפי רמה, מיקום וסוג פעילות.' : 'DiveDrop matches divers by level, location and activity type.',
      },
      {
        title: isHe ? 'המדריך מאשר ומקבל פרטים' : 'Instructor confirms and receives details',
        text: isHe ? 'הלקוח, הציוד, האיסוף והשעה מגיעים כבקשה אחת.' : 'Customer, gear, pickup and time arrive as one clear request.',
      },
    ],
    closingTitle: isHe ? 'מוכן להצגה בשיחת זום' : 'Ready for a Zoom pitch',
    closingText: isHe
      ? 'העמוד נבנה כמו שקופית חיה: פותחים, מראים את הזרימה, ומבקשים מהמדריך להיכנס לפיילוט.'
      : 'The page works like a live slide: open it, show the flow, and ask the instructor to join the pilot.',
  };
}

export function getShuttleDriverContent(locale: string): PartnerPresentationContent {
  const isHe = locale === 'he';

  return {
    eyebrow: isHe ? 'לנהגי שאטל' : 'For shuttle drivers',
    title: isHe ? 'משימות איסוף ברורות לצוללים וציוד' : 'Clear pickup missions for divers and gear',
    subtitle: isHe
      ? 'נהג רואה מי אוסף, מאיפה, לאיזה אתר, איזה ציוד בתא המטען ומה שעת היציאה.'
      : 'The driver sees who to pick up, from where, to which site, what gear is onboard and the departure time.',
    primaryCta: isHe ? 'פתח בקשת שאטל' : 'Open shuttle request',
    primaryHref: `/${locale}/bookings?category=pickups`,
    secondaryCta: isHe ? 'חזרה לעמוד שותפים' : 'Back to partners',
    secondaryHref: `/${locale}/partners`,
    heroDesktop: graphics.heroMain,
    heroMobile: graphics.heroMainMobile,
    heroObjectPosition: 'center',
    visual: graphics.shuttleVan,
    metrics: [
      { value: 'Route', label: isHe ? 'מסלול איסוף לפי מלון ואתר צלילה' : 'Pickup route by hotel and dive site' },
      { value: 'Gear', label: isHe ? 'ציוד משויך להזמנה ולרכב' : 'Gear assigned to booking and vehicle' },
      { value: 'ETA', label: isHe ? 'שעת יציאה וחזרה מסודרת' : 'Clear departure and return times' },
      { value: 'Team', label: isHe ? 'מדריך, לקוח ונהג באותו תהליך' : 'Guide, customer and driver in one flow' },
    ],
    featuresTitle: isHe ? 'מה נהג רואה בפיילוט' : 'What drivers see in the pilot',
    features: [
      {
        icon: 'van',
        title: isHe ? 'איסוף מלון' : 'Hotel pickup',
        text: isHe ? 'כתובת, שם לקוח, מספר משתתפים ושעת איסוף מופיעים יחד.' : 'Address, customer name, participant count and pickup time appear together.',
      },
      {
        icon: 'store',
        title: isHe ? 'ציוד ברכב' : 'Gear onboard',
        text: isHe ? 'הנהג יודע אם יש מסכות, סנפירים, חליפות או מיכלים לקחת.' : 'The driver knows whether masks, fins, suits or tanks need transport.',
      },
      {
        icon: 'location',
        title: isHe ? 'יעד צלילה' : 'Dive destination',
        text: isHe ? 'כל נסיעה קשורה לאתר צלילה, מדריך ופעילות מתוכננת.' : 'Every ride is tied to a dive site, guide and planned activity.',
      },
    ],
    flowTitle: isHe ? 'זרימת שאטל' : 'Shuttle flow',
    flow: [
      {
        title: isHe ? 'הזמנה נכנסת' : 'Booking enters',
        text: isHe ? 'הלקוח בוחר אתר, תאריך והאם צריך איסוף.' : 'The customer chooses site, date and whether pickup is needed.',
      },
      {
        title: isHe ? 'נהג מקבל משימה' : 'Driver receives a mission',
        text: isHe ? 'המערכת מציגה נקודת איסוף, יעד וציוד.' : 'The system shows pickup point, destination and gear.',
      },
      {
        title: isHe ? 'סגירת נסיעה' : 'Ride completion',
        text: isHe ? 'בסיום, ההזמנה נשארת מתועדת להמשך טיפול.' : 'After completion, the booking stays documented for follow-up.',
      },
    ],
    closingTitle: isHe ? 'הנהג לא צריך ללמוד מערכת מורכבת' : 'Drivers do not need a complex system',
    closingText: isHe
      ? 'העמוד מדגים ממשק קצר שמתרגם הזמנות למשימות שטח פשוטות.'
      : 'The page demonstrates a short interface that turns bookings into simple field missions.',
  };
}

export function getFreeDivingPartnerContent(locale: string): PartnerPresentationContent {
  const isHe = locale === 'he';

  return {
    eyebrow: isHe ? 'מודול צלילה חופשית' : 'Free diving module',
    title: isHe ? 'צלילה חופשית כמוצר מלא, לא תוספת צדדית' : 'Free diving as a complete product',
    subtitle: isHe
      ? 'אימונים, דיסציפלינות, השכרת ציוד ופעילויות קהילה מקבלים מסלול הזמנה נפרד וברור.'
      : 'Training, disciplines, rentals and community activities get a separate and clear booking flow.',
    primaryCta: isHe ? 'פתח מודול צלילה חופשית' : 'Open free diving module',
    primaryHref: `/${locale}/free-diving`,
    secondaryCta: isHe ? 'חזרה לעמוד שותפים' : 'Back to partners',
    secondaryHref: `/${locale}/partners`,
    heroDesktop: graphics.heroPremium,
    heroMobile: graphics.heroPremiumMobile,
    visual: graphics.submarine,
    metrics: [
      { value: 'CWT', label: isHe ? 'משקל קבוע ואימון עומק' : 'Constant weight and depth training' },
      { value: 'FIM', label: isHe ? 'משיכה בחבל ואיזון לחצים' : 'Free immersion and equalization' },
      { value: 'STA', label: isHe ? 'אפניאה סטטית ורוגע' : 'Static apnea and calm control' },
      { value: 'DYN', label: isHe ? 'מרחק אופקי בבריכה או ים' : 'Horizontal distance in pool or sea' },
    ],
    featuresTitle: isHe ? 'מה חסר עד עכשיו ומה נוסף' : 'What was missing and what is added',
    features: [
      {
        icon: 'waves',
        title: isHe ? 'דיסציפלינות ברורות' : 'Clear disciplines',
        text: isHe ? 'הלקוח מבין אם הוא מחפש אימון עומק, חבל, סטטי או דינמי.' : 'Customers understand whether they need depth, rope, static or dynamic training.',
      },
      {
        icon: 'award',
        title: isHe ? 'בטיחות לפני מכירה' : 'Safety before sale',
        text: isHe ? 'המסך מדגיש מדריך, רמה, בן זוג ותנאי ים לפני כפתור הזמנה.' : 'The screen emphasizes guide, level, buddy and sea conditions before booking.',
      },
      {
        icon: 'store',
        title: isHe ? 'ציוד מחובר' : 'Connected gear',
        text: isHe ? 'סנפירים, מסכה, חליפה ומשקולות נכנסים לאותו תהליך.' : 'Fins, mask, suit and weights enter the same process.',
      },
    ],
    flowTitle: isHe ? 'זרימת צלילה חופשית' : 'Free diving flow',
    flow: [
      {
        title: isHe ? 'בחירת סוג אימון' : 'Choose training type',
        text: isHe ? 'מתחיל, עומק, חבל, סטטי, דינמי או פעילות קהילה.' : 'Beginner, depth, rope, static, dynamic or community activity.',
      },
      {
        title: isHe ? 'התאמת מדריך וציוד' : 'Match guide and gear',
        text: isHe ? 'המערכת אוספת רמה, תאריך, ציוד ושפת הדרכה.' : 'The system collects level, date, gear and instruction language.',
      },
      {
        title: isHe ? 'ליד נשמר ומועבר לטיפול' : 'Lead is stored and handled',
        text: isHe ? 'הבקשה נשמרת ב־Supabase ויכולה להישלח לוואטסאפ דרך OpenWA.' : 'The request is saved in Supabase and can notify WhatsApp through OpenWA.',
      },
    ],
    closingTitle: isHe ? 'זה החלק שהיה חסר במוצר' : 'This is the missing product layer',
    closingText: isHe
      ? 'עכשיו אפשר להציג צלילה חופשית כמסלול עצמאי עם שפה גרפית, תהליך וקריאה לפעולה.'
      : 'Free diving can now be presented as its own track with visual language, process and call to action.',
  };
}

export function normalizeLocale(locale: string): Locale {
  return locale === 'en' ? 'en' : 'he';
}

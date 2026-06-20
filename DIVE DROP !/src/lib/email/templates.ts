/**
 * Email Template Generator - Bilingual (EN/HE)
 * Generates HTML email templates with DIVE DROP branding
 */

interface EmailTemplateParams {
  locale: 'en' | 'he';
  userName: string;
  verificationLink: string;
  expiryHours?: number;
}

const COLORS = {
  primary: '#0066CC',
  primaryHover: '#0052A3',
  background: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  border: '#E0E0E0',
  accentBlue: '#00B4D8',
};

const CONTENT = {
  en: {
    greeting: 'Hello',
    welcomeTitle: 'Welcome to DIVE DROP!',
    welcomeSubtitle: 'Confirm your email address to get started',
    buttonLabel: 'Verify Email',
    expiryText: (hours: number) => `This link expires in ${hours} hours`,
    noRequestText: "If you didn't request this email, please ignore it or contact us immediately.",
    supportText: 'Need help?',
    supportEmail: 'support@divedrop.com',
    footer: 'DIVE DROP - Safe, Responsible, Professional Diving',
    tagline: 'Explore the underwater world',
  },
  he: {
    greeting: 'שלום',
    welcomeTitle: 'ברוכים הבאים ל-DIVE DROP!',
    welcomeSubtitle: 'אמת את כתובת הדוא"ל שלך כדי להתחיל',
    buttonLabel: 'אישור דוא"ל',
    expiryText: (hours: number) => `הקישור תקף ל-${hours} שעות`,
    noRequestText: 'אם לא ביקשת אימייל זה, אנא התעלם ממנו או צור קשר איתנו מיד.',
    supportText: 'צריך עזרה?',
    supportEmail: 'support@divedrop.com',
    footer: 'DIVE DROP - צלילה בטוחה, אחראית ומקצועית',
    tagline: 'חקור את עולם התת-ימי',
  },
};

function generateEmailHTML(params: EmailTemplateParams): string {
  const { locale, userName, verificationLink, expiryHours = 24 } = params;
  const content = CONTENT[locale];
  const isRtl = locale === 'he';
  const direction = isRtl ? 'rtl' : 'ltr';

  return `
<!DOCTYPE html>
<html dir="${direction}" lang="${locale}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${content.welcomeTitle}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #F5F5F5;
            color: ${COLORS.textPrimary};
            line-height: 1.6;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: ${COLORS.background};
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.accentBlue} 100%);
            padding: 32px 24px;
            text-align: center;
            color: white;
        }
        .header-logo {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
        }
        .header-tagline {
            font-size: 14px;
            opacity: 0.95;
            font-weight: 300;
        }
        .content {
            padding: 40px 24px;
            ${isRtl ? 'direction: rtl;' : ''}
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 24px;
            color: ${COLORS.textPrimary};
        }
        .greeting-name {
            font-weight: 600;
        }
        .welcome-section {
            margin-bottom: 32px;
        }
        .welcome-title {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 8px;
            color: ${COLORS.textPrimary};
        }
        .welcome-subtitle {
            font-size: 16px;
            color: ${COLORS.textSecondary};
            margin-bottom: 24px;
        }
        .verification-box {
            background-color: #F8FBFF;
            border-left: 4px solid ${COLORS.primary};
            ${isRtl ? 'border-left: none; border-right: 4px solid ' + COLORS.primary + ';' : ''}
            padding: 20px;
            margin-bottom: 24px;
            border-radius: 4px;
        }
        .verification-box-text {
            font-size: 14px;
            color: ${COLORS.textSecondary};
            margin-bottom: 16px;
        }
        .cta-button {
            display: inline-block;
            background-color: ${COLORS.primary};
            color: white;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            transition: background-color 0.3s ease;
            border: none;
            cursor: pointer;
            text-align: center;
        }
        .cta-button:hover {
            background-color: ${COLORS.primaryHover};
        }
        .cta-container {
            text-align: center;
            margin: 32px 0;
        }
        .expiry-notice {
            background-color: #FFF4E6;
            border: 1px solid #FFE0B2;
            border-radius: 4px;
            padding: 16px;
            margin: 24px 0;
            font-size: 13px;
            color: #E65100;
            text-align: ${isRtl ? 'right' : 'left'};
        }
        .security-notice {
            background-color: #F0F8FF;
            border: 1px solid #B3E5FC;
            border-radius: 4px;
            padding: 16px;
            margin: 24px 0;
            font-size: 13px;
            color: ${COLORS.textSecondary};
            text-align: ${isRtl ? 'right' : 'left'};
        }
        .divider {
            border-top: 1px solid ${COLORS.border};
            margin: 32px 0;
        }
        .support-section {
            text-align: center;
            margin-bottom: 24px;
        }
        .support-title {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 8px;
            color: ${COLORS.textPrimary};
        }
        .support-link {
            color: ${COLORS.primary};
            text-decoration: none;
            font-size: 13px;
        }
        .support-link:hover {
            text-decoration: underline;
        }
        .footer {
            background-color: #F9F9F9;
            padding: 24px;
            text-align: center;
            border-top: 1px solid ${COLORS.border};
        }
        .footer-text {
            font-size: 12px;
            color: ${COLORS.textSecondary};
            margin-bottom: 8px;
        }
        .footer-links {
            font-size: 11px;
            color: ${COLORS.textSecondary};
        }
        .footer-link {
            color: ${COLORS.primary};
            text-decoration: none;
            margin: 0 8px;
        }
        .footer-link:hover {
            text-decoration: underline;
        }
        @media (max-width: 600px) {
            .container {
                border-radius: 0;
            }
            .content {
                padding: 24px 16px;
            }
            .header {
                padding: 24px 16px;
            }
            .welcome-title {
                font-size: 20px;
            }
            .cta-button {
                width: 100%;
                box-sizing: border-box;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="header-logo">🤿 DIVE DROP</div>
            <div class="header-tagline">${content.tagline}</div>
        </div>

        <!-- Content -->
        <div class="content">
            <div class="greeting">
                ${content.greeting} <span class="greeting-name">${userName}</span>,
            </div>

            <div class="welcome-section">
                <div class="welcome-title">${content.welcomeTitle}</div>
                <div class="welcome-subtitle">${content.welcomeSubtitle}</div>
            </div>

            <div class="verification-box">
                <div class="verification-box-text">
                    ${isRtl ? 'לחץ על הכפתור למטה כדי לאשר את כתובת הדוא"ל שלך:' : 'Click the button below to verify your email address:'}
                </div>
                <div class="cta-container">
                    <a href="${verificationLink}" class="cta-button">${content.buttonLabel}</a>
                </div>
            </div>

            <div class="expiry-notice">
                ⏱️ ${content.expiryText(expiryHours)}
            </div>

            <div class="security-notice">
                🔒 ${isRtl ? 'קישור זה שימושי רק עבור אימות דוא"ל. אנחנו לעולם לא נבקש ממך לשתף סיסמאות בדוא"ל.' : 'This link is only used for email verification. We will never ask you to share passwords via email.'}
            </div>

            <div class="divider"></div>

            <div class="support-section">
                <div class="support-title">${content.supportText}</div>
                <a href="mailto:${content.supportEmail}" class="support-link">${content.supportEmail}</a>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="footer-text">${content.footer}</div>
            <div class="footer-links">
                <a href="https://divedrop.com" class="footer-link">${isRtl ? 'אתר' : 'Website'}</a>
                <a href="https://divedrop.com/privacy" class="footer-link">${isRtl ? 'פרטיות' : 'Privacy'}</a>
                <a href="https://divedrop.com/terms" class="footer-link">${isRtl ? 'תנאים' : 'Terms'}</a>
            </div>
        </div>
    </div>
</body>
</html>
  `.trim();
}

export function getVerificationEmailTemplate(
  params: EmailTemplateParams
): { subject: string; html: string } {
  const { locale } = params;
  const content = CONTENT[locale];

  return {
    subject:
      locale === 'en'
        ? 'Verify your DIVE DROP email address'
        : 'אמת את כתובת הדוא"ל של DIVE DROP שלך',
    html: generateEmailHTML(params),
  };
}

export function getWelcomeEmailTemplate(
  locale: 'en' | 'he',
  userName: string
): { subject: string; html: string } {
  const content = CONTENT[locale];
  const isRtl = locale === 'he';

  const html = `
<!DOCTYPE html>
<html dir="${isRtl ? 'rtl' : 'ltr'}" lang="${locale}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${content.welcomeTitle}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #F5F5F5;
            color: ${COLORS.textPrimary};
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: ${COLORS.background};
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.accentBlue} 100%);
            padding: 32px 24px;
            text-align: center;
            color: white;
        }
        .header-logo {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
        }
        .content {
            padding: 40px 24px;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 24px;
        }
        .welcome-text {
            font-size: 16px;
            color: ${COLORS.textSecondary};
            margin-bottom: 24px;
            line-height: 1.6;
        }
        .footer {
            background-color: #F9F9F9;
            padding: 24px;
            text-align: center;
            border-top: 1px solid ${COLORS.border};
            font-size: 12px;
            color: ${COLORS.textSecondary};
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-logo">🤿 DIVE DROP</div>
        </div>
        <div class="content">
            <div class="greeting">${content.greeting} <strong>${userName}</strong>,</div>
            <div class="welcome-text">
                ${isRtl ? 'האימות שלך הצליח! אתה כעת חבר ב-DIVE DROP.' : 'Your verification was successful! You are now a member of DIVE DROP.'}
            </div>
            <div class="welcome-text">
                ${isRtl ? 'בואו נתחיל בחקר אתרי צלילה, התחברות לצוללים אחרים, וראשות את הטובות ביותר של החברה שלנו.' : 'Let\'s start exploring dive sites, connecting with other divers, and experiencing the best of our community.'}
            </div>
        </div>
        <div class="footer">
            ${content.footer}
        </div>
    </div>
</body>
</html>
  `.trim();

  return {
    subject:
      locale === 'en'
        ? 'Welcome to DIVE DROP!'
        : 'ברוכים הבאים ל-DIVE DROP!',
    html,
  };
}

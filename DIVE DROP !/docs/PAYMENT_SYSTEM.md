# Payment Package & Confirmation System

## Overview

The payment system enables customers to purchase packages containing multiple services from different providers. Each provider must confirm payment receipt, and only after all confirmations does the customer receive a confirmation email.

## Architecture

### Database Tables

- **payment_packages**: Main package record with status tracking
- **package_items**: Individual services within a package
- **provider_confirmations**: Tracks which providers have confirmed
- **provider_notifications**: Push notifications sent to providers

### Flow

```
1. Customer creates package with multiple items
2. System sends push notifications to each provider
3. Each provider confirms payment in their dashboard
4. When all confirm, package status → 'completed'
5. Webhook triggers and sends customer confirmation email
```

## API Endpoints

### Create Package
```
POST /api/payment-packages
Content-Type: application/json

{
  "customer_id": "uuid",
  "items": [
    {
      "provider_id": "uuid",
      "service_name": "צלילה מדריך",
      "service_category": "guide",
      "price": 500
    }
  ]
}
```

### Confirm Payment
```
POST /api/provider-confirmations/[id]/confirm
Authorization: Bearer {token}
```

### Get Package Details
```
GET /api/payment-packages/[id]
Authorization: Bearer {token}
```

## Email Configuration

### Environment Variables

```env
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev (development) or your-domain@example.com (production)
WEBHOOK_SECRET=your-secret-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Email Template

Located at: `src/components/email/PackageConfirmationEmail.tsx`

Supports:
- Hebrew (עברית) with RTL layout
- Responsive design for mobile/desktop
- Professional branding

## Frontend Components

### Provider Confirmation
```tsx
<ProviderConfirmationPanel
  notification={notification}
  onConfirm={handleConfirm}
  isLoading={isLoading}
/>
```

### Customer Package Display
```tsx
<PackageDetailsCard package={packageDetail} />
```

## Testing

Run tests:
```bash
npm test
```

Integration test specifically:
```bash
npm test -- payment-integration.test.ts
```

## Known Limitations

1. **Resend Free Tier**: Limited to 100 emails/day. For production scale, may need paid plan.
2. **RTL Email Rendering**: Some email clients don't support RTL perfectly. Full testing needed.
3. **Provider Data**: Email includes provider details. Ensure data is current.
4. **Timezone**: Dates/times should be in Israeli timezone (Asia/Jerusalem).
5. **Internationalization**: Currently Hebrew. Future: Support English/other languages.

## Future Enhancements

- [ ] Email delivery tracking and retry logic
- [ ] Provider payment notifications
- [ ] Invoice generation
- [ ] Multiple language support (not just Hebrew)
- [ ] Payment refund system
- [ ] Email template customization per provider

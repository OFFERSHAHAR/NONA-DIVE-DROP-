# Booking System - Quick Start Guide

## Installation (5 minutes)

### Step 1: Run Database Migration
```bash
# Open Supabase SQL Editor and run:
# src/lib/bookings/migrations.sql
```

This creates all 6 required tables:
- `bookings` - Main booking records
- `booking_items` - Individual diver participation
- `booking_status_history` - Audit trail
- `booking_messages` - Communication
- `booking_reviews` - Ratings
- `booking_payments` - Payment records

### Step 2: Add Translation Strings
Add to your i18n translation files (e.g., `en.json`, `he.json`):

```json
{
  "bookings": {
    "createNewBooking": "Create New Booking",
    "myBookings": "My Bookings",
    "bookingDetails": "Booking Details",
    "newBooking": "New Booking",
    "back": "Back",
    "loading": "Loading...",
    "error": "An error occurred",
    "bookingWizard": "Booking Wizard",
    "complete": "Complete",
    "next": "Next",
    "previous": "Previous",
    "steps": {
      "selectBuddy": "Select Buddy",
      "selectDateTime": "Select Date & Time",
      "selectLocation": "Select Location",
      "selectProvider": "Select Provider",
      "payment": "Payment",
      "confirmation": "Confirmation"
    },
    "selectBuddyTitle": "Who do you want to dive with?",
    "selectBuddyDescription": "Choose a buddy from your connections or find one through DiveDrop",
    "noBuddiesFound": "No buddies found",
    "useDiscoverBuddy": "Use the Discover feature to find a buddy",
    "diveDate": "Dive Date",
    "duration": "Duration",
    "minutes": "minutes",
    "maxDepth": "Max Depth",
    "waterTemp": "Water Temperature",
    "diveDetails": "Dive Details",
    "selectLocation": "Select Location",
    "customLocation": "Custom Location",
    "enterLocation": "Enter location",
    "selectFromList": "Select from list",
    "selectProvider": "Select Service Provider",
    "selectProviderDescription": "Optional: Choose a certified service provider",
    "noProvidersFound": "No providers found",
    "certified": "Certified",
    "numberOfDivers": "Number of Divers",
    "maxDivers": "Maximum",
    "priceBreakdown": "Price Breakdown",
    "basePrice": "Base Price",
    "platformFee": "Platform Fee",
    "tax": "Tax (VAT)",
    "total": "Total",
    "paymentMethod": "Payment Method",
    "creditCard": "Credit Card",
    "bankTransfer": "Bank Transfer",
    "agreeToTerms": "I agree to the",
    "termsOfService": "Terms of Service",
    "completePayment": "Complete Payment",
    "bookingConfirmed": "Booking Confirmed!",
    "confirmationMessage": "Your booking has been created. The service provider will review and confirm shortly.",
    "bookingId": "Booking ID",
    "status": "Status",
    "pending": "Pending",
    "waitingForProvider": "Waiting for provider confirmation",
    "nextStep": "Next Step",
    "whatHappensNext": "What happens next?",
    "step1": "Service provider reviews your booking",
    "step2": "You receive a confirmation email",
    "step3": "You can chat with other divers",
    "step4": "Complete the dive and leave reviews",
    "viewMyBookings": "View My Bookings",
    "startNewBooking": "Start New Booking",
    "needHelp": "Need help?",
    "contactSupport": "Contact Support",
    "noBookings": "You haven't created any bookings yet",
    "startBookingDescription": "Create your first booking and start diving safely with a buddy",
    "createFirstBooking": "Create First Booking",
    "totalBookings": "total bookings",
    "participants": "Participants",
    "diver": "Diver",
    "buddy": "Buddy",
    "messages": "Messages",
    "noMessages": "No messages yet",
    "typeMessage": "Type a message...",
    "send": "Send",
    "leaveReview": "Leave a Review",
    "rating": "Rating",
    "outOf": "out of",
    "yourReview": "Your Review",
    "reviewPlaceholder": "Share your diving experience...",
    "minimumCharacters": "Minimum {{count}} characters",
    "wouldYouRecommend": "Would you recommend this diver?",
    "yes": "Yes",
    "no": "No",
    "cancel": "Cancel",
    "submitReview": "Submit Review",
    "submitting": "Submitting...",
    "ratingRequired": "Please select a rating",
    "reviewTooShort": "Review must be at least 10 characters",
    "submitError": "Failed to submit review",
    "reviewFor": "Review for",
    "shareExperience": "Share your diving experience with this person",
    "currentStatus": "Current Status",
    "failedToFetchBookings": "Failed to fetch bookings",
    "failedToFetchBooking": "Failed to fetch booking",
    "bookingNotFound": "Booking not found",
    "backToBookings": "Back to Bookings",
    "failedToSendMessage": "Failed to send message",
    "failedToSubmitReview": "Failed to submit review",
    "continuousButton": "Continue"
  }
}
```

### Step 3: Test the System

1. Navigate to `/bookings/new` to create a booking
2. Fill out the wizard
3. View bookings at `/bookings/my-bookings`
4. Click on a booking to see details

## API Usage Examples

### Create a Booking
```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "buddy_user_id": "uuid",
    "dive_date": "2026-07-01T10:00:00Z",
    "dive_site_id": "uuid",
    "service_provider_id": "uuid",
    "max_depth": 30,
    "water_temp": 20,
    "number_of_divers": 2,
    "estimated_duration": 60
  }'
```

### Get Bookings
```bash
curl http://localhost:3000/api/bookings?status=confirmed&sort_by=date \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Booking Details
```bash
curl http://localhost:3000/api/bookings/BOOKING_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Provider Confirms Booking
```bash
curl -X POST http://localhost:3000/api/bookings/BOOKING_ID/confirm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer PROVIDER_TOKEN" \
  -d '{
    "confirm": true,
    "notes": "Looking forward to this dive!"
  }'
```

### Complete Booking
```bash
curl -X POST http://localhost:3000/api/bookings/BOOKING_ID/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "actual_duration": 55,
    "depth_achieved": 28,
    "notes": "Excellent dive!"
  }'
```

### Submit Review
```bash
curl -X POST http://localhost:3000/api/bookings/BOOKING_ID/reviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "rating": 5,
    "review_text": "Amazing diver, very experienced!",
    "would_recommend": true
  }'
```

## Component Usage

### Use Booking Store
```tsx
import { useBookingStore } from '@/store/bookingStore';

export function MyComponent() {
  const { draft, setDraft, nextStep } = useBookingStore();
  
  return (
    <div>
      <input
        value={draft.max_depth || 30}
        onChange={(e) => setDraft({ max_depth: parseInt(e.target.value) })}
      />
      <button onClick={nextStep}>Next</button>
    </div>
  );
}
```

### Display Booking Card
```tsx
import { BookingCard } from '@/components/bookings/BookingCard';

<BookingCard
  id={booking.id}
  status={booking.status}
  dive_date={booking.dive_date}
  max_depth={booking.max_depth}
  water_temp={booking.water_temp}
  estimated_duration={booking.estimated_duration}
  buddy={booking.buddy}
  dive_site={booking.dive_sites}
  locale="en"
/>
```

### Embed Booking Wizard
```tsx
import { BookingWizard } from '@/components/bookings/BookingWizard';

<BookingWizard />
```

## Database Queries

### Get User's Bookings
```sql
SELECT * FROM bookings
WHERE user_id = 'user_id' OR buddy_user_id = 'user_id'
ORDER BY dive_date DESC;
```

### Get Pending Confirmations
```sql
SELECT * FROM bookings
WHERE status = 'pending_confirmation'
AND service_provider_id = 'provider_id'
ORDER BY created_at DESC;
```

### Get User's Reviews
```sql
SELECT * FROM booking_reviews
WHERE reviewed_user_id = 'user_id'
ORDER BY created_at DESC;
```

### Get Booking Conversation
```sql
SELECT * FROM booking_messages
WHERE booking_id = 'booking_id'
ORDER BY created_at ASC;
```

## Common Tasks

### Check Booking Status
```tsx
import { getStatusLabel } from '@/lib/bookings/utils';

const label = getStatusLabel(booking.status, 'en');
console.log(label); // "Confirmed"
```

### Calculate Booking Cost
```tsx
import { calculateTotalCost } from '@/lib/bookings/utils';

const cost = calculateTotalCost(300); // 3 divers × $100
// { base: 300, platformFee: 45, tax: 58.65, total: 403.65 }
```

### Validate Booking Cancellation
```tsx
import { canCancelBooking } from '@/lib/bookings/utils';

const result = canCancelBooking(booking.status, new Date(booking.dive_date));
if (result.canCancel) {
  // Allow cancellation
} else {
  console.log(result.reason);
}
```

### Validate Dive Parameters
```tsx
import { validateDiveParameters } from '@/lib/bookings/utils';

const validation = validateDiveParameters(40, 50, 15);
if (validation.valid) {
  // Safe dive parameters
} else {
  validation.warnings.forEach(w => console.warn(w));
}
```

## Troubleshooting

### Bookings Not Loading
- Check user is authenticated
- Verify RLS policies are enabled
- Check browser console for errors

### Messages Not Sending
- Verify user is booking participant
- Check rate limiting (10 messages/minute)
- Verify message length < 1000 chars

### Review Not Submitting
- Check booking is completed
- Verify review text > 10 characters
- Verify rating is 1-5

### Payment Issues
- Verify user is authenticated
- Check booking exists
- Verify payment_status enum value

## Next Steps

1. **Real-time Updates** - Add Supabase subscriptions for live messages
2. **Notifications** - Integrate Twilio for SMS alerts
3. **Payment Gateway** - Connect Stripe or PayPal
4. **Email Templates** - Create transactional email templates
5. **Analytics** - Track booking metrics
6. **Provider Matching** - Build recommendation algorithm

## Support

For more details, see:
- `BOOKING_SYSTEM_IMPLEMENTATION.md` - Full documentation
- `BOOKING_SYSTEM_FILES.md` - File structure
- `/src/lib/bookings/utils.ts` - All utility functions
- `/src/lib/bookings/schemas.ts` - Data validation

---

**Ready to test?** Start by creating a booking at `/bookings/new`!

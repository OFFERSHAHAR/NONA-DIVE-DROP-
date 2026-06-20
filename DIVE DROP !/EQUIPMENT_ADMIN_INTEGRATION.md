# Equipment Rental Admin Dashboard - Integration Guide

## Quick Start

### 1. Database Schema Setup

Create the following tables in Supabase:

```sql
-- Equipment table
CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  type VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  description TEXT,
  status VARCHAR DEFAULT 'available' CHECK (status IN ('available', 'in_rental', 'unavailable', 'damaged', 'missing')),
  rental_price DECIMAL(10, 2),
  images TEXT[],
  last_inspection TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Damage reports table
CREATE TABLE damage_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES equipment(id),
  rental_id UUID NOT NULL,
  renter_id UUID NOT NULL REFERENCES auth.users(id),
  reported_by VARCHAR NOT NULL,
  description TEXT NOT NULL,
  photos_url TEXT[],
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'resolved')),
  repair_cost DECIMAL(10, 2),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Problematic users table
CREATE TABLE problematic_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
  flag_reason VARCHAR NOT NULL,
  issue_count INT DEFAULT 0,
  flag_status VARCHAR DEFAULT 'active' CHECK (flag_status IN ('active', 'inactive', 'blacklisted')),
  last_issue_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User issues table
CREATE TABLE user_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  problematic_user_id UUID NOT NULL REFERENCES problematic_users(id),
  type VARCHAR NOT NULL CHECK (type IN ('damage', 'late_return', 'dispute_loss', 'blacklist')),
  description TEXT,
  related_rental_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Commissions table
CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lister_id UUID NOT NULL REFERENCES auth.users(id),
  equipment_id UUID NOT NULL REFERENCES equipment(id),
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  month VARCHAR NOT NULL,
  paid_date TIMESTAMP,
  invoice_url VARCHAR,
  bit_payment_id VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Missing equipment table
CREATE TABLE missing_equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES equipment(id),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  rental_id UUID NOT NULL,
  renter_id UUID NOT NULL REFERENCES auth.users(id),
  reported_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen_date TIMESTAMP NOT NULL,
  estimated_value DECIMAL(10, 2),
  status VARCHAR DEFAULT 'reported' CHECK (status IN ('reported', 'investigating', 'recovered', 'theft_filed')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Disputes table
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id UUID NOT NULL,
  renter_id UUID NOT NULL REFERENCES auth.users(id),
  lister_id UUID NOT NULL REFERENCES auth.users(id),
  equipment_id UUID NOT NULL REFERENCES equipment(id),
  type VARCHAR NOT NULL CHECK (type IN ('damage', 'missing', 'payment', 'quality', 'other')),
  description TEXT NOT NULL,
  renter_evidence JSONB,
  lister_evidence JSONB,
  resolution VARCHAR CHECK (resolution IN ('charge_renter', 'refund_lister', 'split')),
  resolution_details TEXT,
  status VARCHAR DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'closed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Enable RLS (Row Level Security)

For production, enable RLS on all admin tables:

```sql
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE damage_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE problematic_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE missing_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
```

Create policies that restrict access to admin users only.

### 3. Environment Variables

Add to `.env.local`:

```env
# Equipment Rental Admin
NEXT_PUBLIC_EQUIPMENT_API_BASE=http://localhost:3000/api/admin

# Notification Service
NEXT_PUBLIC_NOTIFICATION_SERVICE_URL=your_notification_service_url
NOTIFICATION_SERVICE_API_KEY=your_api_key

# Payment Processing
STRIPE_SECRET_KEY=your_stripe_key
BIT_API_KEY=your_bit_api_key

# Storage
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Implement API Endpoints

Replace the scaffolded endpoints with real implementations:

**Example: `/api/admin/equipment/route.ts`**

```typescript
import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('equipment')
      .select(`
        *,
        rental_history:rentals(*),
        damage_reports(*),
        owner:users(name, email)
      `)
      .eq('is_active', true);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error('Equipment fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch equipment' },
      { status: 500 }
    );
  }
}
```

### 5. Implement Notification System

Create a notification service for:

- **Damage Reports**: Email renter when approved/rejected
- **Commissions**: Email lister when invoice sent and payment received
- **Missing Equipment**: Email owner when equipment reported missing
- **Disputes**: Email both parties with resolution details
- **User Warnings**: Email user when flagged/warned

Example implementation:

```typescript
// lib/notifications/email-service.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function sendDamageNotification(
  renterEmail: string,
  equipmentName: string,
  repairCost: number,
  approved: boolean
) {
  const subject = approved 
    ? `Damage Claim Approved: ${equipmentName}`
    : `Damage Claim Rejected: ${equipmentName}`;
    
  const htmlContent = approved
    ? `Your damage claim for ${equipmentName} has been approved. Repair cost: $${repairCost}`
    : `Your damage claim for ${equipmentName} has been rejected.`;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: renterEmail,
    subject,
    html: htmlContent,
  });
}
```

### 6. Set Up Automated Tasks

For automatic detection of missing equipment, create a cron job:

```typescript
// lib/cron/missing-equipment-detection.ts
import { createAdminClient } from '@/lib/supabase/server';

export async function detectMissingEquipment() {
  const supabase = createAdminClient();
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  // Find rentals not returned 2+ days late
  const { data: overdueRentals, error } = await supabase
    .from('rentals')
    .select('*')
    .lt('end_date', twoDaysAgo.toISOString())
    .eq('status', 'active');

  if (error) throw error;

  // Create missing equipment reports for each
  for (const rental of overdueRentals) {
    await supabase
      .from('missing_equipment')
      .insert({
        equipment_id: rental.equipment_id,
        rental_id: rental.id,
        renter_id: rental.renter_id,
        owner_id: rental.owner_id,
        last_seen_date: rental.end_date,
        estimated_value: rental.equipment_value,
      });
  }
}
```

Schedule this to run daily:

```typescript
// pages/api/cron/missing-equipment.ts
export default async function handler(req, res) {
  // Verify cron secret
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await detectMissingEquipment();
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### 7. Connect State Management

The Zustand store is already set up. Verify it loads data on mount:

```typescript
useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await fetch('/api/admin/equipment');
      const data = await response.json();
      if (data.success) {
        setEquipment(data.data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  fetchData();
}, []);
```

### 8. Set Up Payment Processing

For marking commissions as paid:

```typescript
// lib/payments/commission-payment.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function processCommissionPayment(
  commissionId: string,
  amount: number,
  listerEmail: string
) {
  // Create payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'usd',
    description: `Commission payment for ${commissionId}`,
  });

  return paymentIntent;
}
```

### 9. Testing

Run the development server:

```bash
npm run dev
```

Navigate to:
- `http://localhost:3000/admin/equipment` - Equipment management
- `http://localhost:3000/admin/damage-reports` - Damage reports
- `http://localhost:3000/admin/problematic-users` - User management
- `http://localhost:3000/admin/commissions` - Commission tracking
- `http://localhost:3000/admin/missing-equipment` - Missing items
- `http://localhost:3000/admin/disputes` - Dispute resolution
- `http://localhost:3000/admin/equipment-analytics` - Analytics

### 10. Deployment Checklist

- [ ] Database tables created and migrated
- [ ] RLS policies configured
- [ ] Environment variables set in production
- [ ] API endpoints connected to Supabase
- [ ] Notification service integrated
- [ ] Payment processing configured
- [ ] Cron jobs scheduled
- [ ] Email templates created
- [ ] Testing completed
- [ ] Admin users seeded in database
- [ ] Backup system configured
- [ ] Monitoring/logging set up
- [ ] Rate limiting configured
- [ ] Audit logging enabled

## Notes

- All API endpoints return consistent JSON format
- Error handling includes try-catch and user-friendly messages
- Loading states prevent race conditions
- Store updates trigger component re-renders automatically
- All timestamps stored in UTC
- Images stored in Supabase Storage with public URLs
- Sensitive operations require admin authentication

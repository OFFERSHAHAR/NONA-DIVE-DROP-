CREATE TABLE payment_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending_confirmations', 'completed', 'failed')),
  total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_packages_customer_id ON payment_packages(customer_id);
CREATE INDEX idx_payment_packages_status ON payment_packages(status);
CREATE INDEX idx_payment_packages_created_at ON payment_packages(created_at DESC);

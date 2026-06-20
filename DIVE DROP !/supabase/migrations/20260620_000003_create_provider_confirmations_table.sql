CREATE TABLE provider_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES payment_packages(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE RESTRICT,
  confirmed_at TIMESTAMP,
  confirmed_by_user_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(package_id, provider_id)
);

CREATE INDEX idx_provider_confirmations_package_id ON provider_confirmations(package_id);
CREATE INDEX idx_provider_confirmations_provider_id ON provider_confirmations(provider_id);
CREATE INDEX idx_provider_confirmations_status ON provider_confirmations(status);

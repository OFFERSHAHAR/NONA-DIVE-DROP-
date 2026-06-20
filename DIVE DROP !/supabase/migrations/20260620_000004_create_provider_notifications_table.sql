CREATE TABLE provider_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES payment_packages(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'payment_confirmation',
  data JSONB,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_provider_notifications_provider_id ON provider_notifications(provider_id);
CREATE INDEX idx_provider_notifications_package_id ON provider_notifications(package_id);
CREATE INDEX idx_provider_notifications_read_at ON provider_notifications(read_at);
CREATE INDEX idx_provider_notifications_created_at ON provider_notifications(created_at DESC);

type OpenWaConfig = {
  apiBaseUrl: string;
  apiKey: string;
  sessionId: string;
  adminChatId: string;
  timeoutMs: number;
};

type WhatsAppNotifyResult =
  | { ok: true; status: 'sent'; messageId?: string }
  | { ok: false; status: 'disabled' | 'failed'; reason: string };

export type BookingLeadWhatsAppPayload = {
  id?: string;
  locale: string;
  requestType: string;
  category: string;
  module: string;
  siteSlug: string;
  itemSlug: string;
  contactName: string;
  phone: string;
  email: string;
  preferredDate: string;
  diverLevel: string;
  notes: string;
};

function getOpenWaConfig(): OpenWaConfig | null {
  const rawBaseUrl = process.env.OPENWA_BASE_URL?.trim();
  const apiKey = process.env.OPENWA_API_KEY?.trim();
  const sessionId = process.env.OPENWA_SESSION_ID?.trim();
  const adminChatId = process.env.OPENWA_ADMIN_CHAT_ID?.trim();
  const timeoutMs = Number(process.env.OPENWA_TIMEOUT_MS || 8000);

  if (!rawBaseUrl || !apiKey || !sessionId || !adminChatId) {
    return null;
  }

  const baseUrl = rawBaseUrl.replace(/\/+$/, '');
  const apiBaseUrl = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;

  return {
    apiBaseUrl,
    apiKey,
    sessionId,
    adminChatId,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 8000,
  };
}

function label(value: string, fallback = '-'): string {
  return value.trim() || fallback;
}

function buildBookingLeadMessage(lead: BookingLeadWhatsAppPayload): string {
  const lines = [
    'DiveDrop - ליד הזמנה חדש',
    lead.id ? `מספר ליד: ${lead.id}` : '',
    `שם: ${label(lead.contactName)}`,
    `טלפון: ${label(lead.phone)}`,
    `מייל: ${label(lead.email)}`,
    `סוג בקשה: ${label(lead.requestType)}`,
    `קטגוריה: ${label(lead.category)}`,
    `מודול: ${label(lead.module)}`,
    `אתר: ${label(lead.siteSlug)}`,
    `פריט: ${label(lead.itemSlug)}`,
    `תאריך מועדף: ${label(lead.preferredDate)}`,
    `רמת צולל: ${label(lead.diverLevel)}`,
    `שפה: ${label(lead.locale)}`,
    '',
    'הערות:',
    label(lead.notes, 'אין הערות'),
  ].filter(Boolean);

  return lines.join('\n').slice(0, 4096);
}

async function sendOpenWaText(config: OpenWaConfig, chatId: string, text: string): Promise<WhatsAppNotifyResult> {
  const response = await fetch(
    `${config.apiBaseUrl}/sessions/${encodeURIComponent(config.sessionId)}/messages/send-text`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey,
      },
      body: JSON.stringify({ chatId, text }),
      cache: 'no-store',
      signal: AbortSignal.timeout(config.timeoutMs),
    }
  );

  const responseText = await response.text();

  if (!response.ok) {
    return {
      ok: false,
      status: 'failed',
      reason: `OpenWA ${response.status}: ${responseText.slice(0, 500)}`,
    };
  }

  try {
    const payload = JSON.parse(responseText) as { messageId?: string };
    return { ok: true, status: 'sent', messageId: payload.messageId };
  } catch {
    return { ok: true, status: 'sent' };
  }
}

export async function notifyBookingLeadOnWhatsApp(
  lead: BookingLeadWhatsAppPayload
): Promise<WhatsAppNotifyResult> {
  const config = getOpenWaConfig();

  if (!config) {
    return {
      ok: false,
      status: 'disabled',
      reason: 'OpenWA environment variables are not configured.',
    };
  }

  try {
    return await sendOpenWaText(config, config.adminChatId, buildBookingLeadMessage(lead));
  } catch (error) {
    return {
      ok: false,
      status: 'failed',
      reason: error instanceof Error ? error.message : 'Unknown OpenWA error',
    };
  }
}

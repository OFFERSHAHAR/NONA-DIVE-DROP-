# DiveDrop WhatsApp / OpenWA setup

OpenWA is a separate WhatsApp gateway. Do not run it inside the Next.js app. The website sends server-side booking notifications to OpenWA after a booking lead is saved.

## 1. Start OpenWA

OpenWA was cloned here:

```powershell
C:\Users\GamingPC\Desktop\DIVE DROP !\integrations\OpenWA
```

Preferred local smoke test:

```powershell
cd "C:\Users\GamingPC\Desktop\DIVE DROP !\integrations\OpenWA"
docker compose -f docker-compose.dev.yml up -d
```

Open:

- Dashboard: `http://localhost:2785`
- API: `http://localhost:2785/api`
- API docs: `http://localhost:2785/api/docs`

If Docker is not running, use the OpenWA README local-dev path instead.

## 2. Create a WhatsApp session

In OpenWA:

1. Create a session for DiveDrop.
2. Start the session.
3. Scan the QR code with the WhatsApp account that should send messages.
4. Confirm the session status is `ready`.
5. Create an API key with `operator` role for the website.

REST calls use `X-API-Key`. Do not put the key in the URL.

## 3. Configure the website

Set these environment variables on the Next.js server:

```env
OPENWA_BASE_URL=http://localhost:2785
OPENWA_API_KEY=owa_k1_your-openwa-operator-key
OPENWA_SESSION_ID=your-openwa-session-id
OPENWA_ADMIN_CHAT_ID=972500000000@c.us
OPENWA_TIMEOUT_MS=8000
```

For Render, `OPENWA_BASE_URL` must be a public URL that Render can reach. `http://localhost:2785` only works when the Next.js app and OpenWA are on the same machine. For a live MVP use a deployed OpenWA service or a temporary tunnel.

## 4. Test a direct send

```powershell
$base = "http://localhost:2785"
$session = "your-openwa-session-id"
$key = "owa_k1_your-openwa-operator-key"

Invoke-RestMethod `
  -Method Post `
  -Uri "$base/api/sessions/$session/messages/send-text" `
  -Headers @{ "X-API-Key" = $key } `
  -ContentType "application/json" `
  -Body '{"chatId":"972500000000@c.us","text":"DiveDrop OpenWA test"}'
```

## 5. What the website does

When a customer submits `/he/bookings`, DiveDrop:

1. Saves the lead in `booking_requests`.
2. Sends a WhatsApp message to `OPENWA_ADMIN_CHAT_ID`.
3. Keeps the booking successful even if OpenWA is not configured or temporarily down.

OpenWA is based on WhatsApp Web automation, not the official WhatsApp Business Cloud API. Use it carefully for MVP/internal workflows.

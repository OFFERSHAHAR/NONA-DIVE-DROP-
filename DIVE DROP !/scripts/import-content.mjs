import fs from 'node:fs/promises';
import path from 'node:path';

const [, , fileArg, baseUrlArg, tokenArg] = process.argv;

if (!fileArg) {
  console.error('Usage: node scripts/import-content.mjs <content.json> [baseUrl] [CONTENT_ADMIN_TOKEN]');
  process.exit(1);
}

const baseUrl = (baseUrlArg || process.env.CONTENT_IMPORT_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const token = tokenArg || process.env.CONTENT_ADMIN_TOKEN;

if (!token) {
  console.error('Missing CONTENT_ADMIN_TOKEN. Pass it as the third argument or set it in the environment.');
  process.exit(1);
}

const filePath = path.resolve(process.cwd(), fileArg);
const raw = await fs.readFile(filePath, 'utf8');
const payload = JSON.parse(raw);
const items = Array.isArray(payload) ? payload : payload.items;

if (!Array.isArray(items) || items.length === 0) {
  console.error('Content file must be an array or { "items": [...] }.');
  process.exit(1);
}

const response = await fetch(`${baseUrl}/api/content/import`, {
  method: 'POST',
  headers: {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  },
  body: JSON.stringify({ items }),
});

const result = await response.json().catch(() => ({}));

if (!response.ok || !result.ok) {
  console.error('Import failed:', JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(`Imported ${result.imported} content items into ${baseUrl}`);
console.log(`Kinds: ${(result.kinds || []).join(', ')}`);

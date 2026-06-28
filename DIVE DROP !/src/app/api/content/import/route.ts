import { createAdminClient } from '@/lib/supabase/admin';
import type { Database, Json } from '@/types/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const allowedKinds = new Set([
  'dive_site',
  'club',
  'instructor',
  'pickup',
  'boat',
  'dive_option',
  'free_diving',
  'equipment',
  'asset',
]);

type ContentInsert = Database['public']['Tables']['content_items']['Insert'];

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"`]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function asNumber(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return fallback;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
}

function asMetadata(value: unknown): Json {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Json;
}

function normalizeContentItem(input: Record<string, unknown>, index: number): ContentInsert {
  const kind = asString(input.kind);
  const titleHe = asString(input.title_he || input.title || input.name);
  const titleEn = asString(input.title_en);
  const slug = asString(input.slug) || slugify(`${titleEn || titleHe || 'content'}-${index + 1}`);

  if (!allowedKinds.has(kind)) {
    throw new Error(`items[${index}].kind must be one of: ${Array.from(allowedKinds).join(', ')}`);
  }

  if (!titleHe) {
    throw new Error(`items[${index}].title_he is required`);
  }

  if (!slug) {
    throw new Error(`items[${index}].slug could not be generated`);
  }

  return {
    kind,
    slug,
    title_he: titleHe,
    title_en: titleEn,
    summary_he: asString(input.summary_he || input.description_he || input.description),
    summary_en: asString(input.summary_en || input.description_en),
    body_he: asString(input.body_he),
    body_en: asString(input.body_en),
    location: asString(input.location),
    image_url: asString(input.image_url || input.image),
    tags: asStringArray(input.tags),
    metadata: asMetadata(input.metadata),
    sort_order: asNumber(input.sort_order, 100 + index),
    is_published: input.is_published !== false,
  };
}

function getBearerToken(request: Request) {
  const auth = request.headers.get('authorization') || '';
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  return bearer || request.headers.get('x-content-admin-token') || '';
}

export async function POST(request: Request) {
  const expectedToken = process.env.CONTENT_ADMIN_TOKEN;
  if (!expectedToken) {
    return Response.json({ ok: false, error: 'CONTENT_ADMIN_TOKEN is not configured' }, { status: 501 });
  }

  if (getBearerToken(request) !== expectedToken) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return Response.json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' }, { status: 501 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const rawItems = Array.isArray(body)
    ? body
    : body && typeof body === 'object' && Array.isArray((body as { items?: unknown }).items)
      ? (body as { items: unknown[] }).items
      : null;

  if (!rawItems || rawItems.length === 0) {
    return Response.json({ ok: false, error: 'Body must be an array or { "items": [...] }' }, { status: 400 });
  }

  let items: ContentInsert[];
  try {
    items = rawItems.map((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        throw new Error(`items[${index}] must be an object`);
      }
      return normalizeContentItem(item as Record<string, unknown>, index);
    });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : 'Invalid content item' }, { status: 400 });
  }

  const { error } = await supabase
    .from('content_items')
    .upsert(items, { onConflict: 'kind,slug' });

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({
    ok: true,
    imported: items.length,
    kinds: Array.from(new Set(items.map((item) => item.kind))).sort(),
  });
}

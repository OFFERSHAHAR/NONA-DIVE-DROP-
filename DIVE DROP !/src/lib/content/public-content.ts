import { createClient } from '@/lib/supabase/server';
import type { AppIconName } from '@/components/AppIcon';
import type { Database, Json } from '@/types/supabase';

export type DiveSite = Database['public']['Tables']['dive_sites']['Row'];
export type ContentItem = Database['public']['Tables']['content_items']['Row'];
export type ServiceCategoryKey = 'clubs' | 'instructors' | 'pickups' | 'boat' | 'dive';
export type ServiceCatalogEntry = {
  title: { he: string; en: string };
  subtitle: { he: string; en: string };
  icon: AppIconName;
  items: Array<{ slug?: string; title: string; desc: string; badge: string; icon: AppIconName }>;
};

const serviceKindByCategory: Record<ServiceCategoryKey, string> = {
  clubs: 'club',
  instructors: 'instructor',
  pickups: 'pickup',
  boat: 'boat',
  dive: 'dive_option',
};

function metadataRecord(value: Json): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return fallback;
}

function difficultyValue(value: unknown): DiveSite['difficulty'] {
  if (value === 'easy' || value === 'beginner') return 'easy';
  if (value === 'hard' || value === 'advanced' || value === 'professional') return 'hard';
  return 'intermediate';
}

function iconValue(value: unknown, fallback: AppIconName): AppIconName {
  return typeof value === 'string' && value.trim() ? (value.trim() as AppIconName) : fallback;
}

export function contentItemToDiveSite(item: ContentItem, fallback: DiveSite, index = 0): DiveSite {
  const metadata = metadataRecord(item.metadata);
  return {
    id: item.slug,
    name: text(item.title_he, item.title_en || fallback.name),
    description: text(item.summary_he, item.summary_en || fallback.description),
    location: text(item.location, fallback.location || 'אילת'),
    latitude: numberValue(metadata.latitude ?? metadata.lat, fallback.latitude),
    longitude: numberValue(metadata.longitude ?? metadata.lng, fallback.longitude),
    depth: numberValue(metadata.depth ?? metadata.max_depth_m ?? metadata.max_depth, fallback.depth),
    difficulty: difficultyValue(metadata.difficulty ?? fallback.difficulty),
    image_url: text(item.image_url, text(metadata.image_url, fallback.image_url || '/divedrop-hero-v2.png')),
    created_at: item.created_at || fallback.created_at || '',
    updated_at: item.updated_at || fallback.updated_at || '',
  };
}

export async function getPublishedDiveSites(referenceSites: DiveSite[]): Promise<DiveSite[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('content_items')
      .select('*')
      .eq('kind', 'dive_site')
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      const seen = new Set<string>();
      return data
        .map((item, index) => contentItemToDiveSite(item, referenceSites[index % referenceSites.length], index))
        .filter((site) => {
          const key = site.id || site.name.trim().toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
    }
  } catch {
    // The content table may not exist before the Supabase migration is applied.
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('dive_sites')
      .select('*')
      .order('created_at', { ascending: false });

    if (!data || data.length === 0) return referenceSites;

    const seen = new Set<string>();
    return data
      .map((site, index) => ({
        ...site,
        name: site.name || referenceSites[index % referenceSites.length].name,
        description: site.description || referenceSites[index % referenceSites.length].description,
        location: site.location || 'אילת',
        depth: site.depth || referenceSites[index % referenceSites.length].depth,
        difficulty: site.difficulty || referenceSites[index % referenceSites.length].difficulty,
        image_url: site.image_url || '/divedrop-hero-v2.png',
      }))
      .filter((site) => {
        const key = site.name.trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  } catch {
    return referenceSites;
  }
}

export async function getPublishedContentItemsByKind(kind: string): Promise<ContentItem[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('content_items')
      .select('*')
      .eq('kind', kind)
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    return data || [];
  } catch {
    return [];
  }
}

export async function getDiveSiteById(id: string, referenceSites: DiveSite[]): Promise<DiveSite | null> {
  const referenceSite = referenceSites.find((site) => site.id === id);
  if (referenceSite) return referenceSite;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('content_items')
      .select('*')
      .eq('kind', 'dive_site')
      .eq('slug', id)
      .eq('is_published', true)
      .maybeSingle();

    if (data) {
      return contentItemToDiveSite(data, referenceSites[0]);
    }
  } catch {
    // Fall through to the legacy table.
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase.from('dive_sites').select('*').eq('id', id).maybeSingle();
    return data ? { ...data, image_url: data.image_url || '/divedrop-hero-v2.png' } : null;
  } catch {
    return null;
  }
}

export async function getPublishedServiceCatalog(
  serviceKey: ServiceCategoryKey,
  fallbackCatalog: Record<ServiceCategoryKey, ServiceCatalogEntry>
): Promise<ServiceCatalogEntry> {
  const fallback = fallbackCatalog[serviceKey];
  const kind = serviceKindByCategory[serviceKey];

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('content_items')
      .select('*')
      .eq('kind', kind)
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (!data || data.length === 0) return fallback;

    return {
      ...fallback,
      items: data.map((item) => {
        const metadata = metadataRecord(item.metadata);
        return {
          slug: item.slug,
          title: text(item.title_he, item.title_en || item.slug),
          desc: text(item.summary_he, item.summary_en || fallback.subtitle.he),
          badge: text(metadata.badge, text(item.location, fallback.items[0]?.badge || 'זמין')),
          icon: iconValue(metadata.icon, fallback.icon),
        };
      }),
    };
  } catch {
    return fallback;
  }
}

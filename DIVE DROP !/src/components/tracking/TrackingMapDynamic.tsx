import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';

/**
 * Dynamic import wrapper for TrackingMap
 * Prevents Leaflet from being bundled with the main JS
 * Loads map component on-demand with a loading fallback
 */
const TrackingMapDynamic = dynamic(
  () => import('./TrackingMap').then((mod) => ({ default: mod.TrackingMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-slate-100 to-slate-50 rounded-lg">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
          <p className="text-sm text-slate-600">Loading map...</p>
        </div>
      </div>
    ),
  }
);

export default TrackingMapDynamic;

export type TrackingMapProps = ComponentProps<typeof TrackingMapDynamic>;

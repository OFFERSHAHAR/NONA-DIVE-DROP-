import type { CSSProperties, HTMLAttributes } from 'react';

export type AppIconName =
  | 'arrow-left'
  | 'arrow-right'
  | 'award'
  | 'bell'
  | 'boat'
  | 'calendar'
  | 'chart'
  | 'check'
  | 'clock'
  | 'compass'
  | 'coral'
  | 'depth'
  | 'diver'
  | 'filter'
  | 'fire'
  | 'grid'
  | 'heart'
  | 'heart-filled'
  | 'home'
  | 'info'
  | 'location'
  | 'level'
  | 'menu'
  | 'message'
  | 'search'
  | 'settings'
  | 'star'
  | 'star-filled'
  | 'store'
  | 'user'
  | 'users'
  | 'van'
  | 'waves'
  | 'x';

const assetNames: Record<AppIconName, string> = {
  'arrow-left': 'arrow-left',
  'arrow-right': 'arrow-right',
  award: 'shield-check',
  bell: 'bell',
  boat: 'boat',
  calendar: 'calendar',
  chart: 'trending-up',
  check: 'check',
  clock: 'clock',
  compass: 'compass',
  coral: 'coral',
  depth: 'depth',
  diver: 'diver',
  filter: 'sliders',
  fire: 'fire',
  grid: 'grid',
  heart: 'heart',
  'heart-filled': 'heart-filled',
  home: 'home',
  info: 'info',
  location: 'map-pin',
  level: 'level',
  menu: 'menu',
  message: 'message',
  search: 'search',
  settings: 'settings',
  star: 'star',
  'star-filled': 'star-filled',
  store: 'store',
  user: 'user',
  users: 'group',
  van: 'van',
  waves: 'wave',
  x: 'x',
};

type AppIconProps = HTMLAttributes<HTMLSpanElement> & { name: AppIconName };

export function AppIcon({ name, className = 'h-6 w-6', style, ...props }: AppIconProps) {
  const url = `/assets/icons/${assetNames[name]}.svg`;
  const maskStyle: CSSProperties = {
    WebkitMaskImage: `url("${url}")`,
    maskImage: `url("${url}")`,
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskSize: 'contain',
    maskSize: 'contain',
    backgroundColor: 'currentColor',
    ...style,
  };

  return <span aria-hidden="true" className={`inline-block shrink-0 ${className}`} style={maskStyle} {...props} />;
}

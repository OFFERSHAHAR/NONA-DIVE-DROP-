import { Inter, Poppins } from 'next/font/google';

/**
 * Primary font for body text
 * - Optimized for readability
 * - Preloaded for better performance
 * - Variable weight support
 */
export const inter = Inter({
  subsets: ['latin', 'hebrew'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
  weight: ['400', '500', '600', '700'],
});

/**
 * Secondary font for headings
 * - Premium, distinctive appearance
 * - Preloaded for better performance
 * - Variable weight support
 */
export const poppins = Poppins({
  subsets: ['latin', 'hebrew'],
  display: 'swap',
  variable: '--font-poppins',
  preload: true,
  weight: ['500', '600', '700', '800'],
});

/**
 * Combined font variables for use in layout.tsx
 */
export const fontVariables = `${inter.variable} ${poppins.variable}`;

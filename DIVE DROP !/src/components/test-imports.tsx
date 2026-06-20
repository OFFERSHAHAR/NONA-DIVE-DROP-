// This file tests that all components can be imported without errors
import { DiveSiteCard } from './DiveSiteCard';
import { CategoryButton, CategoryGrid } from './CategoryButton';
import { SearchPanel } from './SearchPanel';
import { RecentDiveCard, RecentDiveList } from './RecentDiveCard';

// Type check to ensure props match the spec
const testDiveSiteCard: React.ComponentProps<typeof DiveSiteCard> = {
  name: 'הגנים היפנים',
  imageUrl: 'https://example.com/image.jpg',
  maxDepth: 18,
  difficulty: 'easy',
  duration: 20,
  rating: 4.8,
  reviews: 128,
  badge: 'match',
  isFavorite: false,
};

const testCategoryButton: React.ComponentProps<typeof CategoryButton> = {
  icon: 'coral',
  label: 'אתרי צלילה',
  href: '/en/explore',
};

const testSearchPanel: React.ComponentProps<typeof SearchPanel> = {
  onSearch: (filters) => console.log(filters),
  locale: 'he',
};

const testRecentDiveCard: React.ComponentProps<typeof RecentDiveCard> = {
  name: 'שונית הכרישים',
  imageUrl: 'https://example.com/image.jpg',
  type: 'צלילות סירה מודרכת',
  date: '20.05.2024',
  time: '08:00',
  organized: true,
  instructor: 'אורי לוי',
  participants: 6,
};

export { testDiveSiteCard, testCategoryButton, testSearchPanel, testRecentDiveCard };

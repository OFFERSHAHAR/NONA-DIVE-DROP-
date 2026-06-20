const fs = require('fs');

const REQUIRED_PAGES = {
  'PUBLIC': [
    '/about',
    '/contact',
  ],
  'PROTECTED': [
    '/free-diving/partner-matching',
    '/free-diving/instructors',
    '/free-diving/instructors/[id]',
    '/free-diving/sessions',
    '/equipment/listings',
    '/equipment/rentals',
  ],
  'ADMIN': [
  ]
};

const missing = [];
const found = [];

for (const [category, pages] of Object.entries(REQUIRED_PAGES)) {
  for (const route of pages) {
    const patterns = [
      `src/app/[locale]${route}/page.tsx`,
      `src/app/[locale]${route}.tsx`,
    ];
    
    let exists = patterns.some(p => fs.existsSync(p));
    if (!exists) {
      missing.push({ category, route });
    } else {
      found.push({ category, route });
    }
  }
}

console.log('\n📋 MISSING PAGES (Critical):\n');
if (missing.length === 0) {
  console.log('✅ All critical pages exist!\n');
} else {
  missing.forEach(p => {
    console.log(`❌ ${p.category.padEnd(10)} | ${p.route}`);
  });
}

console.log('\n📋 OPTIONAL PAGES (Not implemented):\n');
const optional = [
  '/about',
  '/contact',
  '/free-diving/partner-matching',
  '/free-diving/instructors',
  '/free-diving/sessions',
  '/equipment/listings',
  '/equipment/rentals',
];
optional.forEach(route => {
  const exists = fs.existsSync(`src/app/[locale]${route}/page.tsx`);
  console.log(`${exists ? '✅' : '⚠️ '} ${route}`);
});

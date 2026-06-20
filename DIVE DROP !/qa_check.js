const fs = require('fs');
const path = require('path');

const pages = {
  'PUBLIC_PAGES': [
    ['/', 'Home'],
    ['/auth/login', 'Login'],
    ['/auth/register', 'Register'],
    ['/admin/login', 'Admin Login'],
  ],
  'PROTECTED_PAGES': [
    ['/find-buddy', 'Find Buddy'],
    ['/bookings/new', 'New Booking'],
    ['/bookings/my-bookings', 'My Bookings'],
    ['/bookings/[id]', 'Booking Details'],
    ['/free-diving', 'Free Diving'],
    ['/service-providers', 'Service Providers'],
    ['/service-providers/[id]', 'Service Provider Details'],
    ['/tracking/[trip_id]', 'Live Tracking'],
    ['/my-dives', 'My Dives'],
    ['/profile', 'My Profile'],
    ['/settings', 'Settings'],
  ],
  'ADMIN_PAGES': [
    ['/admin', 'Admin Dashboard (index)'],
    ['/admin/dashboard', 'Admin Dashboard'],
    ['/admin/photos', 'Photo Moderation'],
    ['/admin/photos/pending', 'Pending Photos'],
    ['/admin/photos/approved', 'Approved Photos'],
    ['/admin/photos/rejected', 'Rejected Photos'],
    ['/admin/users', 'User Management'],
    ['/admin/dive-sites', 'Manage Dive Sites'],
    ['/admin/shuttles', 'Manage Shuttles'],
    ['/admin/equipment', 'Equipment Management'],
    ['/admin/damage-reports', 'Damage Reports'],
    ['/admin/commissions', 'Commissions'],
    ['/admin/audit-logs', 'Audit Logs'],
    ['/admin/system-settings', 'System Settings'],
    ['/admin/missing-equipment', 'Missing Equipment'],
    ['/admin/problematic-users', 'Problematic Users'],
    ['/admin/disputes', 'Disputes'],
    ['/admin/equipment-analytics', 'Equipment Analytics'],
  ],
  'ERROR_PAGES': [
    ['/unauthorized', '401 Unauthorized'],
    ['/forbidden', '403 Forbidden'],
    ['/error', 'Error Handler'],
  ]
};

const results = {};

for (const [category, pagesList] of Object.entries(pages)) {
  results[category] = [];
  
  for (const [route, name] of pagesList) {
    let filePath;
    let status = '❌ MISSING';
    
    // Try different file patterns
    const patterns = [
      `src/app/[locale]${route}/page.tsx`,
      `src/app/[locale]${route}.tsx`,
      `src/app/[locale]/${route}/page.tsx`,
      `src/app/[locale]/${route}.tsx`,
    ];
    
    for (const pattern of patterns) {
      if (fs.existsSync(pattern)) {
        status = '✅ EXISTS';
        filePath = pattern;
        break;
      }
    }
    
    results[category].push({
      name,
      route,
      status,
      path: filePath || 'NOT FOUND'
    });
  }
}

// Print results
console.log('\n═══════════════════════════════════════════════════════\n');
for (const [category, pages] of Object.entries(results)) {
  console.log(`📋 ${category}`);
  console.log('─'.repeat(50));
  pages.forEach(p => {
    console.log(`${p.status} ${p.name.padEnd(35)} ${p.route}`);
  });
  console.log('');
}

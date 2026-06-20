const fs = require('fs');

const pages = [
  // PUBLIC PAGES
  { name: 'Home', path: '/', type: 'PUBLIC', exists: true },
  { name: 'Login', path: '/auth/login', type: 'PUBLIC', exists: true },
  { name: 'Register', path: '/auth/register', type: 'PUBLIC', exists: true },
  { name: 'Admin Login', path: '/admin/login', type: 'PUBLIC', exists: true },
  { name: 'About', path: '/about', type: 'PUBLIC', exists: false },
  { name: 'Contact', path: '/contact', type: 'PUBLIC', exists: false },

  // PROTECTED PAGES
  { name: 'Find Buddy', path: '/find-buddy', type: 'PROTECTED', exists: true },
  { name: 'New Booking', path: '/bookings/new', type: 'PROTECTED', exists: true },
  { name: 'My Bookings', path: '/bookings/my-bookings', type: 'PROTECTED', exists: true },
  { name: 'Booking Details', path: '/bookings/[id]', type: 'PROTECTED', exists: true },
  { name: 'Free Diving', path: '/free-diving', type: 'PROTECTED', exists: true },
  { name: 'Free Diving - Partner Matching', path: '/free-diving/partner-matching', type: 'PROTECTED', exists: false },
  { name: 'Free Diving - Instructors', path: '/free-diving/instructors', type: 'PROTECTED', exists: false },
  { name: 'Free Diving - Instructor Details', path: '/free-diving/instructors/[id]', type: 'PROTECTED', exists: false },
  { name: 'Free Diving - Sessions', path: '/free-diving/sessions', type: 'PROTECTED', exists: false },
  { name: 'Service Providers', path: '/service-providers', type: 'PROTECTED', exists: true },
  { name: 'Service Provider Details', path: '/service-providers/[id]', type: 'PROTECTED', exists: true },
  { name: 'Equipment - Listings', path: '/equipment/listings', type: 'PROTECTED', exists: false },
  { name: 'Equipment - Rentals', path: '/equipment/rentals', type: 'PROTECTED', exists: false },
  { name: 'Live Tracking', path: '/tracking/[trip_id]', type: 'PROTECTED', exists: true },
  { name: 'My Dives', path: '/my-dives', type: 'PROTECTED', exists: true },
  { name: 'My Profile', path: '/profile', type: 'PROTECTED', exists: true },
  { name: 'Settings', path: '/settings', type: 'PROTECTED', exists: true },

  // ADMIN PAGES
  { name: 'Admin Dashboard (Index)', path: '/admin', type: 'ADMIN', exists: true },
  { name: 'Admin Dashboard', path: '/admin/dashboard', type: 'ADMIN', exists: true },
  { name: 'Photo Moderation', path: '/admin/photos', type: 'ADMIN', exists: true },
  { name: 'Pending Photos', path: '/admin/photos/pending', type: 'ADMIN', exists: true },
  { name: 'Approved Photos', path: '/admin/photos/approved', type: 'ADMIN', exists: true },
  { name: 'Rejected Photos', path: '/admin/photos/rejected', type: 'ADMIN', exists: true },
  { name: 'User Management', path: '/admin/users', type: 'ADMIN', exists: true },
  { name: 'Manage Dive Sites', path: '/admin/dive-sites', type: 'ADMIN', exists: true },
  { name: 'Manage Shuttles', path: '/admin/shuttles', type: 'ADMIN', exists: true },
  { name: 'Equipment Management', path: '/admin/equipment', type: 'ADMIN', exists: true },
  { name: 'Damage Reports', path: '/admin/damage-reports', type: 'ADMIN', exists: true },
  { name: 'Commissions', path: '/admin/commissions', type: 'ADMIN', exists: true },
  { name: 'Audit Logs', path: '/admin/audit-logs', type: 'ADMIN', exists: true },
  { name: 'System Settings', path: '/admin/system-settings', type: 'ADMIN', exists: true },
  { name: 'Missing Equipment', path: '/admin/missing-equipment', type: 'ADMIN', exists: true },
  { name: 'Problematic Users', path: '/admin/problematic-users', type: 'ADMIN', exists: true },
  { name: 'Disputes', path: '/admin/disputes', type: 'ADMIN', exists: true },
  { name: 'Equipment Analytics', path: '/admin/equipment-analytics', type: 'ADMIN', exists: true },

  // ERROR PAGES
  { name: '401 Unauthorized', path: '/unauthorized', type: 'ERROR', exists: true },
  { name: '403 Forbidden', path: '/forbidden', type: 'ERROR', exists: true },
  { name: 'Error Handler', path: '/error', type: 'ERROR', exists: true },
];

// Group by type
const grouped = {};
pages.forEach(p => {
  if (!grouped[p.type]) grouped[p.type] = [];
  grouped[p.type].push(p);
});

// Print report
console.log('\n' + '='.repeat(80));
console.log('QA REPORT: DIVE DROP PAGE STRUCTURE');
console.log('='.repeat(80) + '\n');

let totalExist = 0;
let totalMissing = 0;

for (const [type, typePages] of Object.entries(grouped)) {
  const existing = typePages.filter(p => p.exists).length;
  const missing = typePages.filter(p => !p.exists).length;
  totalExist += existing;
  totalMissing += missing;

  console.log(`\n${type} PAGES (${existing}/${typePages.length} exist)`);
  console.log('-'.repeat(80));

  typePages.forEach(p => {
    const status = p.exists ? 'OK' : 'MISSING';
    console.log(`[${status}] ${p.name.padEnd(45)} ${p.path}`);
  });
}

console.log('\n' + '='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log(`Pages Implemented: ${totalExist}/${pages.length} (${Math.round(totalExist/pages.length*100)}%)`);
console.log(`Pages Missing:     ${totalMissing}/${pages.length}`);

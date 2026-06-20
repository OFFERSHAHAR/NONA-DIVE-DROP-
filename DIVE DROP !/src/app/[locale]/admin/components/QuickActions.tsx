'use client';

import Link from 'next/link';

export default function QuickActions() {
  const quickActions = [
    {
      icon: '📷',
      title: 'Approve Photos',
      description: 'Review pending photo uploads',
      href: '/admin/photos/pending',
      count: 12,
      color: 'from-amber-500 to-orange-500',
    },
    {
      icon: '👥',
      title: 'Manage Users',
      description: 'View and manage user accounts',
      href: '/admin/users',
      count: 8,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: '💰',
      title: 'Payments',
      description: 'Process and track payments',
      href: '/admin/commissions',
      count: 5,
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: '🏖️',
      title: 'Dive Sites',
      description: 'Manage dive locations',
      href: '/admin/dive-sites',
      count: 3,
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: '🎒',
      title: 'Equipment',
      description: 'Track equipment rentals',
      href: '/admin/equipment',
      count: 6,
      color: 'from-indigo-500 to-blue-500',
    },
    {
      icon: '⚠️',
      title: 'Reports',
      description: 'View damage reports',
      href: '/admin/damage-reports',
      count: 2,
      color: 'from-red-500 to-rose-500',
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Quick Actions</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Fast access to critical management tasks
          </p>
        </div>
        <span className="text-3xl">⚡</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group relative overflow-hidden rounded-lg p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
          >
            {/* Gradient Background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-10 group-hover:opacity-20 transition-opacity`}></div>

            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{action.icon}</span>
                {action.count > 0 && (
                  <span className="inline-block px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                    {action.count}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                {action.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {action.description}
              </p>
            </div>

            {/* Border */}
            <div className={`absolute inset-0 border-2 border-transparent group-hover:border-current opacity-0 group-hover:opacity-10 rounded-lg transition-opacity`}></div>
          </Link>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="mt-6 p-4 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700/30 dark:to-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-900 dark:text-white">Need Help?</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Check our documentation for detailed guides
            </p>
          </div>
          <a
            href="/admin/settings"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Documentation
          </a>
        </div>
      </div>
    </div>
  );
}

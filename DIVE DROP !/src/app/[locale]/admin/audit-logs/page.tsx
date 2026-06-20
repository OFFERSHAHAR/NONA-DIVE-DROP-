'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

interface AuditLog {
  id: string;
  admin: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  timestamp: string;
  status: 'success' | 'failed';
  ipAddress: string;
}

export default function AuditLogsPage() {
  const t = useTranslations('admin');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState('all');

  useEffect(() => {
    // Mock data
    const mockLogs: AuditLog[] = [
      {
        id: '1',
        admin: 'admin@diverop.com',
        action: 'DELETE',
        entity: 'User',
        entityId: 'user-123',
        details: 'Deleted user account due to violation',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        status: 'success',
        ipAddress: '192.168.1.1',
      },
      {
        id: '2',
        admin: 'admin@diverop.com',
        action: 'UPDATE',
        entity: 'Commission',
        entityId: 'comm-456',
        details: 'Updated commission rate to 15%',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        status: 'success',
        ipAddress: '192.168.1.1',
      },
      {
        id: '3',
        admin: 'moderator@diverop.com',
        action: 'APPROVE',
        entity: 'Photo',
        entityId: 'photo-789',
        details: 'Approved user photo submission',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        status: 'success',
        ipAddress: '192.168.1.2',
      },
      {
        id: '4',
        admin: 'admin@diverop.com',
        action: 'BLOCK',
        entity: 'User',
        entityId: 'user-101',
        details: 'Blocked user for suspicious activity',
        timestamp: new Date(Date.now() - 1000 * 3600).toISOString(),
        status: 'success',
        ipAddress: '192.168.1.1',
      },
      {
        id: '5',
        admin: 'admin@diverop.com',
        action: 'CREATE',
        entity: 'DiveSite',
        entityId: 'site-202',
        details: 'Created new dive site: Red Sea Reef',
        timestamp: new Date(Date.now() - 1000 * 3600 * 2).toISOString(),
        status: 'success',
        ipAddress: '192.168.1.1',
      },
    ];

    setLogs(mockLogs);
    setFilteredLogs(mockLogs);
  }, []);

  useEffect(() => {
    let filtered = logs;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          log.admin.includes(searchTerm) ||
          log.action.includes(searchTerm) ||
          log.entity.includes(searchTerm) ||
          log.details.includes(searchTerm)
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter((log) => log.action === filterType);
    }

    // Date filter
    if (filterDate !== 'all') {
      const now = Date.now();
      const filterMs =
        filterDate === '1h'
          ? 1000 * 3600
          : filterDate === '24h'
            ? 1000 * 3600 * 24
            : filterDate === '7d'
              ? 1000 * 3600 * 24 * 7
              : 0;

      filtered = filtered.filter(
        (log) => now - new Date(log.timestamp).getTime() <= filterMs
      );
    }

    setFilteredLogs(filtered);
  }, [searchTerm, filterType, filterDate, logs]);

  const getActionColor = (action: string) => {
    const colors: { [key: string]: string } = {
      CREATE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      UPDATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      APPROVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      REJECT: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      BLOCK: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return colors[action] || 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300';
  };

  const getEntityIcon = (entity: string) => {
    const icons: { [key: string]: string } = {
      User: '👤',
      Photo: '📷',
      DiveSite: '🏖️',
      Equipment: '🎒',
      Commission: '💰',
      Shuttle: '🚐',
    };
    return icons[entity] || '📋';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Audit Logs
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Track all admin actions and system changes
          </p>
        </div>
        <button
          onClick={() => {
            const csv = [
              ['Admin', 'Action', 'Entity', 'Details', 'Timestamp', 'Status'],
              ...filteredLogs.map((log) => [
                log.admin,
                log.action,
                log.entity,
                log.details,
                new Date(log.timestamp).toLocaleString(),
                log.status,
              ]),
            ]
              .map((row) => row.map((cell) => `"${cell}"`).join(','))
              .join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-logs-${new Date().toISOString()}.csv`;
            a.click();
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          📥 Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by admin, action, entity..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action Type Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Action Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="APPROVE">Approve</option>
              <option value="BLOCK">Block</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Time Range
            </label>
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                  Admin
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                  Entity
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {log.admin}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getEntityIcon(log.entity)}</span>
                        <span className="text-sm text-slate-900 dark:text-white">
                          {log.entity}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xs">
                        {log.details}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          log.status === 'success'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}
                      >
                        {log.status === 'success' ? '✅' : '❌'} {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <p className="text-slate-600 dark:text-slate-400">
                      No logs found matching your criteria
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Showing {filteredLogs.length} of {logs.length} logs
          </p>
          <div className="flex gap-2">
            <button className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
              Previous
            </button>
            <button className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-900 dark:text-blue-300">
          <span className="font-semibold">Note:</span> All admin actions are logged automatically for security and audit purposes. Logs are retained for 90 days.
        </p>
      </div>
    </div>
  );
}

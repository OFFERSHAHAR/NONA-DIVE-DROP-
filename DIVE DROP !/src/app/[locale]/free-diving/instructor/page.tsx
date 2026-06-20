export const dynamic = 'force-dynamic';

'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { AppIcon } from '@/components/AppIcon';

interface Session {
  id: string;
  title: string;
  status: string;
  start_date: string;
  start_time: string;
  location: string;
  capacity: number;
  current_participants: number;
  price_shekel: number;
}

interface Roster {
  id: string;
  user_id: string;
  attended?: boolean;
  check_in_time?: string;
  instructor_notes?: string;
}

export default function InstructorSessionsPage() {
  const locale = useLocale();
  const isRTL = locale === 'he';
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [roster, setRoster] = useState<Roster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/instructor/sessions');
        const data = await response.json();
        setSessions(data.sessions || []);
      } catch (error) {
        console.error('Error fetching sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  useEffect(() => {
    const fetchRoster = async () => {
      if (!selectedSession) {
        setRoster([]);
        return;
      }

      try {
        const response = await fetch(`/api/instructor/sessions?sessionId=${selectedSession}`);
        const data = await response.json();
        setRoster(data.roster || []);
      } catch (error) {
        console.error('Error fetching roster:', error);
      }
    };

    fetchRoster();
  }, [selectedSession]);

  const labels = {
    en: {
      title: 'My Sessions',
      subtitle: 'Manage your sessions and participant roster',
      createNew: 'Create New Session',
      scheduled: 'Scheduled',
      inProgress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
      noSessions: 'No sessions yet',
      roster: 'Session Roster',
      selectSession: 'Select a session to view roster',
      participants: 'Participants',
      revenue: 'Total Revenue',
      capacity: 'Capacity',
      startDate: 'Start Date',
      actions: 'Actions',
      markComplete: 'Mark Complete',
      cancelSession: 'Cancel',
      loading: 'Loading sessions...',
    },
    he: {
      title: 'הצלילות שלי',
      subtitle: 'נהל את הצלילות שלך ורשימת המשתתפים',
      createNew: 'צור צלילה חדשה',
      scheduled: 'מתוזמנות',
      inProgress: 'בתהליך',
      completed: 'הסתיימו',
      cancelled: 'בוטלו',
      noSessions: 'אין צלילות עדיין',
      roster: 'רשימת משתתפים',
      selectSession: 'בחר צלילה כדי לראות את רשימת המשתתפים',
      participants: 'משתתפים',
      revenue: 'הכנסה כוללת',
      capacity: 'קיבולת',
      startDate: 'תאריך התחלה',
      actions: 'פעולות',
      markComplete: 'סיים צלילה',
      cancelSession: 'בטל',
      loading: 'טוען צלילות...',
    },
  };

  const currentLabels = labels[locale as 'en' | 'he'];

  const statusTabLabels: Record<string, string> = {
    scheduled: currentLabels.scheduled,
    in_progress: currentLabels.inProgress,
    completed: currentLabels.completed,
    cancelled: currentLabels.cancelled,
  };

  const getSessionsByStatus = (status: string) =>
    sessions.filter(s => s.status === status);

  const totalRevenue = (selectedSession ? roster : []).length > 0
    ? sessions
        .find(s => s.id === selectedSession)?.price_shekel || 0 * roster.length
    : 0;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-[#f3f7fc] text-[#10264b] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 py-8 shadow-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-extrabold text-white">{currentLabels.title}</h1>
              <p className="mt-2 text-lg text-blue-100">{currentLabels.subtitle}</p>
            </div>
            <Link
              href={`/${locale}/free-diving/create`}
              className="flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-bold text-blue-700 hover:bg-blue-50 transition"
            >
              <AppIcon name="plus" className="h-5 w-5" />
              {currentLabels.createNew}
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Sessions List */}
          <div className="lg:col-span-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <AppIcon name="loader" className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="rounded-xl bg-white p-6 text-center shadow-md">
                <AppIcon name="calendar" className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">{currentLabels.noSessions}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(['scheduled', 'in_progress', 'completed', 'cancelled'] as const).map(status => {
                  const statusSessions = getSessionsByStatus(status);
                  if (statusSessions.length === 0) return null;

                  return (
                    <div key={status}>
                      <p className="mb-2 text-xs font-bold uppercase text-slate-600">
                        {statusTabLabels[status]} ({statusSessions.length})
                      </p>
                      <div className="space-y-2">
                        {statusSessions.map(session => (
                          <button
                            key={session.id}
                            onClick={() => setSelectedSession(session.id)}
                            className={`w-full rounded-lg p-3 text-left transition ${
                              selectedSession === session.id
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-white text-slate-900 hover:bg-blue-50'
                            }`}
                          >
                            <h4 className="font-semibold line-clamp-1">
                              {session.title}
                            </h4>
                            <p className="text-xs opacity-75">
                              {session.start_date} • {session.start_time}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Session Details & Roster */}
          <div className="lg:col-span-2">
            {!selectedSession ? (
              <div className="rounded-xl bg-white p-12 text-center shadow-md">
                <AppIcon name="users" className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-lg font-semibold text-slate-600">
                  {currentLabels.selectSession}
                </p>
              </div>
            ) : (
              (() => {
                const session = sessions.find(s => s.id === selectedSession);
                if (!session) return null;

                return (
                  <div className="space-y-6">
                    {/* Session Summary */}
                    <div className="rounded-xl bg-white p-6 shadow-md">
                      <h2 className="mb-4 text-2xl font-bold">{session.title}</h2>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500 mb-1">
                            {currentLabels.startDate}
                          </p>
                          <p className="font-semibold">
                            {session.start_date} • {session.start_time}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500 mb-1">
                            {currentLabels.capacity}
                          </p>
                          <p className="font-semibold">
                            {session.current_participants}/{session.capacity}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500 mb-1">
                            {currentLabels.participants}
                          </p>
                          <p className="font-semibold text-blue-600">
                            {roster.length} {isRTL ? 'משתתפים' : 'participants'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500 mb-1">
                            {currentLabels.revenue}
                          </p>
                          <p className="font-semibold text-emerald-600">
                            ₪{(roster.length * session.price_shekel).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {session.status === 'scheduled' && (
                          <>
                            <button className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
                              {currentLabels.markComplete}
                            </button>
                            <button className="flex-1 rounded-lg bg-red-100 px-4 py-2 font-semibold text-red-700 hover:bg-red-200">
                              {currentLabels.cancelSession}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Roster */}
                    <div className="rounded-xl bg-white p-6 shadow-md">
                      <h3 className="mb-4 text-xl font-bold">{currentLabels.roster}</h3>

                      {roster.length === 0 ? (
                        <p className="text-slate-600">{isRTL ? 'אין משתתפים עדיין' : 'No participants yet'}</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-200">
                                <th className="px-4 py-3 text-left font-semibold">#</th>
                                <th className="px-4 py-3 text-left font-semibold">
                                  {isRTL ? 'שם משתמש' : 'User ID'}
                                </th>
                                <th className="px-4 py-3 text-left font-semibold">
                                  {isRTL ? 'הגיע' : 'Attended'}
                                </th>
                                <th className="px-4 py-3 text-left font-semibold">
                                  {isRTL ? 'הערות' : 'Notes'}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {roster.map((participant, index) => (
                                <tr key={participant.id} className="border-b border-slate-100 hover:bg-slate-50">
                                  <td className="px-4 py-3">{index + 1}</td>
                                  <td className="px-4 py-3 font-mono text-xs">
                                    {participant.user_id.slice(0, 8)}...
                                  </td>
                                  <td className="px-4 py-3">
                                    {participant.attended === null ? (
                                      <span className="text-slate-500">-</span>
                                    ) : participant.attended ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                                        <AppIcon name="check" className="h-3 w-3" />
                                        {isRTL ? 'כן' : 'Yes'}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                                        <AppIcon name="x" className="h-3 w-3" />
                                        {isRTL ? 'לא' : 'No'}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-slate-600">
                                    {participant.instructor_notes || '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

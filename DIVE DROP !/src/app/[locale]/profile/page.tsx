import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { getCurrentUser } from '@/lib/auth/actions';

export default async function ProfilePage() {
  const locale = await getLocale();
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/auth/login?next=/${locale}/profile`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-cyan-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-primary mb-2">My Profile</h1>
        <p className="text-text-secondary mb-8">Manage your diving profile</p>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-text-primary">Profile coming soon...</p>
        </div>
      </div>
    </div>
  );
}

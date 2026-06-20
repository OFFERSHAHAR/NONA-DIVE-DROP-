import Link from 'next/link';

interface DashboardCardProps {
  title: string;
  description: string;
  href: string;
  icon: string;
  buttonText: string;
  color: 'blue' | 'purple' | 'green' | 'yellow' | 'indigo' | 'emerald' | 'red';
}

export default function DashboardCard({
  title,
  description,
  href,
  icon,
  buttonText,
  color,
}: DashboardCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  };

  const buttonColorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    green: 'bg-green-600 hover:bg-green-700',
    yellow: 'bg-yellow-600 hover:bg-yellow-700',
    indigo: 'bg-indigo-600 hover:bg-indigo-700',
    emerald: 'bg-emerald-600 hover:bg-emerald-700',
    red: 'bg-red-600 hover:bg-red-700',
  };

  return (
    <div className={`border rounded-lg p-6 flex flex-col gap-4 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {icon} {title}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {description}
          </p>
        </div>
      </div>

      <Link
        href={href}
        className={`inline-flex items-center justify-center px-4 py-2 ${buttonColorClasses[color]} text-white font-semibold rounded-lg transition-colors duration-200 w-fit mt-auto`}
      >
        {buttonText}
        <span className="ml-2">→</span>
      </Link>
    </div>
  );
}

import Link from 'next/link';

interface DashboardCardProps {
  title: string;
  description: string;
  href: string;
  icon: string;
  buttonText: string;
  color: 'blue' | 'purple' | 'green';
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
  };

  const buttonColorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    green: 'bg-green-600 hover:bg-green-700',
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

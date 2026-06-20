'use client';

import { Card } from '@/components/Card';
import { BlacklistLevel } from '@/lib/equipment/schemas';

interface RenterWarning {
  id: string;
  renter_id: string;
  warning_level: BlacklistLevel;
  reason: string;
  created_at: string;
}

interface ProblematicRenterWarningProps {
  warning: RenterWarning;
}

export function ProblematicRenterWarning({ warning }: ProblematicRenterWarningProps) {
  const getWarningColor = (level: BlacklistLevel) => {
    switch (level) {
      case 'caution':
        return 'bg-yellow-100 border-yellow-300';
      case 'warning':
        return 'bg-orange-100 border-orange-300';
      case 'banned':
        return 'bg-red-100 border-red-300';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  const getLevelIcon = (level: BlacklistLevel) => {
    switch (level) {
      case 'caution':
        return '⚠️';
      case 'warning':
        return '⛔';
      case 'banned':
        return '🚫';
      default:
        return '❌';
    }
  };

  const getLevelLabel = (level: BlacklistLevel) => {
    switch (level) {
      case 'caution':
        return 'אזהרה';
      case 'warning':
        return 'הגבלה';
      case 'banned':
        return 'חסום';
      default:
        return 'ידוע';
    }
  };

  return (
    <Card className={`p-4 border-2 ${getWarningColor(warning.warning_level)}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{getLevelIcon(warning.warning_level)}</span>
        <div className="flex-1">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-lg">
              ממשכן בעייתי
            </h3>
            <span className="text-sm font-bold px-2 py-1 rounded bg-white">
              {getLevelLabel(warning.warning_level)}
            </span>
          </div>
          <p className="text-sm text-gray-700 mb-2">{warning.reason}</p>
          <p className="text-xs text-gray-600">
            {new Date(warning.created_at).toLocaleDateString('he-IL')}
          </p>
        </div>
      </div>
    </Card>
  );
}

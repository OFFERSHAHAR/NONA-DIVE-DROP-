'use client';

import { useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DamageType } from '@/lib/equipment/schemas';

interface DamageReport {
  id: string;
  equipment_name: string;
  damage_type: DamageType;
  description: string;
  repair_cost_estimate?: number;
  status: 'pending_review' | 'approved' | 'rejected' | 'resolved';
  created_at: string;
  reporter_email: string;
}

interface DamageReportCardProps {
  report: DamageReport;
  onRespond?: (reportId: string) => void;
  isPending?: boolean;
}

export function DamageReportCard({
  report,
  onRespond,
  isPending = false
}: DamageReportCardProps) {
  const getDamageColor = (type: DamageType) => {
    switch (type) {
      case 'minor':
        return 'text-yellow-600';
      case 'moderate':
        return 'text-orange-600';
      case 'severe':
        return 'text-red-600';
    }
  };

  const getDamageLabel = (type: DamageType) => {
    switch (type) {
      case 'minor':
        return 'קל';
      case 'moderate':
        return 'בינוני';
      case 'severe':
        return 'חמור';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'pending_review':
        return 'bg-yellow-50';
      case 'approved':
        return 'bg-red-50';
      case 'rejected':
        return 'bg-green-50';
      case 'resolved':
        return 'bg-gray-50';
      default:
        return 'bg-white';
    }
  };

  return (
    <Card className={`p-4 ${getStatusBg(report.status)}`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-lg">{report.equipment_name}</h3>
          <p className="text-sm text-gray-600">{report.reporter_email}</p>
        </div>
        <span className={`text-sm font-medium px-2 py-1 rounded ${getDamageColor(report.damage_type)} bg-opacity-10`}>
          {getDamageLabel(report.damage_type)}
        </span>
      </div>

      <p className="text-gray-700 my-3">{report.description}</p>

      {report.repair_cost_estimate && (
        <div className="mb-3 p-2 bg-blue-50 rounded">
          <p className="text-sm font-medium">
            אומדן עלות תיקון: {report.repair_cost_estimate} ₪
          </p>
        </div>
      )}

      <div className="text-xs text-gray-500 mb-3">
        {new Date(report.created_at).toLocaleDateString('he-IL')}
      </div>

      {isPending && onRespond && (
        <div className="flex gap-2">
          <Button
            onClick={() => onRespond(report.id)}
            variant="primary"
            size="sm"
            className="flex-1"
          >
            בדוק דוח
          </Button>
        </div>
      )}

      {!isPending && (
        <div className="text-sm text-gray-600">
          <span className="font-medium">סטטוס: </span>
          {report.status === 'pending_review' && 'ממתין לסקירה'}
          {report.status === 'approved' && 'אושר'}
          {report.status === 'rejected' && 'נדחה'}
          {report.status === 'resolved' && 'סגור'}
        </div>
      )}
    </Card>
  );
}

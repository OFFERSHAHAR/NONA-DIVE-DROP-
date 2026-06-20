'use client';

import { EquipmentStatus } from '@/lib/equipment/schemas';

interface EquipmentStatusBadgeProps {
  status: EquipmentStatus;
  className?: string;
}

export function EquipmentStatusBadge({ status, className = '' }: EquipmentStatusBadgeProps) {
  const getStatusColor = (status: EquipmentStatus) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'unavailable':
        return 'bg-blue-100 text-blue-800';
      case 'missing':
        return 'bg-red-100 text-red-800';
      case 'damaged':
        return 'bg-orange-100 text-orange-800';
      case 'returned_damaged':
        return 'bg-yellow-100 text-yellow-800';
      case 'returned_ok':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: EquipmentStatus) => {
    switch (status) {
      case 'available':
        return 'זמין';
      case 'unavailable':
        return 'בשימוש';
      case 'missing':
        return 'אבוד';
      case 'damaged':
        return 'פגוע';
      case 'returned_damaged':
        return 'חוזר פגוע';
      case 'returned_ok':
        return 'חוזר תקין';
      default:
        return status;
    }
  };

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)} ${className}`}>
      {getStatusLabel(status)}
    </span>
  );
}

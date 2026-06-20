'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { EquipmentStatusBadge } from './EquipmentStatusBadge';
import { EquipmentStatus } from '@/lib/equipment/schemas';

interface Equipment {
  id: string;
  name: string;
  equipment_type: string;
  status: EquipmentStatus;
  rental_price_per_day: number;
  condition_rating?: number;
  current_renter_id?: string;
  created_at: string;
}

interface EquipmentListProps {
  listerId: string;
  onEquipmentSelect?: (equipment: Equipment) => void;
  statusFilter?: EquipmentStatus;
}

export function EquipmentList({
  listerId,
  onEquipmentSelect,
  statusFilter
}: EquipmentListProps) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          lister_id: listerId
        });

        if (statusFilter) {
          params.set('status', statusFilter);
        }

        const response = await fetch(`/api/equipment?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch equipment');

        const data = await response.json();
        setEquipment(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchEquipment();
  }, [listerId, statusFilter]);

  if (loading) {
    return <div className="text-center py-8">טוען...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">שגיאה: {error}</div>;
  }

  if (equipment.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        אין ציוד זמין
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {equipment.map((item) => (
        <Card key={item.id} className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold text-lg">{item.name}</h3>
              <p className="text-sm text-gray-600">{item.equipment_type}</p>
            </div>
            <EquipmentStatusBadge status={item.status} />
          </div>

          <div className="grid grid-cols-2 gap-2 my-3 text-sm">
            <div>
              <span className="text-gray-600">מחיר ליום:</span>
              <p className="font-medium">{item.rental_price_per_day} ₪</p>
            </div>
            {item.condition_rating && (
              <div>
                <span className="text-gray-600">מצב:</span>
                <p className="font-medium">{item.condition_rating}/5</p>
              </div>
            )}
          </div>

          <div className="text-xs text-gray-500 mb-3">
            {new Date(item.created_at).toLocaleDateString('he-IL')}
          </div>

          {onEquipmentSelect && (
            <Button
              onClick={() => onEquipmentSelect(item)}
              variant="secondary"
              size="sm"
              className="w-full"
            >
              עדכן פרטים
            </Button>
          )}
        </Card>
      ))}
    </div>
  );
}

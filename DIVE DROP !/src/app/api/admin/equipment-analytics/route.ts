import { NextRequest, NextResponse } from 'next/server';
import { EquipmentAnalytics } from '@/lib/types/equipment';

export async function GET(request: NextRequest) {
  try {
    // In a real implementation, you would calculate these from Supabase data
    const analytics: EquipmentAnalytics = {
      totalEquipment: 45,
      activeEquipment: 42,
      missingEquipment: 3,
      damageRate: 0.08,
      averageRentalDuration: 3.5,
      totalRevenueThisMonth: 1250.5,
      totalCommissionsOwed: 187.58,
      topEquipmentByRevenue: [
        {
          equipmentId: '1',
          equipmentName: 'Scuba Pro MK2 Regulator',
          type: 'Regulator',
          revenue: 450.0,
          rentalCount: 18,
          averagePrice: 25.0,
        },
        {
          equipmentId: '2',
          equipmentName: 'BCD - XDeep Zen',
          type: 'BCD',
          revenue: 380.0,
          rentalCount: 19,
          averagePrice: 20.0,
        },
        {
          equipmentId: '3',
          equipmentName: 'Dive Computer - Shearwater',
          type: 'Computer',
          revenue: 420.5,
          rentalCount: 15,
          averagePrice: 28.0,
        },
      ],
      damageRateByType: [
        {
          equipmentType: 'Regulator',
          damageCount: 2,
          damageRate: 0.05,
          averageRepairCost: 150.0,
        },
        {
          equipmentType: 'BCD',
          damageCount: 3,
          damageRate: 0.12,
          averageRepairCost: 200.0,
        },
        {
          equipmentType: 'Computer',
          damageCount: 1,
          damageRate: 0.04,
          averageRepairCost: 300.0,
        },
      ],
      userBehaviorMetrics: {
        averageReturnDelay: 0.8,
        lateReturnRate: 0.15,
        damageReportRate: 0.08,
        disputeRate: 0.05,
        blacklistedUserCount: 2,
      },
    };

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Analytics calculation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate analytics' },
      { status: 500 }
    );
  }
}

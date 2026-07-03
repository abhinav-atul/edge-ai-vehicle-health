import { NextRequest, NextResponse } from 'next/server';
import { fleetManager } from '@/lib/fleet';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const vehicleId = searchParams.get('vehicle') ?? 'default-vehicle';

  const vehicle = fleetManager.getVehicle(vehicleId) ?? fleetManager.getVehicle('default-vehicle')!;
  const rul = vehicle.engine.getRUL();

  const enriched = rul.map(component => ({
    ...component,
    predictedServiceDate: new Date(
      Date.now() + component.daysLeft * 24 * 60 * 60 * 1000
    ).toISOString().split('T')[0],
    percentRemaining: Math.round((component.daysLeft / component.totalDays) * 100),
  }));

  return NextResponse.json({ components: enriched });
}

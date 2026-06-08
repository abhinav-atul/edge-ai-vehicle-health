import { NextRequest, NextResponse } from 'next/server';
import { engine } from '@/lib/engine';
import { prisma } from '@/lib/prisma';

const VEHICLE_ID = 'default-vehicle';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sensor, faultType } = body as { sensor?: string; faultType?: string };

    const anomaly = engine.injectAnomaly(sensor, faultType);

    // Persist to DB
    try {
      await prisma.anomalyEvent.create({
        data: {
          vehicleId: VEHICLE_ID,
          sensor: anomaly.sensor,
          faultType: anomaly.faultType,
          zScore: anomaly.zScore,
          severity: anomaly.severity,
          duration: anomaly.duration,
        },
      });
    } catch {
      // DB not configured — skip persistence
    }

    return NextResponse.json({
      success: true,
      anomaly: {
        sensor: anomaly.sensor,
        sensorName: anomaly.sensorName,
        faultType: anomaly.faultType,
        duration: anomaly.duration,
      },
    });
  } catch (error) {
    console.error('Inject anomaly error:', error);
    return NextResponse.json({ error: 'Failed to inject anomaly' }, { status: 500 });
  }
}

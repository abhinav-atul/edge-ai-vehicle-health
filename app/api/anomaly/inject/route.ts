import { NextRequest, NextResponse } from 'next/server';
import { fleetManager } from '@/lib/fleet';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sensor, faultType, scenarioId, vehicleId = 'default-vehicle' } = body as {
      sensor?: string;
      faultType?: string;
      scenarioId?: string;
      vehicleId?: string;
    };

    const vehicle = fleetManager.getVehicle(vehicleId) ?? fleetManager.getVehicle('default-vehicle')!;

    // Scenario injection
    if (scenarioId) {
      const result = vehicle.engine.injectScenario(scenarioId);
      if (!result.activated) {
        return NextResponse.json({ error: 'Unknown scenario' }, { status: 400 });
      }

      // Persist a marker anomaly event for the scenario
      try {
        await prisma.anomalyEvent.create({
          data: {
            vehicleId: vehicle.id,
            sensor: result.scenario.steps[0]?.sensor ?? 'unknown',
            faultType: `scenario:${result.scenario.id}`,
            zScore: 0,
            severity: 'critical',
            duration: 0,
          },
        });
      } catch {
        // DB not configured — skip persistence
      }

      return NextResponse.json({
        success: true,
        scenario: {
          id: result.scenario.id,
          name: result.scenario.name,
          icon: result.scenario.icon,
          description: result.scenario.description,
          stepsCount: result.scenario.steps.length,
        },
      });
    }

    // Single anomaly injection (legacy)
    const anomaly = vehicle.engine.injectAnomaly(sensor, faultType);

    // Persist to DB
    try {
      await prisma.anomalyEvent.create({
        data: {
          vehicleId: vehicle.id,
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

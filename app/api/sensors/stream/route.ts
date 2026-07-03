import { fleetManager } from '@/lib/fleet';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const TICK_INTERVAL = 300; // ms

// Ensure vehicle exists in DB
async function ensureVehicle(vehicleId: string, name: string, vin: string) {
  try {
    await prisma.vehicle.upsert({
      where: { vin },
      update: {},
      create: {
        id: vehicleId,
        name,
        vin,
      },
    });
  } catch {
    // DB may not be configured yet — continue without persistence
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vehicleId = searchParams.get('vehicle') ?? 'default-vehicle';
  
  const vehicle = fleetManager.getVehicle(vehicleId) ?? fleetManager.getVehicle('default-vehicle')!;
  
  await ensureVehicle(vehicle.id, vehicle.name, vehicle.vin);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const interval = setInterval(async () => {
        try {
          const data = vehicle.engine.tick();

          // Persist anomalies to DB
          for (const anomaly of data.anomalies) {
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
          }

          // Persist health snapshot every 60s
          if (vehicle.engine.getShouldPersistHealth()) {
            try {
              await prisma.healthSnapshot.create({
                data: {
                  vehicleId: vehicle.id,
                  score: data.healthScore,
                },
              });
            } catch {
              // DB not configured — skip persistence
            }
          }

          const event = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(event));
        } catch (error) {
          console.error('SSE tick error:', error);
        }
      }, TICK_INTERVAL);

      // Heartbeat every 15s
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          // Connection closed
        }
      }, 15000);

      // Cleanup on close
      const cleanup = () => {
        clearInterval(interval);
        clearInterval(heartbeat);
      };

      // Store cleanup function for abort handling
      (controller as unknown as { _cleanup: () => void })._cleanup = cleanup;
    },
    cancel(controller) {
      const ctrl = controller as unknown as { _cleanup?: () => void };
      ctrl._cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

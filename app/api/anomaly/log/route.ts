import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const VEHICLE_ID = 'default-vehicle';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
    const sensor = searchParams.get('sensor');
    const severity = searchParams.get('severity');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const where: Record<string, unknown> = { vehicleId: VEHICLE_ID };
    if (sensor) where.sensor = sensor;
    if (severity) where.severity = severity;
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }

    const [events, total] = await Promise.all([
      prisma.anomalyEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.anomalyEvent.count({ where }),
    ]);

    return NextResponse.json({
      events,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Anomaly log error:', error);
    // Return empty results if DB not configured
    return NextResponse.json({
      events: [],
      total: 0,
      page: 1,
      totalPages: 0,
    });
  }
}

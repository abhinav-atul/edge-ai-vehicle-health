import { NextResponse } from 'next/server';
import { engine } from '@/lib/engine';

export async function GET() {
  const rul = engine.getRUL();

  const enriched = rul.map(component => ({
    ...component,
    predictedServiceDate: new Date(
      Date.now() + component.daysLeft * 24 * 60 * 60 * 1000
    ).toISOString().split('T')[0],
    percentRemaining: Math.round((component.daysLeft / component.totalDays) * 100),
  }));

  return NextResponse.json({ components: enriched });
}

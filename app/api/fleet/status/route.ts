import { NextResponse } from 'next/server';
import { fleetManager } from '@/lib/fleet';

export const dynamic = 'force-dynamic';

export async function GET() {
  const overview = fleetManager.getOverview();
  return NextResponse.json(overview);
}

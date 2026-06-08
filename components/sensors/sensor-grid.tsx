'use client';

import React from 'react';
import { SensorCard } from './sensor-card';
import { SENSORS, type SensorReading } from '@/lib/engine';

interface SensorGridProps {
  readings: Record<string, SensorReading>;
  history: Record<string, number[]>;
}

export function SensorGrid({ readings, history }: SensorGridProps) {
  const sensorKeys = Object.keys(SENSORS);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {sensorKeys.map(key => (
        <SensorCard
          key={key}
          sensorKey={key}
          reading={readings[key] ?? null}
          history={history[key] ?? []}
        />
      ))}
    </div>
  );
}

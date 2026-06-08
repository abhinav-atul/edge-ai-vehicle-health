'use client';

import React from 'react';
import { AnomalyHistory } from '@/components/history/anomaly-history';
import { History } from 'lucide-react';

export default function HistoryPage() {
  return (
    <div className="space-y-6" id="history-page">
      <div>
        <h1 className="text-lg font-semibold text-white/90 flex items-center gap-2">
          <History className="w-5 h-5 text-cyan-400" />
          Anomaly History & Analytics
        </h1>
        <p className="text-xs text-white/30 mt-0.5">Historical anomaly events from Neon PostgreSQL with aggregate analytics</p>
      </div>
      <AnomalyHistory />
    </div>
  );
}

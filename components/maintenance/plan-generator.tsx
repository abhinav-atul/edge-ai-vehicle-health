'use client';

import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

export function PlanGenerator() {
  const [plan, setPlan] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setPlan('');

    try {
      const res = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Generate a comprehensive maintenance plan',
          mode: 'maintenance',
        }),
      });

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                fullText += data.text;
                setPlan(fullText);
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      setPlan(`⚠ Error generating plan: ${error instanceof Error ? error.message : 'Unknown error'}. Ensure GEMINI_API_KEY is configured.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden" id="plan-generator">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-semibold text-white/80">AI Maintenance Planner</h2>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500/20 to-cyan-500/20
                     border border-purple-500/30 rounded-lg text-purple-300 text-xs font-semibold
                     hover:from-purple-500/30 hover:to-cyan-500/30 hover:border-purple-400/50
                     active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {loading ? 'Generating...' : 'Generate Plan'}
        </button>
      </div>

      {plan && (
        <div className="p-5 max-h-96 overflow-y-auto scrollbar-thin">
          <pre className="text-xs text-white/70 font-mono whitespace-pre-wrap leading-relaxed">
            {plan}
            {loading && <span className="inline-block w-2 h-4 bg-purple-400 ml-0.5 animate-pulse" />}
          </pre>
        </div>
      )}
    </div>
  );
}

import { NextRequest } from 'next/server';
import { engine } from '@/lib/engine';
import { streamDiagnosis, streamMaintenancePlan } from '@/lib/gemini';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
const VEHICLE_ID = 'default-vehicle';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, chatHistory = [], mode = 'diagnose' } = body as {
      message: string;
      chatHistory?: Array<{ role: string; content: string }>;
      mode?: 'diagnose' | 'maintenance';
    };

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const encoder = new TextEncoder();
    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let generator: AsyncGenerator<string>;

          if (mode === 'maintenance') {
            const rul = engine.getRUL();
            const healthScore = engine.getHealthScore();
            generator = streamMaintenancePlan(rul, healthScore);
          } else {
            const context = engine.buildDiagnosticContext();
            generator = streamDiagnosis(message, context, chatHistory);
          }

          for await (const chunk of generator) {
            fullResponse += chunk;
            const event = `data: ${JSON.stringify({ text: chunk })}\n\n`;
            controller.enqueue(encoder.encode(event));
          }

          // Send done event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));

          // Persist diagnostic session
          try {
            const messages = [
              ...chatHistory,
              { role: 'user', content: message },
              { role: 'assistant', content: fullResponse },
            ];
            await prisma.diagnosticSession.create({
              data: {
                vehicleId: VEHICLE_ID,
                messages: messages,
              },
            });
          } catch {
            // DB not configured — skip persistence
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error('Gemini stream error:', errorMsg);
          const event = `data: ${JSON.stringify({ error: errorMsg })}\n\n`;
          controller.enqueue(encoder.encode(event));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Diagnose error:', error);
    return new Response(JSON.stringify({ error: 'Failed to process diagnostic request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

import { streamText, type ModelMessage } from 'ai';
import { errorText, getAgent } from '@/lib/agent';

export async function POST(req: Request) {
  const { agentId, messages } = (await req.json()) as {
    agentId: string;
    messages: { role: 'user' | 'assistant'; content: string }[];
  };
  let agent;
  try {
    agent = getAgent(agentId);
  } catch (e) {
    return new Response(errorText(e), { status: 400 });
  }

  let streamError = '';
  const result = streamText({
    model: agent.model,
    instructions: agent.instructions,
    messages: messages.map((m): ModelMessage => ({ role: m.role, content: m.content })),
    onError: ({ error }) => {
      streamError = error instanceof Error ? error.message : String(error);
      console.error('chat error:', streamError);
    },
  });

  // Plain text stream; surface provider errors as a final line instead of a silent empty reply.
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      for await (const chunk of result.textStream) controller.enqueue(encoder.encode(chunk));
      if (streamError) controller.enqueue(encoder.encode(`\n\n[出错了：${streamError}]`));
      controller.close();
    },
  });
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

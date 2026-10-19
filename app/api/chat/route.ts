import { streamText, type ModelMessage } from 'ai';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { agents } from '@/lib/schema';
import { getConnection, languageModel } from '@/lib/models';
import { agentInstructions } from '@/lib/prompt';

export async function POST(req: Request) {
  const { agentId, messages } = (await req.json()) as {
    agentId: string;
    messages: { role: 'user' | 'assistant'; content: string }[];
  };
  const agent = db.select().from(agents).where(eq(agents.id, agentId)).get();
  if (!agent?.enabled) return new Response('这个 agent 不存在或已停用', { status: 404 });
  const conn = getConnection(agent.connectionId);
  if (!conn || !agent.model) return new Response('先给这个 agent 选好连接和模型', { status: 400 });

  let streamError = '';
  const result = streamText({
    model: languageModel(conn, agent.model),
    instructions: agentInstructions(agent.name, agent.prompt),
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

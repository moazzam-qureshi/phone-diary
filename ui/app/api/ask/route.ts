import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/app/lib/dal";
import { buildContext, serializeEntries } from "@/app/lib/retrieval";
import { SYSTEM_PROMPT, buildUserMessage } from "@/app/lib/prompt";
import { streamChat, sseToTextStream } from "@/app/lib/openrouter";

// Uses `pg` (Node APIs) and streams — must run on the Node.js runtime and be dynamic.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({ query: z.string().trim().min(1) });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return new NextResponse(null, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }

  const { entries } = await buildContext(parsed.data.query);
  const serialized = serializeEntries(entries);

  const upstream = await streamChat([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: buildUserMessage(parsed.data.query, serialized) },
  ]);

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return NextResponse.json(
      { error: `upstream ${upstream.status}`, detail },
      { status: 502 },
    );
  }

  return new NextResponse(sseToTextStream(upstream.body), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

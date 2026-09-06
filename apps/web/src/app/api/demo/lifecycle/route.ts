import { NextResponse } from "next/server";

import {
  acceptProposalAndExecuteContract,
  getDemoLifecycle,
  resetDemoLifecycle,
} from "../../../../lib/hackathon/demo-lifecycle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getDemoLifecycle(), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    action?: unknown;
  } | null;
  if (body?.action === "reset") {
    return NextResponse.json(resetDemoLifecycle());
  }
  if (body?.action === "execute_contract") {
    try {
      return NextResponse.json(acceptProposalAndExecuteContract());
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Transition failed.",
        },
        { status: 409 },
      );
    }
  }
  return NextResponse.json(
    { error: "Unsupported demo action." },
    { status: 400 },
  );
}

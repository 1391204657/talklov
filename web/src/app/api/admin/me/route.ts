import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminServer";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  return NextResponse.json({
    ok: true,
    email: gate.ctx.email,
    userId: gate.ctx.user.id,
  });
}

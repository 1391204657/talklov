import { NextResponse } from "next/server";
import { isLivenessEnvConfigured, livenessRegion } from "@/lib/flashCheck";

/** Public: whether Flash Check (AWS) is available. */
export async function GET() {
  const enabled = isLivenessEnvConfigured();
  return NextResponse.json({
    enabled,
    region: enabled ? livenessRegion() : null,
    product: { zh: "闪验", en: "Flash Check" },
  });
}

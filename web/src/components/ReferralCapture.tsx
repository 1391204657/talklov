"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { captureAffiliateCode } from "@/lib/affiliate";

/**
 * Captures ?ref= / ?affiliate= on any page into a 90-day first-touch cookie.
 * UI language for promo links is applied in AppProvider via ?lang= / ?locale=.
 */
export default function ReferralCapture() {
  const params = useSearchParams();

  useEffect(() => {
    const raw = params.get("ref") || params.get("affiliate");
    if (raw) captureAffiliateCode(raw);
  }, [params]);

  return null;
}

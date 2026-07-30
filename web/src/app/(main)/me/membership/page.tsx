import { Suspense } from "react";
import MembershipClient from "./MembershipClient";

export default function MembershipPage() {
  return (
    <Suspense
      fallback={<main className="p-4 text-sm text-muted">Loading…</main>}
    >
      <MembershipClient />
    </Suspense>
  );
}

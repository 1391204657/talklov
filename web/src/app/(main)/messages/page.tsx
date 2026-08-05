"use client";

import MessagesErrorBoundary from "./error-boundary";
import MessagesClient from "./MessagesClient";

export default function MessagesPage() {
  return (
    <MessagesErrorBoundary>
      <MessagesClient />
    </MessagesErrorBoundary>
  );
}

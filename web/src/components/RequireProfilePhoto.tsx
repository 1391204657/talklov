"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/store";

/** Inside the app shell: unfinished signups must add a photo before continuing. */
export default function RequireProfilePhoto() {
  const { userId, profileSynced, registerOpen, myProfile, openProfileGap } =
    useApp();

  const photoCount = (myProfile.photos || []).filter((p) => p?.trim()).length;

  useEffect(() => {
    if (!profileSynced || !userId || registerOpen) return;
    if (photoCount > 0) return;
    openProfileGap();
  }, [profileSynced, userId, registerOpen, photoCount, openProfileGap]);

  return null;
}

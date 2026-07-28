"use client";

import Image from "next/image";

function HangUpOnly() {
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center pb-5 pt-12">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ff3b30] text-white shadow-[0_8px_24px_rgba(255,59,48,0.45)]">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path
            d="M6.6 3.8c.5-.5 1.3-.5 1.8 0l1.7 1.7c.4.4.5 1.1.2 1.6L9.3 9.1c1.7 2.8 4 5 6.9 6.6l2-1c.5-.3 1.2-.2 1.6.2l1.7 1.7c.5.5.5 1.3 0 1.8l-1.5 1.5c-.5.5-1.2.7-1.9.5C11.6 18.4 5.7 12.5 3.7 5.9c-.2-.7 0-1.4.5-1.9L6.6 3.8Z"
            transform="rotate(135 12 12)"
          />
        </svg>
      </span>
    </div>
  );
}

function FaceTimePhone({
  remoteSrc,
  remoteName,
  rotate,
  className = "",
}: {
  remoteSrc: string;
  remoteName: string;
  rotate: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`} style={{ transform: rotate }}>
      <div className="relative w-[200px] rounded-[2rem] border border-black/15 bg-[#1c1c1f] p-[7px] shadow-[0_28px_70px_rgba(60,40,80,0.32)] sm:w-[220px]">
        <div className="absolute left-1/2 top-2.5 z-30 h-4 w-20 -translate-x-1/2 rounded-full bg-black/85" />
        <div className="relative aspect-[9/19] overflow-hidden rounded-[1.55rem] bg-black">
          <Image
            src={remoteSrc}
            alt={remoteName}
            fill
            className="object-cover object-[center_20%]"
            sizes="220px"
            priority
          />
          <HangUpOnly />
        </div>
      </div>
    </div>
  );
}

/** Two FaceTime-style phones with slight overlap. */
export function VideoCallDuo() {
  return (
    <div className="relative mx-auto flex w-full max-w-[460px] items-end justify-center px-2">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(232,137,176,0.4),transparent_70%)] blur-2xl" />

      {/* US man slightly behind; CN woman in front */}
      <FaceTimePhone
        className="relative z-20 mr-1 sm:mr-2"
        rotate="rotate(-7deg)"
        remoteSrc="/brand/call-cn-woman.png"
        remoteName="林晓 Lin"
      />

      <FaceTimePhone
        className="relative z-10 -ml-3 mt-7 sm:-ml-4 sm:mt-9"
        rotate="rotate(7deg)"
        remoteSrc="/brand/call-us-man.png"
        remoteName="Jack"
      />
    </div>
  );
}

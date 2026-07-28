/** Circular US + CN flags (CN in front). SVG so Windows doesn't fall back to "US"/"CN" letters. */
export function FlagBadge({ label }: { label: string }) {
  return (
    <div className="mb-4 flex items-center gap-2.5 text-sm font-medium text-foreground sm:text-[15px]">
      <span className="relative inline-flex h-7 w-[42px] shrink-0 items-center">
        {/* US — behind */}
        <span
          className="absolute left-0 top-0 z-0 h-7 w-7 overflow-hidden rounded-full border border-black/10 shadow-sm"
          aria-hidden
        >
          <svg viewBox="0 0 60 60" className="h-full w-full" role="img">
            <defs>
              <clipPath id="us-circle">
                <circle cx="30" cy="30" r="30" />
              </clipPath>
            </defs>
            <g clipPath="url(#us-circle)">
              <rect width="60" height="60" fill="#B22234" />
              {[6, 14, 22, 30, 38, 46, 54].map((y) => (
                <rect key={y} y={y} width="60" height="4" fill="#fff" />
              ))}
              <rect width="28" height="32" fill="#3C3B6E" />
              {[8, 14, 20, 26].map((y) =>
                [5, 11, 17, 23].map((x) => (
                  <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" fill="#fff" />
                ))
              )}
            </g>
          </svg>
        </span>
        {/* CN — in front */}
        <span
          className="absolute left-[15px] top-0 z-10 h-7 w-7 overflow-hidden rounded-full border border-black/10 shadow-sm"
          aria-hidden
        >
          <svg viewBox="0 0 60 60" className="h-full w-full" role="img">
            <defs>
              <clipPath id="cn-circle">
                <circle cx="30" cy="30" r="30" />
              </clipPath>
            </defs>
            <g clipPath="url(#cn-circle)">
              <rect width="60" height="60" fill="#DE2910" />
              <polygon
                fill="#FFDE00"
                points="18,12 19.8,17.4 25.5,17.4 20.85,20.7 22.65,26.1 18,22.8 13.35,26.1 15.15,20.7 10.5,17.4 16.2,17.4"
              />
              {[
                [30, 8],
                [34, 14],
                [34, 22],
                [30, 28],
              ].map(([cx, cy], i) => (
                <circle key={i} cx={cx} cy={cy} r="2.2" fill="#FFDE00" />
              ))}
            </g>
          </svg>
        </span>
      </span>
      <span>{label}</span>
    </div>
  );
}

import React from "react";

interface KbLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  collapsed?: boolean;
}

export const KbLogo: React.FC<KbLogoProps> = ({
  className = "",
  size = "md",
  collapsed = false,
}) => {
  const sizeMap = {
    sm: { h: 32, emblem: 30, text: "text-lg", subtext: "text-[8px]" },
    md: { h: 42, emblem: 40, text: "text-xl", subtext: "text-[9px]" },
    lg: { h: 56, emblem: 52, text: "text-2xl", subtext: "text-[11px]" },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* SVG Emblem Icon */}
      <svg
        width={currentSize.emblem}
        height={currentSize.emblem}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <defs>
          <linearGradient id="kbLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
        </defs>
        {/* Rounded Diamond-Hex Badge */}
        <rect
          x="4"
          y="4"
          width="56"
          height="56"
          rx="16"
          fill="url(#kbLogoGrad)"
        />
        {/* Subtle Ledger Grid line in background */}
        <path
          d="M12 32H52"
          stroke="#FFFFFF"
          strokeOpacity="0.25"
          strokeWidth="1.5"
          strokeDasharray="2 3"
        />
        {/* Monogram K */}
        <path
          d="M20 18V46M20 32L32 18M25 27L34 46"
          stroke="#FFFFFF"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Monogram B */}
        <path
          d="M38 18H46C49.5 18 52 20.5 52 24C52 27.5 49.5 30 46 30H38M38 30H47.5C51 30 53.5 32.5 53.5 36.5C53.5 40.5 51 43 47.5 43H38V18"
          stroke="#FFFFFF"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Typography Label */}
      {!collapsed && (
        <div className="flex flex-col justify-center leading-tight">
          <div className="flex items-center gap-1.5">
            <span className={`font-extrabold tracking-tight text-slate-900 ${currentSize.text}`}>
              KB
            </span>
            <span className={`font-semibold tracking-tight text-emerald-600 ${currentSize.text}`}>
              KHATA
            </span>
          </div>
          <span
            className={`font-semibold tracking-wider text-slate-400 uppercase ${currentSize.subtext}`}
          >
            Smart Shop &amp; Village Ledger
          </span>
        </div>
      )}
    </div>
  );
};

export default KbLogo;


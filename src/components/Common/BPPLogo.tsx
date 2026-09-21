import React from 'react';

interface BPPLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const BPPLogo: React.FC<BPPLogoProps> = ({
  className = '',
  size = 'md',
  showText = true
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl'
  };

  return (
    <div className={`flex items-center space-x-2.5 ${className}`}>
      {/* House silhouette with upward orange growth arrow */}
      <div className={`${iconSizes[size]} relative rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center shadow-md shadow-orange-500/10 shrink-0 overflow-hidden`}>
        <svg
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full p-1.5"
        >
          {/* House Silhouette (Clean Navy/Slate with White Outline) */}
          <path
            d="M6 18L18 7L30 18V28C30 29.1 29.1 30 28 30H8C6.9 30 6 29.1 6 28V18Z"
            fill="#1E293B"
            stroke="#94A3B8"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Foundation & Door */}
          <rect x="14" y="20" width="8" height="10" rx="1" fill="#0F172A" />
          {/* Roof Ridge Peak */}
          <path
            d="M4 19L18 6L32 19"
            stroke="#CBD5E1"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Upward Orange Growth Arrow */}
          <path
            d="M18 24V12M18 12L13 17M18 12L23 17"
            stroke="#F97316"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Growth Accent Glow Sparkle */}
          <circle cx="27" cy="9" r="2" fill="#FB923C" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center space-x-1.5 leading-none">
            <span className={`font-black tracking-tight text-slate-900 dark:text-white ${textSizes[size]}`}>
              BUILD PERMIT <span className="text-orange-500">PRO</span>
            </span>
          </div>
          <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase mt-0.5">
            Commercial SaaS &bull; Kelowna Flagship
          </span>
        </div>
      )}
    </div>
  );
};

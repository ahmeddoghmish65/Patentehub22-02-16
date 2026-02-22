import { cn } from '@/utils/cn';

interface VerifiedBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  tooltip?: boolean;
}

/**
 * Verified Badge — Patente Hub
 * Serrated/starburst shape matching the app's primary blue-indigo palette.
 */
export function VerifiedBadge({ size = 'sm', className, tooltip = false }: VerifiedBadgeProps) {
  const dims: Record<string, number> = { xs: 14, sm: 20, md: 28, lg: 36 };
  const px = dims[size] ?? 20;

  const badge = (
    <svg
      width={px}
      height={px}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0 inline-block', className)}
      aria-label="حساب موثق"
      role="img"
    >
      <defs>
        <linearGradient id="vb_g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
        <radialGradient id="vb_shine" cx="35%" cy="25%" r="55%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <filter id="vb_drop" x="-15%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#4f46e5" floodOpacity="0.5"/>
        </filter>
      </defs>

      {/* 12-point star/seal shape */}
      <path
        d="M16 1
           L18.2 5.5 L22.5 3.2 L22 8.2 L27 8 L24.7 12.3
           L29.2 14.5 L25.5 17.5 L29 21 L24.2 21.8
           L24.8 26.8 L20.5 24.5 L18.3 29 L16 25.5
           L13.7 29 L11.5 24.5 L7.2 26.8 L7.8 21.8
           L3 21 L6.5 17.5 L2.8 14.5 L7.3 12.3
           L5 8 L10 8.2 L9.5 3.2 L13.8 5.5 Z"
        fill="url(#vb_g)"
        filter="url(#vb_drop)"
      />
      {/* Shine overlay */}
      <path
        d="M16 1
           L18.2 5.5 L22.5 3.2 L22 8.2 L27 8 L24.7 12.3
           L29.2 14.5 L25.5 17.5 L29 21 L24.2 21.8
           L24.8 26.8 L20.5 24.5 L18.3 29 L16 25.5
           L13.7 29 L11.5 24.5 L7.2 26.8 L7.8 21.8
           L3 21 L6.5 17.5 L2.8 14.5 L7.3 12.3
           L5 8 L10 8.2 L9.5 3.2 L13.8 5.5 Z"
        fill="url(#vb_shine)"
      />
      {/* Checkmark */}
      <path
        d="M10 16.5L14 20.5L22 12"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (!tooltip) return badge;

  return (
    <span className="relative group inline-flex items-center">
      {badge}
      <span className="pointer-events-none absolute bottom-full mb-2 right-1/2 translate-x-1/2 bg-indigo-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl">
        ✦ حساب موثق
        <span className="absolute top-full right-1/2 translate-x-1/2 -translate-y-px border-4 border-transparent border-t-indigo-900" />
      </span>
    </span>
  );
}

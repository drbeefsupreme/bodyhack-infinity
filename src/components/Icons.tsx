// Small stroke icons (24x24). Decorative unless a label is given.
import type { ReactNode, SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number; label?: string };

function Svg({ size = 18, label, children, ...rest }: P & { children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" role={label ? 'img' : undefined} aria-label={label}
      aria-hidden={label ? undefined : true} focusable="false" {...rest}>
      {children}
    </svg>
  );
}

export const IconCompass = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></Svg>;
export const IconVersus = (p: P) => <Svg {...p}><path d="M4 4l7 7M4 4v4M4 4h4M20 4l-7 7M20 4v4M20 4h-4" /><path d="M8 16l-4 4M16 16l4 4M7 13l4 4M17 13l-4 4" /></Svg>;
export const IconTarget = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></Svg>;
export const IconLayers = (p: P) => <Svg {...p}><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></Svg>;
export const IconTrophy = (p: P) => <Svg {...p}><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M10 17h4v3h-4z" /></Svg>;
export const IconFlame = (p: P) => <Svg {...p}><path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-7 1 1 2 2 2 4 1-2 1-4 1-7z" /></Svg>;
export const IconBolt = (p: P) => <Svg {...p}><path d="M13 3 5 14h6l-1 7 8-11h-6z" /></Svg>;
export const IconSun = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Svg>;
export const IconSpot = (p: P) => <Svg {...p}><path d="M9 3h6l-1 4h-4z" /><path d="M10 7 5 21h14L14 7" /></Svg>;
export const IconReset = (p: P) => <Svg {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></Svg>;
export const IconCheck = (p: P) => <Svg {...p}><path d="m5 12 5 5 9-10" /></Svg>;
export const IconX = (p: P) => <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>;
export const IconSwap = (p: P) => <Svg {...p}><path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" /></Svg>;
export const IconDrop = (p: P) => <Svg {...p}><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" /></Svg>;
export const IconPalette = (p: P) => <Svg {...p}><path d="M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5 1-1.5 2-1.5h2a4 4 0 0 0 4-4c0-4.4-4-8-9-8z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7" r="1" /><circle cx="15" cy="7.5" r="1" /></Svg>;
export const IconSliders = (p: P) => <Svg {...p}><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></Svg>;
export const IconBook = (p: P) => <Svg {...p}><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19V5M8 7h7" /></Svg>;
export const IconQuestion = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17h0" /></Svg>;
export const IconStar = (p: P) => <Svg {...p}><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></Svg>;
export const IconEye = (p: P) => <Svg {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></Svg>;
export const IconMotion = (p: P) => <Svg {...p}><path d="M4 12h3l2-5 4 10 2-5h5" /></Svg>;
export const IconPlus = (p: P) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const IconMuscle = (p: P) => <Svg {...p}><path d="M5 18c0-6 2-11 6-12 2 0 3 1 3 3l-2 2c2-1 5 0 6 3 1 3-1 6-5 6H7a2 2 0 0 1-2-2z" /></Svg>;
export const IconLines = (p: P) => <Svg {...p}><path d="M4 8c4-2 12-2 16 0M4 12c4-2 12-2 16 0M4 16c4-2 12-2 16 0" /></Svg>;
export const IconFrame = (p: P) => <Svg {...p}><path d="M5 4l3 8-2 8M19 4l-3 8 2 8M8 12h8" /></Svg>;
export const IconFire = IconFlame;

import React from "react";
type IconProps = React.SVGProps<SVGSVGElement> & { className?: string };

export const SwordIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
    <path
      d="M13 3l8 8-2 2-3-3-6.5 6.5a2 2 0 01-2.83 0L4 19l2.5-2.67a2 2 0 000-2.83L13 5l-3-3 3 1z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);
export const FeatherIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
    <path
      d="M20 4c-5.5 0-10 4.5-10 10v2l-6 6"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path d="M14 10l-8 8" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);
export const HeartIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
    <path
      d="M12 20s-7-4.35-7-10a4 4 0 017-2.65A4 4 0 0119 10c0 5.65-7 10-7 10z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);
export const BookIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
    <path
      d="M4 5h10a3 3 0 013 3v11H7a3 3 0 01-3-3V5z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path d="M17 8h3v11h-3" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);
export const EyeIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
    <path
      d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);
export const ChatIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
    <path d="M4 5h16v10H7l-3 3V5z" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);
export const ShieldIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...p}>
    <path
      d="M12 3l7 3v6c0 4.5-3.5 7.8-7 9-3.5-1.2-7-4.5-7-9V6l7-3z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);

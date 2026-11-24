import type { SVGProps } from 'react';

function BaseIcon({ children, size = 16, ...rest }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function BrandCrownIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M5 19h14v2H5v-2Zm1.4-2.5L4.5 7.5l4.8 3.2L12 5l2.7 5.7 4.8-3.2-1.9 9H6.4Z" />
    </svg>
  );
}

export function CopyIcon({ size = 15 }: { size?: number }) {
  return (
    <BaseIcon size={size}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </BaseIcon>
  );
}

export function CheckIcon({ size = 15 }: { size?: number }) {
  return (
    <BaseIcon size={size}>
      <path d="M20 6 9 17l-5-5" />
    </BaseIcon>
  );
}

export function FlipIcon({ size = 15 }: { size?: number }) {
  return (
    <BaseIcon size={size}>
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </BaseIcon>
  );
}

export function FlagIcon({ size = 15 }: { size?: number }) {
  return (
    <BaseIcon size={size}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </BaseIcon>
  );
}

export function DrawIcon({ size = 15 }: { size?: number }) {
  return (
    <BaseIcon size={size}>
      <path d="M8 6h12" />
      <path d="M8 12h12" />
      <path d="M8 18h12" />
      <circle cx="4" cy="6" r="1" fill="currentColor" />
      <circle cx="4" cy="12" r="1" fill="currentColor" />
      <circle cx="4" cy="18" r="1" fill="currentColor" />
    </BaseIcon>
  );
}

export function UserIcon({ size = 15 }: { size?: number }) {
  return (
    <BaseIcon size={size}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </BaseIcon>
  );
}

export function BotIcon({ size = 15 }: { size?: number }) {
  return (
    <BaseIcon size={size}>
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M12 8V4" />
      <circle cx="12" cy="3" r="1" />
      <circle cx="9" cy="14" r="1" fill="currentColor" />
      <circle cx="15" cy="14" r="1" fill="currentColor" />
    </BaseIcon>
  );
}

export function CloseIcon({ size = 16 }: { size?: number }) {
  return (
    <BaseIcon size={size}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </BaseIcon>
  );
}

export function EyeOffIcon({ size = 15 }: { size?: number }) {
  return (
    <BaseIcon size={size}>
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </BaseIcon>
  );
}

export function ClockIcon({ size = 15 }: { size?: number }) {
  return (
    <BaseIcon size={size}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </BaseIcon>
  );
}

export function UndoIcon({ size = 15 }: { size?: number }) {
  return (
    <BaseIcon size={size}>
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </BaseIcon>
  );
}

export function ShieldIcon({ size = 15 }: { size?: number }) {
  return (
    <BaseIcon size={size}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </BaseIcon>
  );
}

export function BoltIcon({ size = 15 }: { size?: number }) {
  return (
    <BaseIcon size={size}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </BaseIcon>
  );
}

export function SendIcon({ size = 15 }: { size?: number }) {
  return (
    <BaseIcon size={size}>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </BaseIcon>
  );
}

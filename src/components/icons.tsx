import type * as React from "react";

type IconProps = React.SVGProps<SVGSVGElement>;

const base = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconBook(props: IconProps) {
  return (
    <svg aria-hidden="true" {...base} {...props}>
      <path d="M4 19.5V5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2Z" />
      <path d="M19 18.5H6a2 2 0 0 0-2 2" />
      <path d="M8 7h7M8 10.5h7" />
    </svg>
  );
}

export function IconTarget(props: IconProps) {
  return (
    <svg aria-hidden="true" {...base} {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.5" fill="currentColor" />
    </svg>
  );
}

export function IconTrendingUp(props: IconProps) {
  return (
    <svg aria-hidden="true" {...base} {...props}>
      <path d="M3 17 9.5 10.5 14 15 21 7" />
      <path d="M15 7h6v6" />
    </svg>
  );
}

export function IconMessageCircle(props: IconProps) {
  return (
    <svg aria-hidden="true" {...base} {...props}>
      <path d="M4 12a8 8 0 1 1 3.5 6.6L4 20l1.2-3.6A7.9 7.9 0 0 1 4 12Z" />
      <path d="M9 11h.01M12 11h.01M15 11h.01" strokeWidth={2.25} />
    </svg>
  );
}

export function IconSplit(props: IconProps) {
  return (
    <svg aria-hidden="true" {...base} {...props}>
      <path d="M6 4v6c0 2 1.5 3.5 4 3.5h4" />
      <path d="M14 10.5 17.5 13.5 14 16.5" />
      <path d="M6 20v-6" />
      <circle cx="6" cy="4" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="6" cy="20" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconShieldAlert(props: IconProps) {
  return (
    <svg aria-hidden="true" {...base} {...props}>
      <path d="M12 3.5 5 6v5c0 4.5 3 7.8 7 9.5 4-1.7 7-5 7-9.5V6Z" />
      <path d="M12 9v4" />
      <circle cx="12" cy="16" r="0.5" fill="currentColor" />
    </svg>
  );
}

export function IconShieldCheck(props: IconProps) {
  return (
    <svg aria-hidden="true" {...base} {...props}>
      <path d="M12 3.5 5 6v5c0 4.5 3 7.8 7 9.5 4-1.7 7-5 7-9.5V6Z" />
      <path d="m9.5 12 1.8 1.8L14.5 10" />
    </svg>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <svg aria-hidden="true" {...base} {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M15.8 14.2c2.3.3 4.2 2.1 4.2 4.8" />
    </svg>
  );
}

export function IconBarChart(props: IconProps) {
  return (
    <svg aria-hidden="true" {...base} {...props}>
      <path d="M4 20V10M12 20V4M20 20v-7" />
      <path d="M2.5 20h19" />
    </svg>
  );
}

export function IconPiggyBank(props: IconProps) {
  return (
    <svg aria-hidden="true" {...base} {...props}>
      <path d="M4 12.5c0-3.6 3.1-6.5 7.5-6.5S19 8.9 19 12.5 15.9 19 11.5 19c-1.5 0-2.9-.3-4-.9L5 19l.8-2.6c-1.1-1-1.8-2.4-1.8-3.9Z" />
      <path d="M15 8V6M9.5 9h.01" strokeWidth={2.25} />
    </svg>
  );
}

export function IconCalculator(props: IconProps) {
  return (
    <svg aria-hidden="true" {...base} {...props}>
      <rect x="5" y="2.5" width="14" height="19" rx="2" />
      <path d="M8.5 6.5h7v3h-7z" />
      <path
        d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 17h.01M12 17h.01M15.5 17h.01"
        strokeWidth={2.25}
      />
    </svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <svg aria-hidden="true" {...base} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconDots(props: IconProps) {
  return (
    <svg aria-hidden="true" {...base} {...props}>
      <path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth={3.5} />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg aria-hidden="true" {...base} {...props}>
      <path d="m4 12 5.5 5.5L20 7" />
    </svg>
  );
}

export function IconHome(props: IconProps) {
  return (
    <svg aria-hidden="true" {...base} {...props}>
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1Z" />
    </svg>
  );
}

export function IconArrowLeft(props: IconProps) {
  return (
    <svg aria-hidden="true" {...base} {...props}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <svg aria-hidden="true" {...base} {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function IconVolume(props: IconProps) {
  return (
    <svg aria-hidden="true" {...base} {...props}>
      <path d="M11 5 6 9H3v6h3l5 4Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

export function IconStop(props: IconProps) {
  return (
    <svg aria-hidden="true" {...base} {...props}>
      <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
    </svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <svg aria-hidden="true" {...base} {...props}>
      <path d="M4 6.5h16M4 12h16M4 17.5h16" />
    </svg>
  );
}

export function IconX(props: IconProps) {
  return (
    <svg aria-hidden="true" {...base} {...props}>
      <path d="m5 5 14 14M19 5 5 19" />
    </svg>
  );
}

export function IconUser(props: IconProps) {
  return (
    <svg aria-hidden="true" {...base} {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c0-3.9 3.4-7 7.5-7s7.5 3.1 7.5 7" />
    </svg>
  );
}

export function IconGoogle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.59-5.17 3.59-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.28V6.63H1.29A11.96 11.96 0 0 0 0 12c0 1.94.46 3.77 1.29 5.37z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.63l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <svg aria-hidden="true" {...base} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}

export function IconHelp(props: IconProps) {
  return (
    <svg aria-hidden="true" {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function IconLogOut(props: IconProps) {
  return (
    <svg aria-hidden="true" {...base} {...props}>
      <path d="M9 20H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h4" />
      <path d="M16 16l4-4-4-4M20 12H9" />
    </svg>
  );
}

export function IconCreditCard(props: IconProps) {
  return (
    <svg aria-hidden="true" {...base} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M7 15h3" />
    </svg>
  );
}

export function IconDashboard(props: IconProps) {
  return (
    <svg aria-hidden="true" {...base} {...props}>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="4" rx="1.5" />
      <rect x="13" y="10" width="7" height="10" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

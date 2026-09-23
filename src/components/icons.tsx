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

export function IconCheck(props: IconProps) {
  return (
    <svg aria-hidden="true" {...base} {...props}>
      <path d="m4 12 5.5 5.5L20 7" />
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

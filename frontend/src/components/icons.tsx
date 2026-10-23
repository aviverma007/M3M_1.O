type IconProps = { className?: string }

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function BuildingIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <rect x="7" y="3" width="10" height="18" rx="1.5" />
      <path d="M4 21V10.5a1.5 1.5 0 0 1 1.5-1.5H7M20 21v-7.5a1.5 1.5 0 0 0-1.5-1.5H17" />
      <path d="M10 7h4M10 10.5h4M10 14h4M3 21h18" />
    </svg>
  )
}

export function GridIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </svg>
  )
}

export function HomeIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-8.5Z" />
      <path d="M10 20.5V15a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5.5" />
    </svg>
  )
}

export function CheckIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...base} strokeWidth={3} className={className} aria-hidden="true">
      <path d="M5 12.5 10 17 19 7.5" />
    </svg>
  )
}

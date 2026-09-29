import type { ReactNode } from 'react'

// Steer's line icons, drawn on a 20px grid with the same 1.75px stroke as the
// panels' close buttons, for use anywhere in the app. The site icons are
// generic glyphs, not the sites' logos. All are decorative: the text next to
// them carries the meaning.

type IconProps = { size?: number; className?: string }

function Icon({ size = 20, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

/** The map's peak symbol: a filled summit triangle. */
export function PeakMark({ size = 14, className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 14 14" width={size} height={size} aria-hidden="true">
      <path d="M7 1.5 13 12.5H1Z" fill="currentColor" />
    </svg>
  )
}

/** SummitPost: a flag on a summit. */
export function SummitIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 17 8 8l2.5 3.5L13 8l4.5 9Z" />
      <path d="M13 8V2.5l3.5 1.5L13 5.5" />
    </Icon>
  )
}

/** Peakbagger: a peak ticked off a list. */
export function ListPeakIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 17 8.5 6.5l6 10.5Z" />
      <path d="m12.5 5 1.75 1.75L17.5 3.5" />
    </Icon>
  )
}

/** WTA hikes: a boot print. */
export function BootIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7.5 2.5c2.5 0 3.5 2 3.5 4.5 0 2-1 3-1 4.5s1 2 1 3.5c0 1.5-1.25 2.5-2.75 2.5S5.5 16.5 5.5 14.5c0-1.75.75-2.5.5-4.5C5.75 8 4.5 7 4.5 5.25S5.5 2.5 7.5 2.5Z" />
      <path d="M13.5 6.5h2M13.5 10h2.5M13.5 13.5h2" />
    </Icon>
  )
}

/** A search, not an exact page. */
export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8.5" cy="8.5" r="5" />
      <path d="m12.25 12.25 4.25 4.25" />
    </Icon>
  )
}

/** An exact page on another site, opening in a new tab. */
export function ExternalIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M11 4h5v5M16 4l-7 7" />
      <path d="M14 12.5V16H4V6h3.5" />
    </Icon>
  )
}

/** Create: a plus. */
export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 4v12M4 10h12" />
    </Icon>
  )
}

/** Undo: an arrow curling back to the left. */
export function UndoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 4.5 3.5 8 7 11.5" />
      <path d="M3.5 8h8a4.5 4.5 0 0 1 0 9H8" />
    </Icon>
  )
}

/** Redo: an arrow curling forward to the right. */
export function RedoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M13 4.5 16.5 8 13 11.5" />
      <path d="M16.5 8h-8a4.5 4.5 0 0 0 0 9H12" />
    </Icon>
  )
}

/** Clear: a bin. */
export function ClearIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 5.5h13M8 5.5V3.5h4v2" />
      <path d="M5 5.5 6 16.5h8l1-11" />
    </Icon>
  )
}

/** Close loop: a path that runs back into its own start. */
export function LoopIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="5.5" cy="14.5" r="2" />
      <path d="M7.5 14.5h4a5 5 0 0 0 0-10H9a4.5 4.5 0 0 0-4.5 4.5v1.5" />
      <path d="M2.5 8.5 4.5 10.5 6.5 8.5" />
    </Icon>
  )
}

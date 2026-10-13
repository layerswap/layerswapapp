import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge class names with Tailwind conflict resolution (clsx + tailwind-merge).
 * Use this — not `classNames` — for components that accept a `className` prop
 * intended to override variant defaults (e.g. shadcn components), so later
 * classes win instead of both being emitted.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

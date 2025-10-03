import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Tremor raw helpers (minimal)
export function cx(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Focus utilities approximating Tremor tokens
export const focusInput =
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-gray-200 dark:focus-visible:ring-gray-700/30"

export const focusRing =
  "outline-hidden ring-2 ring-gray-200 dark:ring-gray-700/30"

export const hasErrorInput =
  "aria-invalid:ring-2 aria-invalid:ring-red-200 aria-invalid:border-red-500 dark:aria-invalid:ring-red-400/20"
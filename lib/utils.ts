import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines conditional class names and resolves conflicting Tailwind classes.
 *
 * shadcn components accept caller-provided class names for extension. Running
 * the final list through tailwind-merge ensures a caller can intentionally
 * override a component default without leaving conflicting utilities behind.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

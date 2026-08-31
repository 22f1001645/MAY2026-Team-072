import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function to merge Tailwind CSS classes with clsx
 * Handles conditional classes and tailwind conflicts
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Format a number with commas for display (e.g., 34000 -> "34,000")
 */
export function formatNumber(num: number): string {
    return num.toLocaleString('en-IN')
}

/**
 * Check if the code is running in a browser environment
 */
export function isBrowser(): boolean {
    return typeof window !== 'undefined'
}

/**
 * Debounce function for scroll/resize handlers
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null
    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout)
        timeout = setTimeout(() => func(...args), wait)
    }
}

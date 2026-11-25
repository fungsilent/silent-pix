import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

import type { ClassValue } from 'clsx'

export function mergeClasses(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs))
}

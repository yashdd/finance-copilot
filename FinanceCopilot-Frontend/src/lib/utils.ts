import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { AxiosError } from "axios"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getAxiosErrorMessage(err: AxiosError, fallback: string): string {
  const data = err.response?.data as
    | { detail?: string; message?: string; content?: string }
    | string
    | undefined
  if (typeof data === 'string') return data
  if (data && (data.detail || data.message || data.content)) {
    return data.detail ?? data.message ?? data.content ?? fallback
  }
  return err.message || fallback
}

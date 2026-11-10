import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (date: Date | string | number | undefined | null): string => {
  if (date === undefined || date === null || date === '') return '';

  if (date instanceof Date) {
    if (isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  if (typeof date === 'string') {
    const trimmed = date.trim();
    // Already DD-MM-YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) return trimmed;
    // YYYY-MM-DD or YYYY/MM/DD
    const matchYMD = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (matchYMD) {
      const year = matchYMD[1];
      const month = matchYMD[2].padStart(2, '0');
      const day = matchYMD[3].padStart(2, '0');
      return `${day}-${month}-${year}`;
    }
    // DD/MM/YYYY or DD-MM-YYYY
    const matchDMY = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (matchDMY) {
      const day = matchDMY[1].padStart(2, '0');
      const month = matchDMY[2].padStart(2, '0');
      const year = matchDMY[3];
      return `${day}-${month}-${year}`;
    }
  }

  // Handle numeric epoch timestamps or ISO date strings
  const ts = typeof date === 'number' ? date : /^\d{10,}$/.test(String(date)) ? Number(date) : NaN;
  const d = isNaN(ts) ? new Date(date as string) : new Date(ts);
  if (isNaN(d.getTime())) return String(date || '');

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

export const formatDisplayDate = formatDate;
export const formatDateDMY = formatDate;

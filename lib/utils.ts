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
    // If already in DD/MM/YYYY format, preserve it with slashes (Day-Month-Year sequence)
    const matchDMYSlash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (matchDMYSlash) {
      const day = matchDMYSlash[1].padStart(2, '0');
      const month = matchDMYSlash[2].padStart(2, '0');
      const year = matchDMYSlash[3];
      return `${day}/${month}/${year}`;
    }

    // If already in DD-MM-YYYY format, preserve it with hyphens
    const matchDMYHyphen = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
    if (matchDMYHyphen) {
      const day = matchDMYHyphen[1].padStart(2, '0');
      const month = matchDMYHyphen[2].padStart(2, '0');
      const year = matchDMYHyphen[3];
      return `${day}-${month}-${year}`;
    }

    // If in YYYY-MM-DD or YYYY/MM/DD format, convert to Day-Month-Year sequence
    const matchYMD = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (matchYMD) {
      const year = matchYMD[1];
      const month = matchYMD[2].padStart(2, '0');
      const day = matchYMD[3].padStart(2, '0');
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

export const formatDateDDMMYY = (date: Date | string | number | undefined | null): string => {
  if (date === undefined || date === null || date === "") return "";
  const str = String(date).trim();
  const datePart = str.split("T")[0].split(" ")[0];
  const ymdMatch = datePart.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${d.padStart(2, "0")}-${m.padStart(2, "0")}-${y.slice(-2)}`;
  }
  const dmyMatch = datePart.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${d.padStart(2, "0")}-${m.padStart(2, "0")}-${y.slice(-2)}`;
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = String(d.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  }
  return str;
};

/**
 * Converts a 12-hour or arbitrary time string (e.g. "11:25 PM", "9:05 AM") into 24-hour "HH:MM" for <input type="time">
 */
export function to24Hour(timeStr?: string): string {
  if (!timeStr) return "";
  const trimmed = timeStr.trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return "";
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = match[3] ? match[3].toUpperCase() : null;
  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

/**
 * Converts a 24-hour time string from <input type="time"> (e.g. "23:25", "00:15") into 12-hour "HH:MM AM/PM"
 */
export function to12Hour(time24?: string): string {
  if (!time24) return "";
  const trimmed = time24.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return trimmed;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
}


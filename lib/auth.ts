/**
 * Svasth-HMS / Cortex Hospital — Lightweight localStorage-based Auth
 * Credentials are hardcoded (no external API needed).
 * Session auto-expires after 12 hours.
 */

export type UserRole = "admin" | "staff";

export interface AuthUser {
  email: string;
  role: UserRole;
  name: string;
  loginAt: number;   // ms since epoch
  expiresAt: number; // ms since epoch
}

const SESSION_KEY = "cortex_auth_session";
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

// ── Hardcoded credentials ──────────────────────────────────────────────────────
const CREDENTIALS: { email: string; password: string; role: UserRole; name: string }[] = [
  {
    email: "admin@cortexhospital.com",
    password: "Admin@1234",
    role: "admin",
    name: "Administrator",
  },
  {
    email: "staff@cortexhospital.com",
    password: "Staff@1234",
    role: "staff",
    name: "Staff",
  },
];

// ── Public API ─────────────────────────────────────────────────────────────────

export function login(email: string, password: string): AuthUser | null {
  const match = CREDENTIALS.find(
    (c) =>
      c.email.trim().toLowerCase() === email.trim().toLowerCase() &&
      c.password === password
  );
  if (!match) return null;

  const now = Date.now();
  const user: AuthUser = {
    email: match.email,
    role: match.role,
    name: match.name,
    loginAt: now,
    expiresAt: now + SESSION_DURATION_MS,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  return user;
}

export function logout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
}

export function getSession(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const user: AuthUser = JSON.parse(raw);
    if (Date.now() > user.expiresAt) {
      logout();
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

export function isAdmin(): boolean {
  return getSession()?.role === "admin";
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}

// ── Staff restrictions ─────────────────────────────────────────────────────────
// Routes that staff CANNOT access
export const ADMIN_ONLY_PATHS = [
  "/admin/prescription",
  "/admin/medicines/sales",
  "/admin/templates",
];

export function canAccessPath(path: string, role: UserRole): boolean {
  if (role === "admin") return true;
  return !ADMIN_ONLY_PATHS.some((p) => path.startsWith(p));
}


/**
 * adminuser.ts — compatibility shim over lib/auth.ts
 * The sidebar + layout still call these functions; they now use localStorage auth.
 */
import { getSession as getAuthSession, logout as libLogout, AuthUser as LibAuthUser } from '@/lib/auth';

export type AuthUser = {
  email: string;
  role: string;
  name?: string;
};

export const signOut = async (): Promise<void> => {
  libLogout();
  if (typeof window !== 'undefined') {
    window.location.href = '/auth/login';
  }
};

export const getCurrentUser = async (): Promise<AuthUser | null> => {
  const session = getAuthSession();
  if (!session) return null;
  return { email: session.email, role: session.role, name: session.name };
};

export const getSession = async (): Promise<{ user: AuthUser | null; expiresAt?: number }> => {
  const session = getAuthSession();
  if (!session) return { user: null };
  return {
    user: { email: session.email, role: session.role, name: session.name },
    expiresAt: session.expiresAt,
  };
};

// Keep the rest as stubs for build compatibility
export const signUpWithEmail = async (_email: string, _password: string) => {
  throw new Error('Sign up is not enabled.');
};

export const signInWithEmail = async (_email: string, _password: string): Promise<never> => {
  throw new Error('Use /auth/login instead.');
};

export const resendLoginOtp = async (_email: string, _password: string): Promise<never> => {
  throw new Error('OTP not used in this build.');
};

export const verifyLoginOtp = async (_email: string, _otp: string, _sessionId: string): Promise<never> => {
  throw new Error('OTP not used in this build.');
};

export const resetPassword = async (_email: string) => ({ success: false, message: 'Not supported.' });
export const updatePassword = async (_password: string, _token: string) => ({ success: false, message: 'Not supported.' });

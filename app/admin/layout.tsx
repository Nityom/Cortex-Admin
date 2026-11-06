'use client';

import React, { useEffect, useState } from "react";
import { AppTopNav } from "@/components/top-nav";
import { useRouter, usePathname } from "next/navigation";
import { getSession, logout, canAccessPath } from "@/lib/auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const session = getSession();

    // Not logged in → redirect to login
    if (!session) {
      router.replace("/auth/login");
      return;
    }

    // Role-based path check
    if (!canAccessPath(pathname, session.role)) {
      setAccessDenied(true);
      setChecking(false);
      return;
    }

    setAccessDenied(false);
    setChecking(false);

    // Schedule auto-logout when session expires
    const msUntilExpiry = session.expiresAt - Date.now();
    if (msUntilExpiry <= 0) {
      logout();
      router.replace("/auth/login");
      return;
    }
    const timer = setTimeout(() => {
      logout();
      router.replace("/auth/login");
    }, msUntilExpiry);

    return () => clearTimeout(timer);
  }, [router, pathname]);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 animate-spin text-emerald-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-slate-500 font-semibold">Verifying session…</p>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen w-full flex flex-col bg-slate-50">
        <AppTopNav />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">Access Restricted</h2>
            <p className="text-slate-500 text-sm mb-6">
              Your account (Staff) does not have permission to access this section.
              Please contact your administrator.
            </p>
            <button
              onClick={() => router.push("/admin/opd")}
              className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-sm hover:bg-emerald-700 transition cursor-pointer"
            >
              Go to OPD Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-50/50 font-sans">
      <AppTopNav />
      <main className="flex-1 w-full px-4 sm:px-6 md:px-8 lg:px-10 py-6 overflow-y-auto">
        <div className="w-full max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

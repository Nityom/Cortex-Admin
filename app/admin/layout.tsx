'use client';

import React, { useEffect, useState } from "react";
import { AppSidebar } from "@/components/sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useRouter, usePathname } from "next/navigation";
import { getSession, logout, canAccessPath } from "@/lib/auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [profileInitials, setProfileInitials] = useState("CH");
  const routeSlug = pathname?.split("/").filter(Boolean).at(-1) || "overview";
  const routeLabels: Record<string, string> = { opd: "OPD queue", patients: "Patient management", appointments: "Appointments", ipd: "Inpatient care", billing: "Hospital billing", prescription: "Prescriptions", templates: "Clinical templates", inventory: "Inventory", doctors: "Care team", registers: "Registers", installments: "Payment plans", medicines: "Medicines", crowns: "Dental care", stockists: "Stockists", investigations: "Investigations", "treatment-links": "Treatment links", "consumable-settings": "Consumable settings", sales: "Sales report" };
  const currentSection = routeLabels[routeSlug] || routeSlug.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

  useEffect(() => {
    const session = getSession();
    if (session?.name) {
      setProfileInitials(session.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase());
    }

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
      <SidebarProvider>
        <div className="flex h-screen w-full overflow-hidden bg-gray-50">
          <AppSidebar />
          <div className="flex-1 min-w-0 flex items-center justify-center p-8">
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
                className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-sm hover:bg-emerald-700 transition"
              >
                Go to OPD Dashboard
              </button>
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="admin-app-frame flex w-[calc(100%-36px)] overflow-hidden bg-white max-md:m-2 max-md:h-[calc(100dvh-16px)] max-md:w-[calc(100%-16px)]">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="admin-topbar flex h-14 shrink-0 items-center justify-between border-b border-[#e5ece6] bg-white/90 px-5 md:px-8">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[#9aa99f]">Workspace</span><span className="text-[#c2cdc5]">/</span>
              <span className="font-medium text-[#536c5e]">{currentSection}</span>
            </div>
            <span aria-label="Current user" className="grid h-9 w-9 place-items-center rounded-full bg-[#eaf3ec] text-[10px] font-bold text-[#4a8464]">{profileInitials}</span>
          </header>
          <main className="admin-page-content min-w-0 flex-1 overflow-y-auto p-4 pt-5 md:p-7 md:pt-7">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Calendar,
  Inbox,
  ClipboardList,
  Bed,
  ReceiptText,
  Pill,
  TrendingUp,
  CreditCard,
  FileText,
  BookmarkCheck,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Building2,
} from 'lucide-react';
import { hospitalConfig } from '@/config/hospital';
import { useIsAdmin } from '@/hooks/use-is-admin';
import { signOut } from '@/services/adminuser';

interface TopNavItem {
  id: string;
  title: string;
  url: string;
  icon: React.ElementType;
}

export function AppTopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAdmin } = useIsAdmin();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [profileInitials, setProfileInitials] = useState('CH');

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('cortex_auth_session') : null;
      if (raw) {
        const session = JSON.parse(raw);
        if (session?.email) {
          setUserEmail(session.email);
        }
        if (session?.name) {
          setProfileInitials(
            session.name
              .split(/\s+/)
              .slice(0, 2)
              .map((part: string) => part[0])
              .join('')
              .toUpperCase()
          );
        } else if (session?.email) {
          setProfileInitials(session.email.substring(0, 2).toUpperCase());
        }
      }
    } catch (_) {}
  }, []);

  const navItems: TopNavItem[] = [
    ...(hospitalConfig.modules.appointments
      ? [{ id: 'appointments', title: 'Appointments', url: '/admin/appointments', icon: Calendar }]
      : []),
    ...(hospitalConfig.modules.patientManagement
      ? [{ id: 'patient-management', title: 'Patients', url: '/admin/patients', icon: Inbox }]
      : []),
    ...(hospitalConfig.modules.opd
      ? [{ id: 'opd-management', title: 'OPD Queue', url: '/admin/opd', icon: ClipboardList }]
      : []),
    ...(hospitalConfig.modules.ipd
      ? [{ id: 'ipd-management', title: 'IPD Care', url: '/admin/ipd', icon: Bed }]
      : []),
    ...(hospitalConfig.modules.billing
      ? [{ id: 'hospital-billing', title: 'Billing', url: '/admin/billing', icon: ReceiptText }]
      : []),
    ...(isAdmin && hospitalConfig.modules.prescription
      ? [{ id: 'generate-prescription', title: 'Prescriptions', url: '/admin/prescription', icon: FileText }]
      : []),
    ...(isAdmin && hospitalConfig.modules.clinicalTemplates
      ? [{ id: 'clinical-templates', title: 'Templates', url: '/admin/templates', icon: BookmarkCheck }]
      : []),
    ...(hospitalConfig.modules.installments
      ? [{ id: 'installments', title: 'Dues & Installments', url: '/admin/installments', icon: CreditCard }]
      : []),
    ...(hospitalConfig.modules.medicinesCatalog
      ? [{ id: 'medicine-management', title: 'Pharmacy', url: '/admin/medicines', icon: Pill }]
      : []),
    ...(isAdmin && hospitalConfig.modules.salesReport
      ? [{ id: 'sales-report', title: 'Sales Report', url: '/admin/medicines/sales', icon: TrendingUp }]
      : []),
  ];

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const isCurrentActive = (itemUrl: string) => {
    if (pathname === itemUrl || pathname.startsWith(`${itemUrl}/`)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200/90 shadow-2xs">
      {/* Top Main Row: Branding + User Profile */}
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/admin/opd')}
              className="flex items-center gap-2.5 group text-left cursor-pointer select-none"
            >
              <img
                src={hospitalConfig.branding.svasthLogoUrl}
                alt="Svaasth HMS"
                className="h-8 w-8 shrink-0 object-contain group-hover:scale-105 transition-transform"
              />
              <span className="whitespace-nowrap text-[13px] font-extrabold tracking-[0.12em] text-[#34785b] group-hover:text-[#285d46] transition-colors">
                SVAASTH HMS
              </span>
            </button>
          </div>

          {/* Right: User Status & Actions */}
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
              <span
                aria-label="User Avatar"
                className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-600 text-[10px] font-black text-white"
              >
                {profileInitials}
              </span>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-slate-800 truncate max-w-[140px]">
                  {userEmail || 'Administrator'}
                </span>
                <span className="text-[9px] font-extrabold text-emerald-700 uppercase tracking-wider">
                  {isAdmin ? 'System Admin' : 'Staff Member'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-transparent hover:border-rose-200"
              title="Sign out of Cortex HMS"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Logout</span>
            </button>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Second Row: Desktop Horizontal Navigation Bar */}
      <div className="hidden md:block bg-slate-50/80 border-t border-slate-200/70 overflow-x-auto">
        <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10">
          <nav className="flex items-center gap-1.5 py-2">
            {navItems.map((item) => {
              const active = isCurrentActive(item.url);
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => router.push(item.url)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-slate-500'}`} />
                  <span>{item.title}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Dropdown Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1 shadow-lg animate-in slide-in-from-top-2">
          {navItems.map((item) => {
            const active = isCurrentActive(item.url);
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push(item.url);
                }}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-3 text-left ${
                  active
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-emerald-700' : 'text-slate-400'}`} />
                <span>{item.title}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}


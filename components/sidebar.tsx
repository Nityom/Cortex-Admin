"use client";
import React, { useState, useEffect } from 'react';
import { Inbox, Menu, ChevronRight, Pill, FileText, LogOut, Wrench, TrendingUp, CreditCard, Package, Calendar, ClipboardList, Activity, UserCheck, Crown, ReceiptText, Link2, Bed, BookmarkCheck } from "lucide-react";
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser, signOut } from "@/services/adminuser";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { hospitalConfig } from "@/config/hospital";

interface CustomSidebarProps {
  children: React.ReactNode;
  className?: string;
}

const CustomSidebar: React.FC<CustomSidebarProps> = ({ children, className }) => (
  <aside className={`${className} transition-all duration-300 ease-in-out overflow-hidden`}>
    {children}
    <style jsx>{`
      aside {
        animation: slideIn 0.3s ease forwards;
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }
      aside::-webkit-scrollbar,
      aside :global(*::-webkit-scrollbar) {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }
      @keyframes slideIn {
        from { transform: translateX(-20px); opacity: 0.8; }
        to { transform: translateX(0); opacity: 1; }
      }
    `}</style>
  </aside>
);

interface MenuGroupProps {
  label?: string;
  children: React.ReactNode;
}

const MenuGroup: React.FC<MenuGroupProps> = ({ label, children }) => (
  <div className="mb-4">
    {label && <h3 className="text-gray-400 text-xs uppercase tracking-wider px-4 mb-2 font-semibold">{label}</h3>}
    <div>{children}</div>
  </div>
);

interface MenuItemProps {
  icon: React.ElementType;
  title: string;
  url: string;
  isActive: boolean;
  onClick: (id: string, url: string) => void;
  id: string;
  isExpanded: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon: Icon, title, url, isActive, onClick, id, isExpanded }) => (
  <li className="mb-2 px-2">
    <a
      href="#"
      title={!isExpanded ? title : undefined}
      className={`flex items-center w-full py-3 px-3 rounded-lg transition-all duration-200 ${isActive
        ? 'bg-blue-600 text-white shadow-sm'
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        } ${!isExpanded ? 'justify-center' : ''}`}
      onClick={(e) => {
        e.preventDefault();
        onClick(id, url);
      }}
    >
      <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`} />
      {isExpanded && (
        <>
          <span className="ml-3 whitespace-nowrap font-medium text-sm">{title}</span>
          {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
        </>
      )}
    </a>
    <style jsx>{`
      li {
        transition: transform 0.15s ease;
      }
      li:hover {
        transform: scale(1.01);
      }
      li:active {
        transform: scale(0.99);
      }
    `}</style>
  </li>
);

interface MenuItemDef {
  id: string;
  title: string;
  url: string;
  icon: React.ElementType;
}

export function AppSidebar({ children }: { children?: React.ReactNode }): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState<string>("patient-management");
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [animateItems, setAnimateItems] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("staff");
  const { isAdmin } = useIsAdmin();

  useEffect(() => {
    const checkViewport = (): void => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsExpanded(false);
      }
    };

    // Load user from localStorage session
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('cortex_auth_session') : null;
      if (raw) {
        const session = JSON.parse(raw);
        if (session?.email) setUserEmail(session.email);
        if (session?.role) setUserRole(session.role);
      }
    } catch (_) {}

    checkViewport();
    window.addEventListener('resize', checkViewport);
    setTimeout(() => setAnimateItems(true), 100);
    return () => window.removeEventListener('resize', checkViewport);
  }, [router]);

  const items: MenuItemDef[] = [
    ...(hospitalConfig.modules.appointments ? [{ id: "appointments", title: "Appointments", url: "/admin/appointments", icon: Calendar }] : []),
    ...(hospitalConfig.modules.patientManagement ? [{ id: "patient-management", title: "Patient Management", url: "/admin/patients", icon: Inbox }] : []),
    ...(hospitalConfig.modules.opd ? [{ id: "opd-management", title: "OPD Management", url: "/admin/opd", icon: ClipboardList }] : []),
    ...(hospitalConfig.modules.ipd ? [{ id: "ipd-management", title: "IPD Management", url: "/admin/ipd", icon: Bed }] : []),
    ...(hospitalConfig.modules.billing ? [{ id: "hospital-billing", title: "OPD & Hospital Billing", url: "/admin/billing", icon: ReceiptText }] : []),
    ...(hospitalConfig.modules.medicinesCatalog ? [{ id: "medicine-management", title: "Medicine Management", url: "/admin/medicines", icon: Pill }] : []),
    ...(isAdmin && hospitalConfig.modules.salesReport ? [{ id: "sales-report", title: "Sales Report", url: "/admin/medicines/sales", icon: TrendingUp }] : []),
    ...(hospitalConfig.modules.installments ? [{ id: "installments", title: "Payment Installments", url: "/admin/installments", icon: CreditCard }] : []),
    ...(isAdmin && hospitalConfig.modules.prescription ? [{ id: "generate-prescription", title: "Generate Prescription", url: "/admin/prescription", icon: FileText }] : []),
    ...(isAdmin && hospitalConfig.modules.clinicalTemplates ? [{ id: "prescription-templates", title: "Clinical Templates", url: "/admin/templates", icon: BookmarkCheck }] : []),
  ];

  useEffect(() => {
    if (pathname) {
      const current = items.find((item) => pathname.startsWith(item.url));
      if (current) {
        setActiveItem(current.id);
      }
    }
  }, [pathname]);

  const handleItemClick = async (id: string, url: string): Promise<void> => {
    try {
      setActiveItem(id);
      await router.push(url);
      if (isMobile) {
        setIsExpanded(false);
      }
    } catch (error: unknown) {
      console.error('Error during navigation:', error);
      window.location.href = url;
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const toggleSidebar = (): void => {
    setIsExpanded(!isExpanded);
  };

  const showExpanded = isMobile || isExpanded;

  return (
    <>
      {isMobile && isExpanded && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-20"
          onClick={() => setIsExpanded(false)}
        />
      )}

      <CustomSidebar
        className={`
          bg-white border-r border-gray-200 text-gray-900
          flex flex-col shrink-0
          ${isMobile ? 'fixed z-30 h-full' : 'relative h-screen'}
          ${isMobile
            ? (isExpanded ? 'translate-x-0 w-60' : '-translate-x-full w-60')
            : (isExpanded ? 'w-60 translate-x-0' : 'w-16 translate-x-0')
          }
          shadow-sm
        `}
      >
        {/* Logo/header with toggle always inside sidebar */}
        <div
          className={`relative flex items-center border-b border-gray-100 shrink-0 transition-all duration-200 ${
            showExpanded ? 'h-20 px-3 justify-center' : 'h-16 px-3 justify-center'
          }`}
        >
          {showExpanded ? (
            <>
              <div
                className="flex items-center justify-center w-full px-7 cursor-pointer"
                onClick={() => router.push(items[0]?.url || '/admin/appointments')}
                title={hospitalConfig.name}
              >
                <img
                  src={hospitalConfig.branding.logoUrl}
                  alt={hospitalConfig.name}
                  className="h-14 w-auto max-h-14 max-w-full object-contain select-none"
                />
              </div>
              <button
                onClick={toggleSidebar}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200"
                title="Collapse sidebar"
              >
                <Menu size={18} />
              </button>
            </>
          ) : (
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200"
              title="Expand sidebar"
            >
              <Menu size={18} />
            </button>
          )}
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar py-3 px-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <MenuGroup label={showExpanded ? "MENU" : ""}>
            <ul>
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className={animateItems ? 'fade-slide-up' : 'opacity-0'}
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <MenuItem
                    icon={item.icon}
                    title={item.title}
                    url={item.url}
                    isActive={activeItem === item.id}
                    onClick={handleItemClick}
                    id={item.id}
                    isExpanded={showExpanded}
                  />
                </div>
              ))}
            </ul>
          </MenuGroup>
        </div>

        {/* Footer / user section */}
        <div className={`border-t border-gray-100 shrink-0 ${showExpanded ? 'p-4' : 'p-2 flex flex-col items-center gap-3'}`}>
          {showExpanded ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-white">{userEmail ? userEmail.substring(0, 2).toUpperCase() : ''}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 truncate">{userEmail}</p>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${isAdmin ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {isAdmin ? 'Admin' : 'Staff'}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200 text-sm"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
              {/* Svasth HMS Branding */}
              {hospitalConfig.branding.poweredBySvasth && (
                <div className="pt-2 mt-1 border-t border-gray-100 flex items-center justify-center gap-1.5 text-[11px] text-gray-400 select-none">
                  <span>Powered by</span>
                  <img src={hospitalConfig.branding.svasthLogoUrl} alt="Svasth HMS" className="h-4 w-4 rounded-xs object-contain" />
                  <span className="font-semibold text-gray-600">Svasth HMS</span>
                </div>
              )}
            </div>
          ) : (
            <>
              <div
                className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center cursor-pointer"
                title={userEmail}
              >
                <span className="text-xs font-semibold text-white">{userEmail ? userEmail.substring(0, 2).toUpperCase() : ''}</span>
              </div>
              <button
                onClick={handleLogout}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
              {/* Svasth HMS Branding collapsed */}
              {hospitalConfig.branding.poweredBySvasth && (
                <div className="pt-1 border-t border-gray-100 flex items-center justify-center select-none" title="Powered by Svasth HMS">
                  <img src={hospitalConfig.branding.svasthLogoUrl} alt="Svasth HMS" className="h-5 w-5 rounded-xs object-contain opacity-70 hover:opacity-100 transition" />
                </div>
              )}
            </>
          )}
        </div>
      </CustomSidebar>

      {/* Mobile toggle button (shown when sidebar is closed) */}
      {isMobile && !isExpanded && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-20 bg-white text-gray-700 p-2 rounded-lg shadow-md border border-gray-200 hover:bg-gray-50 transition-all duration-200"
        >
          <Menu size={20} />
        </button>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeSlideUp {
          from { transform: translateY(8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .fade-slide-up {
          animation: fadeSlideUp 0.35s ease forwards;
        }
      `}</style>
    </>
  );
}
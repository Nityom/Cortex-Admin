"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/auth";

/** Root / redirects to OPD dashboard if logged in, or login if not */
export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    const session = getSession();
    router.replace(session ? "/admin/opd" : "/auth/login");
  }, [router]);
  return null;
}

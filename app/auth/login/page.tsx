"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { getSession, login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getSession()) router.replace("/admin/opd");
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setTimeout(() => {
      const user = login(email.trim(), password);
      if (!user) {
        setError("We couldn't sign you in with those details. Check your email and password and try again.");
        setLoading(false);
        return;
      }
      router.replace("/admin/opd");
    }, 500);
  };

  return (
    <AuthLayout title="Welcome back" description="Sign in with your hospital account to continue." footer={<>Need help signing in? <a href="mailto:support@cortexhospital.com" className="font-semibold text-teal-700 hover:text-teal-800">Contact support</a></>}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">Email address</label>
          <div className="relative"><Mail className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" /><input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} placeholder="name@hospital.com" className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10" /></div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between"><label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</label><Link href="/auth/forgot_password" className="text-xs font-semibold text-teal-700 hover:text-teal-800">Forgot password?</Link></div>
          <div className="relative"><LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" /><input id="password" type={showPassword ? "text" : "password"} required autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }} placeholder="Enter your password" className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600/30">{showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}</button></div>
        </div>
        <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#087f78] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#066b66] focus:outline-none focus:ring-4 focus:ring-teal-600/20 disabled:cursor-not-allowed disabled:opacity-60">{loading ? "Signing in…" : <>Sign in to your workspace <ArrowRight className="h-4 w-4" /></>}</button>
        <p className="text-center text-xs leading-5 text-slate-400">By continuing, you agree to use this account only for authorized hospital work.</p>
      </form>
    </AuthLayout>
  );
}

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { updatePassword } from "@/services/adminuser";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const token = useSearchParams().get("token") || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    if (password !== confirmPassword) { setError("Your passwords don’t match. Please check and try again."); setLoading(false); return; }
    if (password.length < 8) { setError("Choose a password with at least 8 characters."); setLoading(false); return; }
    if (!token) { setError("This reset link is invalid or has expired. Please request a new one."); setLoading(false); return; }
    try { await updatePassword(password, token); setSuccess(true); setTimeout(() => router.push("/auth/login"), 3000); }
    catch (error: unknown) { setError(error instanceof Error ? error.message : "An error occurred. Please try again."); }
    finally { setLoading(false); }
  };

  return <AuthLayout title={success ? "Password updated" : "Create a new password"} description={success ? "Your account is ready to use with your new password." : "Choose a strong password you haven’t used for this account before."} footer={!success ? <>Remember your password? <Link href="/auth/login" className="font-semibold text-teal-700 hover:text-teal-800">Sign in</Link></> : undefined}>
    {success ? <div className="space-y-5 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-7 w-7" /></div><p className="text-sm leading-6 text-slate-600">Your password has been changed successfully. You can now sign in to the hospital portal.</p><button onClick={() => router.push("/auth/login")} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#087f78] px-4 text-sm font-semibold text-white transition hover:bg-[#066b66]">Continue to sign in <ArrowRight className="h-4 w-4" /></button></div> : <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      <div><label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">New password</label><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" /><input id="password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10" /></div></div>
      <div><label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-slate-700">Confirm new password</label><div className="relative"><ShieldCheck className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" /><input id="confirmPassword" type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Enter your password again" className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10" /></div></div>
      <p className="text-xs text-slate-500">Use at least 8 characters.</p>
      <button type="submit" disabled={loading} className="h-12 w-full rounded-xl bg-[#087f78] px-4 text-sm font-semibold text-white transition hover:bg-[#066b66] focus:outline-none focus:ring-4 focus:ring-teal-600/20 disabled:opacity-60">{loading ? "Updating password…" : "Save new password"}</button>
    </form>}
  </AuthLayout>;
}

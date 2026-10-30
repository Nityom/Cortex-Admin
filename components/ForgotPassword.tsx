"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { resetPassword } from "@/services/adminuser";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(""); setSuccess(false);
    try { await resetPassword(email); setSuccess(true); }
    catch (error: unknown) { setError(error instanceof Error ? error.message : "An error occurred. Please try again."); }
    finally { setLoading(false); }
  };

  return <AuthLayout title="Reset your password" description="Enter your work email and we’ll send you a secure link to choose a new password." footer={<Link href="/auth/login" className="inline-flex items-center gap-2 font-semibold text-teal-700 hover:text-teal-800"><ArrowLeft className="h-4 w-4" /> Back to sign in</Link>}>
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {success ? <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><div className="flex gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" /><div><p className="text-sm font-semibold text-emerald-900">Check your inbox</p><p className="mt-1 text-sm leading-5 text-emerald-800">If an account matches that email, you’ll receive a password reset link shortly.</p></div></div></div> : <>
        <div><label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">Work email</label><div className="relative"><Mail className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" /><input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@hospital.com" className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10" /></div></div>
        <button type="submit" disabled={loading} className="h-12 w-full rounded-xl bg-[#087f78] px-4 text-sm font-semibold text-white transition hover:bg-[#066b66] focus:outline-none focus:ring-4 focus:ring-teal-600/20 disabled:opacity-60">{loading ? "Sending secure link…" : "Send reset link"}</button>
      </>}
      <p className="text-center text-xs leading-5 text-slate-400">For your security, reset links expire after a limited time.</p>
    </form>
  </AuthLayout>;
}

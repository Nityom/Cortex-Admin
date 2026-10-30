"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, AlertCircle, Shield, Activity, Users, Stethoscope, CheckCircle } from "lucide-react";
import { login, getSession } from "@/lib/auth";

const FEATURES = [
  { icon: Activity, label: "OPD & IPD Management", desc: "Manage outpatient & inpatient queues seamlessly" },
  { icon: Stethoscope, label: "Prescription & Clinical", desc: "Digital prescriptions with letterhead & email" },
  { icon: Users, label: "Patient Directory", desc: "Centralized patient records and history" },
  { icon: Shield, label: "Billing & Payments", desc: "Automated billing with installment tracking" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [featureIdx, setFeatureIdx] = useState(0);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    const session = getSession();
    if (session) router.replace("/admin/opd");
  }, [router]);

  // Animate features carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setFeatureIdx((prev) => (prev + 1) % FEATURES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const user = login(email.trim(), password);
      if (!user) {
        setError("Invalid email or password. Please try again.");
        setLoading(false);
        return;
      }
      // Redirect based on role
      router.replace("/admin/opd");
    }, 700); // slight delay for UX feel
  };

  const feature = FEATURES[featureIdx];

  return (
    <div className="min-h-screen flex bg-slate-50 overflow-hidden">

      {/* ── Left Panel (Branding) ─────────────────── */}
      <div
        className="hidden lg:flex lg:w-[55%] relative flex-col items-center justify-center overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0d1b2a 0%, #0a3d62 40%, #0e6655 75%, #117a65 100%)",
        }}
      >
        {/* Decorative blobs */}
        <div className="absolute top-[-80px] right-[-80px] w-[340px] h-[340px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #00d2ff 0%, transparent 70%)" }} />
        <div className="absolute bottom-[-60px] left-[-60px] w-[280px] h-[280px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #6ee7b7 0%, transparent 70%)" }} />

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

        <div className="relative z-10 flex flex-col items-center px-14 max-w-xl w-full">

          {/* Svasth-HMS Logo + Name */}
          <div className="flex items-center gap-4 mb-3">
            <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl">
              <img src="/Svasth_logo.png" alt="Svasth HMS" className="w-14 h-14 object-contain" />
            </div>
            <div>
              <p className="text-emerald-300 text-xs font-bold uppercase tracking-[0.25em]">Powered by</p>
              <h1 className="text-white text-3xl font-black tracking-tight leading-tight">Svasth <span className="text-emerald-300">HMS</span></h1>
              <p className="text-white/50 text-xs mt-0.5">Hospital Management System</p>
            </div>
          </div>

          {/* Divider */}
          <div className="w-16 h-px bg-white/20 my-6" />

          {/* Hospital name */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/80 text-xs font-semibold uppercase tracking-widest">Live System</span>
            </div>
            <h2 className="text-white text-4xl font-black leading-tight mb-3">
              Cortex Hospital<br />

            </h2>
            <p className="text-white/60 text-sm leading-relaxed max-w-sm mx-auto">
              Your all-in-one clinical management platform — OPD, IPD, Billing, Prescriptions & more.
            </p>
          </div>

          {/* Animated feature card */}
          <div className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 transition-all duration-500 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                <feature.icon className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <p className="text-white font-bold text-sm mb-1">{feature.label}</p>
                <p className="text-white/60 text-xs leading-relaxed">{feature.desc}</p>
              </div>
            </div>
            {/* Dots */}
            <div className="flex gap-1.5 mt-4 justify-center">
              {FEATURES.map((_, i) => (
                <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === featureIdx ? "w-6 bg-emerald-400" : "w-1.5 bg-white/30"}`} />
              ))}
            </div>
          </div>

          {/* Stats strip */}
          <div className="flex items-center gap-8 mt-8">
            {[["12h", "Auto Logout"], ["2 Roles", "Access Control"], ["256-bit", "Secured"]].map(([val, label]) => (
              <div key={label} className="text-center">
                <p className="text-emerald-300 font-black text-lg">{val}</p>
                <p className="text-white/50 text-[11px] uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel (Login Form) ────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-slate-50">
        <div className="w-full max-w-md">

          {/* Mobile logo (shows only on small screens) */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <img src="/Svasth_logo.png" alt="Svasth HMS" className="w-10 h-10 object-contain" />
            <div>
              <p className="font-black text-slate-900 text-xl">Svasth <span className="text-emerald-600">HMS</span></p>
              <p className="text-xs text-slate-500">Cortex Hospital</p>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-3xl font-black text-slate-900 mb-1.5">Welcome back</h2>
            <p className="text-slate-500 text-sm">Sign in to your hospital portal account</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  placeholder="Enter your username"
                  className="w-full pl-10 pr-4 py-3.5 border border-slate-200 rounded-xl text-slate-900 font-semibold text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition placeholder:text-slate-400 placeholder:font-normal shadow-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-11 py-3.5 border border-slate-200 rounded-xl text-slate-900 font-semibold text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition placeholder:text-slate-400 placeholder:font-normal shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-black text-sm shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
              style={{
                background: loading
                  ? "#6b7280"
                  : "linear-gradient(135deg, #059669 0%, #0d9488 100%)",
              }}
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In to Portal
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>


          {/* Session info */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>Sessions expire automatically after <strong className="text-slate-600">12 hours</strong></span>
          </div>


          {/* Svasth branding */}
          <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <img src="/Svasth_logo.png" alt="Svasth HMS" className="w-4 h-4 object-contain" />
            <span>Powered by <span className="font-bold text-slate-600">Svasth-HMS</span> </span>
          </div>
        </div>
      </div>
    </div>
  );
}

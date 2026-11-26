"use client";

import React, { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { hospitalConfig, resolveDoctorFeeConfig } from "@/config/hospital";
import { getDoctorBadgeStyle } from "@/lib/doctorColors";
import {
  CheckCircle2,
  Clock,
  IndianRupee,
  RefreshCw,
  Save,
  Settings,
  Stethoscope,
} from "lucide-react";

interface DoctorFeeDraft {
  id?: Id<"doctors">;
  name: string;
  specialty: string;
  firstVisitFee: string;
  followupFee: string;
  followupValidityDays: string;
}

export default function AdminSettingsPage() {
  const doctors = useQuery(api.doctors.list, {});
  const updateFeeSettings = useMutation(api.doctors.updateFeeSettings);

  const [drafts, setDrafts] = useState<DoctorFeeDraft[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (doctors === undefined) return;

    const sourceList =
      doctors.length > 0
        ? doctors.map((doc) => ({
            id: doc._id,
            name: doc.name,
            specialty: (doc as any).specialty || doc.notes || "",
            first_visit_fee: doc.first_visit_fee,
            followup_fee: doc.followup_fee,
            followup_validity_days: doc.followup_validity_days,
          }))
        : hospitalConfig.doctors.map((doc) => ({
            id: undefined,
            name: doc.name,
            specialty: doc.designation || doc.specialty,
            first_visit_fee: doc.consultationFee.firstVisit,
            followup_fee: doc.consultationFee.followupVisit,
            followup_validity_days: doc.consultationFee.followupValidityDays,
          }));

    setDrafts(
      sourceList.map((doc) => {
        const resolved = resolveDoctorFeeConfig(doc.name, [doc]);
        return {
          id: doc.id,
          name: doc.name,
          specialty: doc.specialty,
          firstVisitFee: String(doc.first_visit_fee ?? resolved.firstVisit),
          followupFee: String(doc.followup_fee ?? resolved.followupVisit),
          followupValidityDays: String(
            doc.followup_validity_days ?? resolved.followupValidityDays
          ),
        };
      })
    );
  }, [doctors]);

  const handleDraftChange = (
    index: number,
    field: "firstVisitFee" | "followupFee" | "followupValidityDays",
    value: string
  ) => {
    const numericOnly = value.replace(/[^0-9]/g, "");
    setDrafts((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, [field]: numericOnly } : item
      )
    );
    setSavedKey(null);
    setErrorMsg(null);
  };

  const handleSaveDoctor = async (draft: DoctorFeeDraft) => {
    const firstVisit = Math.max(0, Number(draft.firstVisitFee) || 0);
    const followup = Math.max(0, Number(draft.followupFee) || 0);
    const validityDays = Math.max(1, Number(draft.followupValidityDays) || 1);

    setSavingKey(draft.name);
    setErrorMsg(null);
    try {
      await updateFeeSettings({
        id: draft.id,
        name: draft.name,
        first_visit_fee: firstVisit,
        followup_fee: followup,
        followup_validity_days: validityDays,
      });
      setSavedKey(draft.name);
      setTimeout(() => {
        setSavedKey((current) => (current === draft.name ? null : current));
      }, 3000);
    } catch (err) {
      console.error("Failed to save doctor fee settings:", err);
      setErrorMsg(`Failed to save fees for ${draft.name}. Please try again.`);
    } finally {
      setSavingKey(null);
    }
  };

  const handleSaveAll = async () => {
    if (drafts.length === 0) return;
    setSavingKey("__all__");
    setErrorMsg(null);
    try {
      for (const draft of drafts) {
        await updateFeeSettings({
          id: draft.id,
          name: draft.name,
          first_visit_fee: Math.max(0, Number(draft.firstVisitFee) || 0),
          followup_fee: Math.max(0, Number(draft.followupFee) || 0),
          followup_validity_days: Math.max(
            1,
            Number(draft.followupValidityDays) || 1
          ),
        });
      }
      setSavedKey("__all__");
      setTimeout(() => {
        setSavedKey((current) => (current === "__all__" ? null : current));
      }, 3000);
    } catch (err) {
      console.error("Failed to save all doctor fee settings:", err);
      setErrorMsg("Failed to save doctor fee settings. Please try again.");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <Settings className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                Doctor Fee & Consultation Settings
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Configure 1st-time visit fees, repeat/follow-up fees, and validity days. Changes sync live across Billing, OPD, Appointments, and Prescriptions.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={savingKey !== null || drafts.length === 0}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-semibold shadow-xs transition shrink-0"
          >
            {savingKey === "__all__" ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save All Fees</span>
          </button>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl px-4 py-3">
            {errorMsg}
          </div>
        )}

        {savedKey === "__all__" && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold rounded-xl px-4 py-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>All doctor fee settings saved and synced across the app.</span>
          </div>
        )}

        {/* Doctor Fee Cards */}
        {doctors === undefined ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[0, 1].map((idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-2xl p-6 animate-pulse space-y-4"
              >
                <div className="h-6 bg-slate-200 rounded w-1/2" />
                <div className="h-10 bg-slate-100 rounded" />
                <div className="h-10 bg-slate-100 rounded" />
                <div className="h-10 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {drafts.map((draft, index) => {
              const style = getDoctorBadgeStyle(draft.name);
              const isSaving = savingKey === draft.name;
              const isSaved = savedKey === draft.name;
              const firstNum = Math.max(0, Number(draft.firstVisitFee) || 0);
              const followNum = Math.max(0, Number(draft.followupFee) || 0);
              const daysNum = Math.max(
                1,
                Number(draft.followupValidityDays) || 1
              );

              return (
                <div
                  key={draft.id || draft.name}
                  className={`bg-white border-2 ${style.border} rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between gap-5`}
                >
                  <div className="space-y-4">
                    {/* Doctor Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl ${style.bg} border ${style.border} flex items-center justify-center shrink-0`}
                        >
                          <Stethoscope className={`w-5 h-5 ${style.text}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${style.dot}`}
                            />
                            <h2 className="text-lg font-bold text-slate-900">
                              {draft.name}
                            </h2>
                          </div>
                          {draft.specialty && (
                            <p className={`text-xs font-semibold ${style.text} mt-0.5`}>
                              {draft.specialty}
                            </p>
                          )}
                        </div>
                      </div>

                      {isSaved && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Saved
                        </span>
                      )}
                    </div>

                    {/* Fee Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                          1st Time Visit Fee (₹)
                        </label>
                        <div className="relative">
                          <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            inputMode="numeric"
                            value={draft.firstVisitFee}
                            onChange={(e) =>
                              handleDraftChange(
                                index,
                                "firstVisitFee",
                                e.target.value
                              )
                            }
                            placeholder="400"
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                          Repeat / Follow-up Fee (₹)
                        </label>
                        <div className="relative">
                          <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            inputMode="numeric"
                            value={draft.followupFee}
                            onChange={(e) =>
                              handleDraftChange(
                                index,
                                "followupFee",
                                e.target.value
                              )
                            }
                            placeholder="300"
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                        Repeat Validity Window (Days)
                      </label>
                      <div className="relative">
                        <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          inputMode="numeric"
                          value={draft.followupValidityDays}
                          onChange={(e) =>
                            handleDraftChange(
                              index,
                              "followupValidityDays",
                              e.target.value
                            )
                          }
                          placeholder="30"
                          className="w-full pl-9 pr-14 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                          days
                        </span>
                      </div>
                    </div>

                    {/* Live Rule Summary */}
                    <div
                      className={`rounded-xl px-3.5 py-2.5 ${style.bg} border ${style.border} text-xs font-medium text-slate-700`}
                    >
                      New patient: <strong className="text-slate-900">₹{firstNum}</strong>{" "}
                      • Revisit within{" "}
                      <strong className="text-slate-900">{daysNum} days</strong>:{" "}
                      <strong className="text-slate-900">₹{followNum}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSaveDoctor(draft)}
                    disabled={savingKey !== null}
                    className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50 ${style.buttonSelected}`}
                  >
                    {isSaving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>Save {draft.name} Fees</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

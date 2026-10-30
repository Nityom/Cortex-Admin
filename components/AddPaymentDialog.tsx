"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { paymentTransactionService, CreatePaymentData } from "@/services/payment-transactions";
import { updateBill } from "@/services/bills";
import { CreditCard, CheckCircle2, AlertCircle, Banknote, Sparkles } from "lucide-react";

interface AddPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billId: string;
  patientId: string;
  balanceAmount: number;
  totalAmount?: number;
  paidAmount?: number;
  billNumber?: string;
  patientName?: string;
  onPaymentAdded: () => void;
}

export default function AddPaymentDialog({
  open,
  onOpenChange,
  billId,
  patientId,
  balanceAmount,
  totalAmount,
  paidAmount,
  billNumber,
  patientName,
  onPaymentAdded,
}: AddPaymentDialogProps) {
  const safeBalanceAmount = Number(balanceAmount) || 0;
  const [formData, setFormData] = useState<CreatePaymentData>({
    bill_id: billId,
    patient_id: patientId,
    amount: safeBalanceAmount,
    payment_method: "Cash",
    payment_date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setFormData({
        bill_id: billId,
        patient_id: patientId,
        amount: safeBalanceAmount,
        payment_method: "Cash",
        payment_date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      setError("");
    }
  }, [open, billId, patientId, safeBalanceAmount]);

  const remainingAfterPayment = Math.max(0, safeBalanceAmount - (formData.amount || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.amount || formData.amount <= 0) {
      setError("Payment amount must be greater than zero");
      return;
    }

    if (formData.amount > safeBalanceAmount) {
      setError(`Payment amount cannot exceed balance amount (₹${safeBalanceAmount.toLocaleString("en-IN")})`);
      return;
    }

    try {
      setLoading(true);
      
      // 1. Record the transaction
      await paymentTransactionService.create({
        ...formData,
        bill_id: billId,
        patient_id: patientId,
      });

      // 2. Also ensure bill is updated with new balance and payment_status in Convex
      try {
        const curPaid = (paidAmount || 0) + formData.amount;
        const curTotal = totalAmount || (curPaid + remainingAfterPayment);
        const curBalance = Math.max(0, curTotal - curPaid);
        const curStatus = curPaid >= curTotal ? "PAID" : "PARTIAL";

        await updateBill(billId, {
          paid_amount: curPaid,
          balance_amount: curBalance,
          payment_status: curStatus,
        });
      } catch (billUpdateErr) {
        console.warn("Bill update sync note:", billUpdateErr);
      }

      onPaymentAdded();
      onOpenChange(false);
    } catch (err: unknown) {
      console.error("Error adding payment:", err);
      if (err instanceof Error) {
        setError(err.message || "Failed to add payment");
      } else {
        setError("Failed to add payment");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-teal-700 to-teal-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 text-white flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <DialogTitle className="text-base font-extrabold text-white">Record Installment Payment</DialogTitle>
              <p className="text-xs text-teal-100 font-medium mt-0.5">
                {billNumber || "Bill"} {patientName ? `• ${patientName}` : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Balance Overview Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex justify-between items-center text-xs">
            <div>
              <span className="text-slate-400 uppercase text-[10px] font-bold block">Outstanding Due</span>
              <span className="text-lg font-extrabold text-rose-600">₹{safeBalanceAmount.toLocaleString("en-IN")}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 uppercase text-[10px] font-bold block">After This Payment</span>
              <span className={`text-lg font-extrabold ${remainingAfterPayment === 0 ? "text-emerald-600" : "text-amber-600"}`}>
                ₹{remainingAfterPayment.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Payment Amount */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="amount" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Installment Amount (₹) <span className="text-rose-500">*</span>
              </Label>
              <span className="text-[11px] text-teal-700 font-bold">Max: ₹{safeBalanceAmount.toLocaleString("en-IN")}</span>
            </div>
            <Input
              id="amount"
              type="number"
              step="1"
              min="1"
              max={safeBalanceAmount}
              value={formData.amount || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  amount: Math.min(Math.max(0, parseFloat(e.target.value) || 0), safeBalanceAmount),
                })
              }
              placeholder="Enter amount"
              className="text-base font-bold text-slate-900 border-slate-300 rounded-xl h-11 focus:ring-teal-500"
              required
            />

            {/* Quick Amount Presets */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, amount: safeBalanceAmount })}
                className="flex-1 py-1.5 px-2 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold rounded-lg border border-teal-200 transition"
              >
                Full Due (₹{safeBalanceAmount})
              </button>
              {safeBalanceAmount > 200 && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, amount: Math.round(safeBalanceAmount / 2) })}
                  className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition"
                >
                  50% (₹{Math.round(safeBalanceAmount / 2)})
                </button>
              )}
            </div>
          </div>

          {/* Payment Method & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="payment_method" className="text-xs font-bold text-slate-700">
                Payment Method
              </Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
              >
                <SelectTrigger id="payment_method" className="rounded-xl border-slate-300 text-xs font-semibold h-10">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Cash">Cash (रोख)</SelectItem>
                  <SelectItem value="UPI">UPI / GPay / PhonePe</SelectItem>
                  <SelectItem value="Card">Debit / Credit Card</SelectItem>
                  <SelectItem value="Net Banking">Net Banking</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payment_date" className="text-xs font-bold text-slate-700">
                Payment Date
              </Label>
              <Input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                className="rounded-xl border-slate-300 text-xs font-semibold h-10"
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-bold text-slate-700">
              Receipt / Installment Notes (Optional)
            </Label>
            <Input
              id="notes"
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. 2nd Installment, UPI ref #..."
              className="rounded-xl border-slate-300 text-xs h-9"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="rounded-xl text-xs font-bold px-4 border-slate-200 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.amount || formData.amount <= 0}
              className="rounded-xl text-xs font-bold px-5 bg-teal-700 hover:bg-teal-800 text-white shadow-xs cursor-pointer disabled:opacity-50"
            >
              {loading ? "Recording..." : `Confirm Payment: ₹${(formData.amount || 0).toLocaleString("en-IN")}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

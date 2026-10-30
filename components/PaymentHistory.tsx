"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { paymentTransactionService, PaymentTransaction } from "@/services/payment-transactions";
import { Plus, Trash2, Receipt, Calendar, CreditCard } from "lucide-react";
import { useIsAdmin } from "@/hooks/use-is-admin";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PaymentHistoryProps {
  billId: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  onPaymentAdded?: () => void;
  onAddPaymentClick?: () => void;
}

export default function PaymentHistory({
  billId,
  totalAmount,
  paidAmount,
  balanceAmount,
  onPaymentAdded,
  onAddPaymentClick,
}: PaymentHistoryProps) {
  const safeBalanceAmount = Number(balanceAmount) || 0;
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const { isAdmin } = useIsAdmin();

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const data = await paymentTransactionService.getByBillId(billId);
      setPayments(data);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (billId) {
      fetchPayments();
    }
  }, [billId]);

  const handleDelete = async () => {
    if (!paymentToDelete) return;

    try {
      await paymentTransactionService.delete(paymentToDelete);
      await fetchPayments();
      if (onPaymentAdded) {
        onPaymentAdded();
      }
    } catch (error) {
      console.error("Error deleting payment:", error);
      alert("Failed to delete payment");
    } finally {
      setDeleteDialogOpen(false);
      setPaymentToDelete(null);
    }
  };

  const confirmDelete = (paymentId: string) => {
    setPaymentToDelete(paymentId);
    setDeleteDialogOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <>
      <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
        {/* Header Strip */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-teal-700" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Installment Ledger ({payments.length})
            </span>
          </div>
          {safeBalanceAmount > 0 && onAddPaymentClick && (
            <Button
              onClick={onAddPaymentClick}
              size="sm"
              className="h-7 text-xs bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg px-2.5 shadow-2xs cursor-pointer flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Record Installment</span>
            </Button>
          )}
        </div>

        {/* Ledger Breakdown Cards */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs bg-white rounded-lg p-2.5 border border-slate-200/60 shadow-2xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Bill</span>
            <span className="font-bold text-slate-800">{formatCurrency(totalAmount)}</span>
          </div>
          <div className="border-x border-slate-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Paid</span>
            <span className="font-extrabold text-emerald-700">{formatCurrency(paidAmount)}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Remaining Due</span>
            <span className={`font-extrabold ${safeBalanceAmount > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {formatCurrency(safeBalanceAmount)}
            </span>
          </div>
        </div>

        {/* Transactions List */}
        <div className="space-y-2">
          {loading ? (
            <p className="text-center text-xs text-slate-400 py-3">Loading installment records...</p>
          ) : payments.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-3 italic">
              No partial installment records logged for this bill.
            </p>
          ) : (
            payments.map((payment, idx) => (
              <div
                key={payment.id || idx}
                className="flex items-center justify-between bg-white border border-slate-200/70 rounded-xl p-3 hover:border-teal-300 transition shadow-2xs"
              >
                <div className="flex-1 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                    #{payments.length - idx}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-emerald-800 text-sm">
                        {formatCurrency(Number(payment.amount))}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                        {payment.payment_method || "Cash"}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{formatDate(payment.payment_date)}</span>
                      {payment.notes && <span className="text-slate-400">• {payment.notes}</span>}
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => confirmDelete(payment.id)}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                    title="Delete Payment Entry"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Delete Payment Record?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will remove this installment entry from the ledger.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

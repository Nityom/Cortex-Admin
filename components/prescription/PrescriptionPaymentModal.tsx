'use client';

import React from 'react';

interface PaymentDetails {
  amountPaid: number;
  discountPercent: number;
  paymentMethod: string;
}

interface PrescriptionPaymentModalProps {
  showPaymentModal: boolean;
  setShowPaymentModal: (show: boolean) => void;
  currentBill: any;
  paymentDetails: PaymentDetails;
  setPaymentDetails: React.Dispatch<React.SetStateAction<PaymentDetails>>;
  handlePrintBill: () => void;
}

export default function PrescriptionPaymentModal({
  showPaymentModal,
  setShowPaymentModal,
  currentBill,
  paymentDetails,
  setPaymentDetails,
  handlePrintBill,
}: PrescriptionPaymentModalProps) {
  if (!showPaymentModal || !currentBill) return null;

  const origTotal = Number(currentBill.total_amount);
  const discAmt = Math.round((origTotal * paymentDetails.discountPercent) / 100);
  const payable = Math.round(origTotal - discAmt);
  const balance = Math.max(payable - Math.round(paymentDetails.amountPaid), 0);
  const status =
    paymentDetails.amountPaid === 0
      ? 'PENDING'
      : paymentDetails.amountPaid >= payable
      ? 'PAID'
      : 'PARTIAL';
  const cls =
    status === 'PENDING'
      ? 'bg-red-100 text-red-700'
      : status === 'PAID'
      ? 'bg-green-100 text-green-700'
      : 'bg-yellow-100 text-yellow-700';

  return (
    <div className="fixed inset-0 backdrop-blur-xs bg-white/10 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-w-md w-full">
        <h3 className="text-xl font-bold mb-4 text-gray-800">Payment Details</h3>

        <div className="mb-4 text-xs">
          <p className="text-gray-600 mb-1">
            Total Amount:{' '}
            <span className="font-bold text-gray-900">₹{origTotal.toLocaleString('en-IN')}</span>
          </p>
          {paymentDetails.discountPercent > 0 && (
            <p className="text-gray-600 mb-1">
              Discount ({paymentDetails.discountPercent}%):{' '}
              <span className="font-bold text-green-600">- ₹{discAmt.toLocaleString('en-IN')}</span>
            </p>
          )}
          <p className="text-gray-600 mb-1">
            Payable:{' '}
            <span className="font-bold text-gray-900">₹{payable.toLocaleString('en-IN')}</span>
          </p>
          <p className="text-gray-600 mb-4">
            Balance Due:{' '}
            <span className="font-bold text-red-600">₹{balance.toLocaleString('en-IN')}</span>
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Discount (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            value={paymentDetails.discountPercent}
            onChange={(e) =>
              setPaymentDetails((prev) => ({
                ...prev,
                discountPercent: Math.min(Math.max(parseFloat(e.target.value) || 0, 0), 100),
              }))
            }
            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="0"
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Amount Paid (₹)
          </label>
          <input
            type="number"
            min="0"
            max={payable}
            step="1"
            value={paymentDetails.amountPaid}
            onChange={(e) => {
              const val = Math.round(Math.min(Math.max(parseFloat(e.target.value) || 0, 0), payable));
              setPaymentDetails((prev) => ({ ...prev, amountPaid: val }));
            }}
            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="mb-6">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Method</label>
          <select
            value={paymentDetails.paymentMethod}
            onChange={(e) =>
              setPaymentDetails((prev) => ({ ...prev, paymentMethod: e.target.value }))
            }
            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white cursor-pointer"
          >
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="UPI">UPI</option>
            <option value="Net Banking">Net Banking</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg text-xs">
          <p className="font-medium text-gray-700">
            Payment Status:
            <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${cls}`}>{status}</span>
          </p>
        </div>

        <div className="flex gap-3 text-xs">
          <button
            type="button"
            onClick={() => setShowPaymentModal(false)}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePrintBill}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold shadow-xs cursor-pointer"
          >
            Print Bill
          </button>
        </div>
      </div>
    </div>
  );
}


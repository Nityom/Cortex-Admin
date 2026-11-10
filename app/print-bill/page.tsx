'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PrintableBill from '@/components/PrintableBill';
import { filterNonMedicineBillItems } from '@/services/bills';
import { formatDate as formatDateUtil } from '@/lib/utils';
import { ConvexHttpClient } from 'convex/browser';
// @ts-ignore
import { api } from '@/convex/_generated/api';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error('NEXT_PUBLIC_CONVEX_URL is not configured.');
}
const convex = new ConvexHttpClient(convexUrl);

interface BillItem {
  id?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
  total: number;
  itemType?: 'medicine' | 'procedure' | 'consultation' | 'other';
  date?: string;
}

interface BillData {
  billNumber: string;
  billDate: string;
  patientName: string;
  patientPhone?: string;
  patientAge?: string;
  patientSex?: string;
  items: BillItem[];
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  balance: number;
  referenceNumber?: string;
  prescriptionId?: string;
}

function PrintBillContent() {
  const searchParams = useSearchParams();
  const billId = searchParams.get('billId');
  const signatureParam = searchParams.get('signature') || 'sign.png';
  const doctorNameParam = searchParams.get('doctorName') || 'Dr. Vipeen Raut';
  const includeSigParam = searchParams.get('includeSignature');
  const includeSignature = includeSigParam !== 'false';
  const [billData, setBillData] = useState<BillData | null>(null);
  const [resolvedSignature, setResolvedSignature] = useState<string>(signatureParam);
  const [resolvedDoctorName, setResolvedDoctorName] = useState<string>(doctorNameParam);
  const [paymentTransactions, setPaymentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBillData = async () => {
      if (!billId) {
        setError('No bill ID provided');
        setLoading(false);
        return;
      }

      try {
        const bill = await convex.query(api.bills.getById, { id: billId as any });

        if (!bill) {
          throw new Error('Bill not found');
        }

        // Parse items safely whether Array or JSON string
        let rawItems = bill.items;
        if (typeof rawItems === 'string') {
          try {
            rawItems = JSON.parse(rawItems);
          } catch {
            rawItems = [];
          }
        }

        // If linked to prescription, exclude prescription medicines
        const isPrescriptionBill = Boolean(
          bill.prescription_id && !['DIRECT_BILL', 'IPD_DIRECT'].includes(bill.prescription_id)
        );
        const filteredItems = isPrescriptionBill && Array.isArray(rawItems)
          ? filterNonMedicineBillItems(rawItems)
          : rawItems;

        const items = Array.isArray(filteredItems)
          ? filteredItems.map((item: any) => ({
              id: item.id,
              description: item.description || item.name || 'Service',
              quantity: parseFloat(item.quantity) || 1,
              unitPrice: parseFloat(item.unit_price ?? item.unitPrice ?? item.price) || 0,
              unit: item.unit || (item.item_type === 'medicine' || item.itemType === 'medicine' ? 'PCS' : 'EACH'),
              total: parseFloat(item.total) || ((parseFloat(item.quantity) || 1) * (parseFloat(item.unit_price ?? item.unitPrice ?? item.price) || 0)),
              itemType: item.itemType || item.item_type || 'other',
              date: item.date,
            }))
          : [];

        // If medicines were stripped, adjust totals accordingly
        let total = bill.total_amount || 0;
        const discount = (bill as any).discount_amount || 0;
        if (isPrescriptionBill && Array.isArray(rawItems) && filteredItems.length !== rawItems.length) {
          const nonMedSubtotal = items.reduce((sum: number, it: any) => sum + (it.total || 0), 0);
          total = Math.max(0, nonMedSubtotal - discount);
        }
        const amountPaid = bill.paid_amount || 0;
        const balance = Math.max(0, total - amountPaid);

        const formatDate = (ts: number | string | undefined) => {
          if (!ts) return formatDateUtil(new Date());
          return formatDateUtil(ts);
        };

        setBillData({
          billNumber: (bill as any).bill_number || bill._id,
          billDate: formatDate(bill._creationTime),
          patientName: (bill as any).patient_name || searchParams.get('patientName') || 'N/A',
          patientPhone: (bill as any).phone_number || searchParams.get('patientPhone') || '',
          patientAge: (bill as any).patient_age?.toString() || searchParams.get('patientAge') || '',
          patientSex: (bill as any).patient_sex || searchParams.get('patientSex') || '',
          items,
          subtotal: total + discount,
          discount,
          total,
          amountPaid,
          balance,
          referenceNumber: (bill as any).reference_number || '',
          prescriptionId: (bill as any).prescription_id || '',
        });

        // Resolve doctor name & signature
        const explicitSig = searchParams.get('signature');
        const explicitDoc = searchParams.get('doctorName');
        let docName = explicitDoc || doctorNameParam;
        let sigUrl = explicitSig || signatureParam;

        if (bill.prescription_id) {
          try {
            const rx = await convex.query(api.prescriptions.getById, { id: bill.prescription_id as any });
            const rxDocName = rx?.doctor_name;
            if (rxDocName) {
              if (!explicitDoc) docName = rxDocName;
              if (!explicitSig || explicitSig === 'sign.png') {
                const allDocs = await convex.query(api.doctors.list, {});
                const match = (allDocs || []).find((d: any) => d.name.toLowerCase() === rxDocName.toLowerCase());
                if (match?.signature_url) {
                  sigUrl = match.signature_url;
                } else if (/shillpa|shilpa|anjali|gyn/i.test(rxDocName)) {
                  sigUrl = 'sign1.png';
                }
              }
            }
          } catch (e) {
            console.error('Error resolving prescription doctor for bill:', e);
          }
        } else if (!explicitSig || explicitSig === 'sign.png') {
          try {
            const allDocs = await convex.query(api.doctors.list, {});
            const match = (allDocs || []).find((d: any) => d.name.toLowerCase() === docName.toLowerCase());
            if (match?.signature_url) {
              sigUrl = match.signature_url;
            } else if (/shillpa|shilpa|anjali|gyn/i.test(docName)) {
              sigUrl = 'sign1.png';
            }
          } catch {
            if (/shillpa|shilpa|anjali|gyn/i.test(docName)) {
              sigUrl = 'sign1.png';
            }
          }
        }

        setResolvedDoctorName(docName);
        setResolvedSignature(sigUrl);

        // Fetch payment transactions for this bill
        try {
          const txns = await convex.query(api.payment_transactions.listByBill, { bill_id: billId as string });
          if (Array.isArray(txns)) {
            setPaymentTransactions(txns.map((t: any) => ({
              amount: t.amount,
              payment_date: t.payment_date,
              payment_method: t.payment_method,
            })));
          }
        } catch {}
      } catch (err) {
        console.error('Error fetching bill:', err);
        setError(err instanceof Error ? err.message : 'Failed to load bill data');
      } finally {
        setLoading(false);
      }
    };

    fetchBillData();
  }, [billId, signatureParam, doctorNameParam, searchParams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bill...</p>
        </div>
      </div>
    );
  }

  if (error || !billData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600">{error || 'Bill not found'}</p>
        </div>
      </div>
    );
  }

  const pageSizeParam = (searchParams.get('pageSize') as 'A6' | 'A7' | 'A4') || undefined;
  const isIpdParam = searchParams.get('type') === 'ipd' || searchParams.get('isIpd') === 'true' || billData.prescriptionId === 'IPD_DIRECT';
  const ipdNumberParam = searchParams.get('ipdNumber') || '';
  const admitDateParam = searchParams.get('admitDate') || '';
  const dischargeDateParam = searchParams.get('dischDate') || searchParams.get('dischargeDate') || '';
  const addressParam = searchParams.get('address') || '';
  const wardNameParam = searchParams.get('wardName') || '';
  const paymentCategoryParam = searchParams.get('paymentCategory') || 'General';
  const depositParam = searchParams.get('deposit') ? parseFloat(searchParams.get('deposit')!) : undefined;

  return (
    <PrintableBill
      {...billData}
      signature={resolvedSignature}
      doctorName={resolvedDoctorName}
      paymentTransactions={paymentTransactions}
      includeSignature={includeSignature}
      defaultPageSize={isIpdParam ? 'A4' : (pageSizeParam || 'A6')}
      isIpdBill={isIpdParam}
      ipdNumber={ipdNumberParam}
      admitDate={admitDateParam}
      dischargeDate={dischargeDateParam}
      patientAddress={addressParam}
      wardName={wardNameParam}
      paymentCategory={paymentCategoryParam}
      depositAmount={depositParam !== undefined ? depositParam : billData.amountPaid}
    />
  );
}

export default function PrintBillPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <PrintBillContent />
    </Suspense>
  );
}

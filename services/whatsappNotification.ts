/**
 * WhatsApp Notification Service for Cortex Hospital Admin
 * Sends instant prescription links & confirmations to patient WhatsApp numbers.
 */

export interface SendPrescriptionWhatsAppParams {
  phoneNumber: string;
  patientName: string;
  prescriptionId: string;
  doctorName?: string;
  date?: string;
  diagnosis?: string;
}

export async function sendPrescriptionOnWhatsApp(
  params: SendPrescriptionWhatsAppParams
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!params.phoneNumber || !params.prescriptionId) {
      return { success: false, error: 'Phone number and prescriptionId are required' };
    }

    const res = await fetch('/api/whatsapp/send-prescription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    return { success: !!data.success, error: data.error };
  } catch (err: any) {
    console.error('Failed to notify patient via WhatsApp:', err);
    return { success: false, error: err.message || 'Network error' };
  }
}


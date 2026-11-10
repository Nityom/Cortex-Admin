import { NextRequest, NextResponse } from 'next/server';

const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || 'v21.0';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      phoneNumber,
      patientName,
      prescriptionId,
      doctorName,
      date,
      diagnosis,
    } = body;

    if (!phoneNumber || !prescriptionId) {
      return NextResponse.json(
        { success: false, error: 'Phone number and prescription ID are required' },
        { status: 400 }
      );
    }

    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    // Normalize phone number (ensure country code 91)
    let cleaned = String(phoneNumber).replace(/\D/g, '');
    if (cleaned.length === 10) {
      cleaned = `91${cleaned}`;
    }

    // Format date as DD/MM/YY
    let displayDate = date || '';
    try {
      const match = String(date).match(/^(20\d{2})-(\d{1,2})-(\d{1,2})/);
      if (match) {
        displayDate = `${match[3].padStart(2, '0')}/${match[2].padStart(2, '0')}/${match[1].slice(-2)}`;
      }
    } catch {}

    const host = req.headers.get('host') || 'cortexhospital.com';
    const proto = host.includes('localhost') ? 'http' : 'https';
    const prescriptionUrl = `${proto}://${host}/print-prescription?id=${encodeURIComponent(prescriptionId)}`;

    const message = `🏥 *CORTEX HOSPITAL, WARDHA*
Hello *${patientName || 'Patient'}* 👋

Your digital prescription from *${doctorName || 'Dr. Vipeen Raut'}* has been generated.

📅 *Date:* ${displayDate}
🩺 *Diagnosis:* ${diagnosis || 'Consultation'}

🔗 *View / Print Your Prescription:*
${prescriptionUrl}

_Please take your medications as directed. For any help, reply to this WhatsApp chat or call reception at 07152-255795._ ❤️`;

    if (!token || !phoneNumberId) {
      console.log(`[Cortex Admin WhatsApp Mock] To: +${cleaned}\nMessage:\n${message}`);
      return NextResponse.json({
        success: true,
        simulated: true,
        message: 'WhatsApp credentials not configured; logged message.',
      });
    }

    const endpoint = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleaned,
        type: 'text',
        text: {
          preview_url: true,
          body: message,
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[Cortex Admin WhatsApp Error]:', data);
      return NextResponse.json(
        { success: false, error: data?.error?.message || 'Failed to send WhatsApp message' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: data?.messages?.[0]?.id,
    });
  } catch (err: any) {
    console.error('[Cortex Admin WhatsApp Notification Exception]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal error' },
      { status: 500 }
    );
  }
}

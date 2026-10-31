import { NextRequest, NextResponse } from "next/server";
import { issuePasswordReset } from "@/lib/server/auth-flow";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body?.email || "").trim();

    if (!email) {
      return NextResponse.json({ message: "Email is required." }, { status: 400 });
    }

    await issuePasswordReset(email);

    return NextResponse.json(
      {
        success: true,
        message: "If the email exists, a reset link has been sent.",
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process password reset request.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

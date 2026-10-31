import { NextRequest, NextResponse } from "next/server";
import { getUserForLogin, issueLoginOtp } from "@/lib/server/auth-flow";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body?.email || "").trim();
    const password = String(body?.password || "");

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required." }, { status: 400 });
    }

    const user = await getUserForLogin(email, password);
    if (!user) {
      return NextResponse.json({ message: "Invalid credentials." }, { status: 401 });
    }

    const otpResult = await issueLoginOtp(user);
    return NextResponse.json({ ...otpResult, message: "A new OTP has been sent." }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to resend OTP.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

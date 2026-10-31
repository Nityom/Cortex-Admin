import { NextRequest, NextResponse } from "next/server";
import { convex, convexAuthFns, hashPassword, hashValue } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = String(body?.token || "").trim();
    const newPassword = String(body?.newPassword || "");

    if (!token || !newPassword) {
      return NextResponse.json({ message: "Token and new password are required." }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ message: "Password must be at least 8 characters long." }, { status: 400 });
    }

    const tokenPayload = await convex.query(convexAuthFns.getPasswordResetByHash, {
      token_hash: hashValue(token),
    }) as {
      token: {
        _id: string;
        user_id: string;
      };
      user: {
        _id: string;
      } | null;
    } | null;

    if (!tokenPayload || !tokenPayload.user) {
      return NextResponse.json({ message: "Invalid or expired reset link." }, { status: 401 });
    }

    const passwordHash = await hashPassword(newPassword);

    await convex.mutation(convexAuthFns.updateUserPassword, {
      userId: tokenPayload.user._id as any,
      password_hash: passwordHash,
    });

    await convex.mutation(convexAuthFns.consumePasswordResetToken, {
      tokenId: tokenPayload.token._id as any,
    });

    await convex.mutation(convexAuthFns.revokeAllUserSessions, {
      userId: tokenPayload.user._id as any,
    });

    return NextResponse.json({ success: true, message: "Password has been reset." }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reset password.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

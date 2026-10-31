import { NextRequest, NextResponse } from "next/server";
import { convex, convexAuthFns, hashValue } from "@/lib/server/auth";

export const runtime = "nodejs";

const SESSION_COOKIE_NAME = "ksd_auth_session";

export async function POST(request: NextRequest) {
  try {
    const rawSessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (rawSessionToken) {
      await convex.mutation(convexAuthFns.revokeAuthSession, {
        session_hash: hashValue(rawSessionToken),
      });
    }

    const response = NextResponse.json({ success: true }, { status: 200 });
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to logout.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

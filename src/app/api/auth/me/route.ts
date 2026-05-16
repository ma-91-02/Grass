import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { unauthorizedError } from "@/lib/api-response";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorizedError();
  return NextResponse.json({ success: true, data: user });
}

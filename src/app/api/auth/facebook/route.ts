import { NextResponse } from "next/server";
import { getOAuthURL } from "@/lib/facebook";

export async function GET() {
  const url = getOAuthURL();
  return NextResponse.redirect(url);
}

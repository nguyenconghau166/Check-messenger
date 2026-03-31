import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getPageAccessTokens,
} from "@/lib/facebook";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/?error=oauth_denied`
    );
  }

  try {
    // Exchange code for short-lived token
    const shortToken = await exchangeCodeForToken(code);

    // Exchange for long-lived token
    const longToken = await getLongLivedToken(shortToken);

    // Get all pages managed by this user
    const pages = await getPageAccessTokens(longToken);

    // Save each page to Supabase
    for (const page of pages) {
      await supabaseAdmin.from("pages").upsert(
        {
          facebook_page_id: page.id,
          page_name: page.name,
          access_token: page.access_token,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "facebook_page_id" }
      );
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/?success=connected&pages=${pages.length}`
    );
  } catch (err) {
    console.error("Facebook OAuth error:", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/?error=oauth_failed`
    );
  }
}

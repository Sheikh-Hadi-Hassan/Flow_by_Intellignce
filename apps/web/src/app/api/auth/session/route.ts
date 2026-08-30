import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "../../../../lib/auth/supabase-server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error || !session?.access_token) {
      return NextResponse.json({ session: null }, { status: 401 });
    }
    return NextResponse.json({
      session: {
        access_token: session.access_token,
        expires_at: session.expires_at,
      },
    });
  } catch {
    return NextResponse.json({ session: null }, { status: 401 });
  }
}

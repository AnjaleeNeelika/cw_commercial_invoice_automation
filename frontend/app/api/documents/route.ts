import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

const tableName = "cw_commercial_invoice_automation_invoices";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from(tableName)
      .select("*");

    if (error) {
      return NextResponse.json(
        { error: `Unable to fetch uploaded documents: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      documents: data ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown document fetch error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

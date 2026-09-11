import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { document_uploaded_path, extracted_data } = body ?? {};

    if (!document_uploaded_path || extracted_data === undefined) {
      return NextResponse.json(
        { error: "Missing document path or extracted data." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("cw_commercial_invoice_automation_invoices")
      .update({ extracted_data, status: "Extracted" })
      .eq("document_uploaded_path", document_uploaded_path)
      .select("document_name")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: `Unable to confirm extracted data: ${error.message}` },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "No database row found for this document." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Extracted data confirmed successfully.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown confirmation error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

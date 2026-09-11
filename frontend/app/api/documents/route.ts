import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

const tableName = "cw_commercial_invoice_automation_invoices";

export async function GET(request: Request) {
  try {
    const documentId = new URL(request.url).searchParams.get("id");

    if (documentId !== null && !/^\d+$/.test(documentId)) {
      return NextResponse.json(
        { error: "Document id must be a positive integer." },
        { status: 400 },
      );
    }

    const query = supabaseAdmin.from(tableName).select("*");
    const { data, error } = documentId
      ? await query.eq("id", Number(documentId)).maybeSingle()
      : await query.order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: `Unable to fetch uploaded documents: ${error.message}` },
        { status: 500 }
      );
    }

    if (documentId !== null) {
      if (!data) {
        return NextResponse.json(
          { error: "Document not found." },
          { status: 404 },
        );
      }

      return NextResponse.json({ success: true, document: data });
    }

    return NextResponse.json({ success: true, documents: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown document fetch error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

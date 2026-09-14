import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { supabaseAdmin } from "@/lib/supabase";

const getDocumentType = (documentUploadedPath: string) => {
  const lowerPath = documentUploadedPath.toLowerCase();
  if (lowerPath.endsWith(".pdf")) return "PDF";
  if (lowerPath.endsWith(".xls") || lowerPath.endsWith(".xlsx") || lowerPath.endsWith(".csv")) return "Spreadsheet";
  if (lowerPath.endsWith(".png") || lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) return "Image";
  return "Document";
};

const getExcelSheetNames = async (fileUrl: string) => {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      return [];
    }

    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    return workbook.SheetNames ?? [];
  } catch {
    return [];
  }
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { document_name, document_uploaded_path } = body ?? {};

    if (!document_name || !document_uploaded_path) {
      return NextResponse.json(
        { error: "Missing document name or uploaded path." },
        { status: 400 }
      );
    }

    const webhookUrl =
      process.env.N8N_WEBHOOK_URL ?? process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;

    if (!webhookUrl) {
      return NextResponse.json(
        { error: "N8N webhook URL is not configured." },
        { status: 500 }
      );
    }

    const bucketName = "cw_commercial_invocie_automation";
    const objectPath = document_uploaded_path.replace(`${bucketName}/`, "");

    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from(bucketName)
      .createSignedUrl(objectPath, 60 * 60 * 24);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return NextResponse.json(
        { error: `Unable to generate a signed URL for ${document_name}: ${signedUrlError?.message ?? "Unknown error"}` },
        { status: 500 }
      );
    }

    const documentType = getDocumentType(document_uploaded_path);
    const sheetNames =
      documentType === "Spreadsheet" ? await getExcelSheetNames(signedUrlData.signedUrl) : [];

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.N8N_WEBHOOK_SECRET
          ? { Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}` }
          : {}),
      },
      body: JSON.stringify({
        document_name,
        document_uploaded_path,
        file_url: signedUrlData.signedUrl,
        file_type: documentType,
        document_type: documentType,
        sheet_names: sheetNames,
      }),
    });

    const rawResponse = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        { error: `n8n workflow failed: ${rawResponse || response.statusText}` },
        { status: response.status || 500 }
      );
    }

    let extractedData: unknown = rawResponse;

    try {
      extractedData = JSON.parse(rawResponse);
    } catch {
      // Keep raw text if not JSON.
    }

    const { data: updatedInvoice, error: updateError } = await supabaseAdmin
      .from("cw_commercial_invoice_automation_invoices")
      .update({ extracted_data: extractedData, status: "Extracted" })
      .eq("document_uploaded_path", document_uploaded_path)
      .select("document_name")
      .maybeSingle();

    if (updateError) {
      return NextResponse.json(
        {
          error: `n8n succeeded but the extracted data could not be saved: ${updateError.message}`,
        },
        { status: 500 }
      );
    }

    if (!updatedInvoice) {
      return NextResponse.json(
        { error: `Extraction succeeded, but no database row was found for ${document_name}.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      extracted_data: extractedData,
      message: "Document extracted successfully.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown extraction error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

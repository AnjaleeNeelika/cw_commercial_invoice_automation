import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

const getDocumentType = (file: File) => {
  const name = file.name.toLowerCase();

  if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    return "pdf";
  }

  if (
    file.type === "application/vnd.ms-excel" ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "text/csv" ||
    name.endsWith(".xls") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".csv")
  ) {
    return "spreadsheet";
  }

  if (
    file.type === "image/png" || name.endsWith(".png") ||
    file.type === "image/jpeg" || name.endsWith(".jpeg") || name.endsWith(".jpg")
  ) {
    return "image";
  }

  return null;
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files");

    if (!files.length) {
      return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
    }

    const uploadedDocs: Array<{ document_name: string; document_uploaded_path: string }> = [];

    for (const rawFile of files) {
      if (!(rawFile instanceof File)) {
        continue;
      }

      const documentType = getDocumentType(rawFile);

      if (!documentType) {
        return NextResponse.json(
          {
            error: `Unsupported document type for ${rawFile.name}. Please upload a PDF or Excel file.`,
          },
          { status: 400 }
        );
      }

      const fileName = rawFile.name.replace(/\s+/g, "_");
      const sanitizedName = `${Date.now()}-${fileName}`;
      const objectPath = `invoices/${sanitizedName}`;
      const bucketName = `cw_commercial_invocie_automation`;
      const dbStoragePath = `${bucketName}/${objectPath}`;

      const { error: storageError } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(objectPath, rawFile, {
          upsert: false,
          contentType: rawFile.type || undefined,
        });

      if (storageError) {
        return NextResponse.json(
          {
            error: `Storage upload failed for ${rawFile.name}: ${storageError.message}`,
          },
          { status: 500 }
        );
      }

      const { error: dbError } = await supabaseAdmin
        .from("cw_commercial_invoice_automation_invoices")
        .insert({
          document_name: rawFile.name,
          document_uploaded_path: dbStoragePath,
          uploaded_by: "frontend-user",
          extracted_data: null,
        });

      if (dbError) {
        return NextResponse.json(
          {
            error: `Database insert failed for ${rawFile.name}: ${dbError.message}`,
          },
          { status: 500 }
        );
      }

      uploadedDocs.push({
        document_name: rawFile.name,
        document_uploaded_path: dbStoragePath,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Documents uploaded successfully.",
      documents: uploadedDocs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown upload error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

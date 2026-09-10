import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

const bucketName = "cw_commercial_invocie_automation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const documentPath = body?.document_uploaded_path;

    if (typeof documentPath !== "string" || !documentPath.startsWith(`${bucketName}/`)) {
      return NextResponse.json({ error: "Invalid document path." }, { status: 400 });
    }

    const objectPath = documentPath.slice(`${bucketName}/`.length);
    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .createSignedUrl(objectPath, 60 * 60);

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { error: error?.message ?? "Unable to create a preview URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({ signed_url: data.signedUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create a preview URL.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Document } from "@/types/document";
import ExtractedDataForm from "./components/extracted-data-form";

const isImageDocument = (name: string) => /\.(png|jpe?g|tiff?)$/i.test(name);
const isSpreadsheetDocument = (name: string) => /\.(xls|xlsx|csv)$/i.test(name);

const parseExtractedData = (value: unknown): unknown => {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

function DocumentDetailsContent() {
  const searchParams = useSearchParams();
  const documentId = searchParams.get("id");
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    if (!documentId) {
      return;
    }

    let cancelled = false;

    const fetchDocumentData = async () => {
      try {
        const response = await fetch(`/api/documents?id=${documentId}`, {
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Unable to fetch document details.");
        }

        if (cancelled) return;
        setDocument(result.document);
        setIsPreviewLoading(true);

        const previewResponse = await fetch("/api/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            document_uploaded_path: result.document.document_uploaded_path,
          }),
        });
        const previewResult = await previewResponse.json();

        if (!previewResponse.ok) {
          throw new Error(previewResult.error || "Unable to prepare document preview.");
        }

        if (!cancelled) setDocumentPreviewUrl(previewResult.signed_url);
      } catch (fetchError) {
        if (!cancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Unable to fetch document details.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsPreviewLoading(false);
        }
      }
    };

    fetchDocumentData();
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  const extractData = async () => {
    if (!document) return;

    setIsExtracting(true);
    setError(null);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_name: document.document_name,
          document_uploaded_path: document.document_uploaded_path,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to extract document data.");
      }

      setDocument((currentDocument) =>
        currentDocument
          ? {
              ...currentDocument,
              extracted_data: result.extracted_data ?? null,
              status: "Extracted",
            }
          : currentDocument,
      );
      setIsConfirmed(false);
    } catch (extractError) {
      setError(
        extractError instanceof Error
          ? extractError.message
          : "Unable to extract document data.",
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const confirmData = async (data: unknown) => {
    if (!document) return;

    setIsConfirming(true);
    setError(null);

    try {
      const response = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_uploaded_path: document.document_uploaded_path,
          extracted_data: data,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to confirm extracted data.");
      }

      setDocument((currentDocument) =>
        currentDocument ? { ...currentDocument, extracted_data: data } : currentDocument,
      );
      setIsConfirmed(true);
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : "Unable to confirm extracted data.",
      );
    } finally {
      setIsConfirming(false);
    }
  };

  const extractedData = parseExtractedData(document?.extracted_data);
  const hasExtractedData =
    extractedData !== null && extractedData !== undefined && extractedData !== "";

  return (
    <div className="mx-auto w-full max-w-6xl p-5 sm:p-8">
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <Badge
              variant="secondary"
              className="w-fit bg-primary/10 text-foreground dark:bg-primary/50"
            >
              Invoice Details
            </Badge>
            <CardTitle className="text-3xl font-semibold tracking-tight">
              Document Details
            </CardTitle>
            <CardDescription>
              Review the selected document and its extraction data.
            </CardDescription>
          </div>
        </div>
        {(error || !documentId) && (
          <Alert variant="destructive">
            <AlertDescription>
              {error || "A document id is required."}
            </AlertDescription>
          </Alert>
        )}
        {documentId && isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : document ? (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>{document.document_name}</CardTitle>
                {document.status === "Uploaded" && (
                  <Button type="button" onClick={extractData} disabled={isExtracting}>
                    {isExtracting ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <RefreshCw />
                    )}
                    {isExtracting ? "Extracting..." : "Extract data"}
                  </Button>
                )}
              </div>
              <CardDescription>
                <div className="flex flex-wrap gap-2 text-sm">
                  <Badge>{document.status}</Badge>
                  <span className="text-muted-foreground">
                    Uploaded {new Date(document.created_at).toLocaleString()}
                  </span>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="grid items-stretch gap-6 lg:grid-cols-2">
              <div className="h-full space-y-4">
                <div className="flex h-full min-h-[32rem] items-center justify-center overflow-hidden rounded-xl border border-border bg-white shadow-inner dark:bg-neutral-950 sm:min-h-[40rem]">
                  {isPreviewLoading ? (
                    <p className="text-sm text-muted-foreground">Preparing document preview...</p>
                  ) : documentPreviewUrl && document.document_name.toLowerCase().endsWith(".pdf") ? (
                    <iframe
                      src={`${documentPreviewUrl}#toolbar=1&navpanes=1&view=FitH`}
                      title={`Preview of ${document.document_name}`}
                      className="h-[32rem] w-full sm:h-[40rem]"
                    />
                  ) : documentPreviewUrl && isImageDocument(document.document_name) ? (
                    <object
                      data={documentPreviewUrl}
                      type="image/*"
                      aria-label={`Preview of ${document.document_name}`}
                      className="max-h-[32rem] w-full object-contain sm:max-h-[40rem]"
                    />
                  ) : documentPreviewUrl && isSpreadsheetDocument(document.document_name) ? (
                    <iframe
                      src={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(documentPreviewUrl)}`}
                      title={`Preview of ${document.document_name}`}
                      className="h-[32rem] w-full sm:h-[40rem]"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3 px-6 text-center text-sm text-muted-foreground">
                      <p>Preview is unavailable for this document.</p>
                      {documentPreviewUrl && (
                        <a
                          href={documentPreviewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline"
                        >
                          Open original file
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex h-full min-h-0 flex-col overflow-y-auto rounded-xl border bg-background p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Extracted data</p>
                    <p className="text-xs text-muted-foreground">
                      Confirmed values from this document
                    </p>
                  </div>
                  <Badge variant={hasExtractedData ? "default" : "secondary"}>
                    {hasExtractedData ? "Extracted" : "Pending"}
                  </Badge>
                </div>

                {hasExtractedData ? (
                  <ExtractedDataForm
                    key={JSON.stringify(extractedData)}
                    data={extractedData}
                    documentName={document.document_name}
                    isConfirmed={isConfirmed}
                    isConfirming={isConfirming}
                    isExtracting={isExtracting}
                    onConfirm={confirmData}
                    onReExtract={extractData}
                  />
                ) : (
                  <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No extracted data is available yet.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

export default function DocumentDetails() {
  return (
    <Suspense
      fallback={<Skeleton className="mx-auto mt-8 h-48 w-full max-w-6xl" />}
    >
      <DocumentDetailsContent />
    </Suspense>
  );
}

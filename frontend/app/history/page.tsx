"use client";

import Link from "next/link";
import { ArrowRight, FileCheck2, FileText, History } from "lucide-react";

import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DocumentRecord = {
  document_name: string;
  document_uploaded_path: string;
  uploaded_by?: string | null;
  extracted_data?: unknown;
  created_at?: string | null;
};

export default function HistoryPage() {
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

    useEffect(() => {
    let cancelled = false;

    const fetchAllUploadedDocuments = async () => {
      try {
        const response = await fetch("/api/documents", {
          method: "GET",
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Unable to fetch uploaded documents.");
        }

        if (!cancelled) setDocuments(result.documents ?? []);
      } catch (error) {
        if (!cancelled) {
          setError(error instanceof Error ? error.message : "Unable to fetch uploaded documents.");
        }
      } finally {
        if (!cancelled) setIsDataLoading(false);
      }
    };

    fetchAllUploadedDocuments();
    return () => {
      cancelled = true;
    };
    }, []);

  return (
    <div className="mx-auto w-full max-w-6xl p-5 sm:p-8">
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <Badge variant="secondary" className="w-fit">Processing history</Badge>
            <CardTitle>Uploaded documents</CardTitle>
            <CardDescription>Review every uploaded document and its extraction status.</CardDescription>
          </div>
          <Button asChild>
            <Link href="/invoice-upload">
              <History />
              Open upload workspace
              <ArrowRight />
            </Link>
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Document records</CardTitle>
            <CardDescription>{documents.length} document(s) found</CardDescription>
          </CardHeader>
          <CardContent>
            {isDataLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : documents.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <FileText className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No uploaded documents yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Uploaded by</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((document) => {
                    const isExtracted = document.extracted_data !== null && document.extracted_data !== undefined;

                    return (
                      <TableRow key={`${document.document_name}-${document.document_uploaded_path}`}>
                        <TableCell>
                          <div className="flex min-w-56 items-center gap-2">
                            <FileText className="size-4 text-primary" />
                            <div className="min-w-0">
                              <p className="truncate font-medium">{document.document_name}</p>
                              <p className="max-w-sm truncate text-xs text-muted-foreground">{document.document_uploaded_path}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{document.uploaded_by || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={isExtracted ? "default" : "secondary"}>
                            {isExtracted ? <FileCheck2 /> : null}
                            {isExtracted ? "Extracted" : "Uploaded"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {document.created_at ? new Date(document.created_at).toLocaleString() : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
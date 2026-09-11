"use client";

import Link from "next/link";
import { ArrowRight, FileText, History } from "lucide-react";

import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter } from "next/navigation";
import { cn } from "cn";
import { Document } from "@/types/document";

const DOCUMENTS_PER_PAGE = 10;

export default function HistoryPage() {
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const router = useRouter();

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
          throw new Error(
            result.error || "Unable to fetch uploaded documents.",
          );
        }

        if (!cancelled) setDocuments(result.documents ?? []);
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
              : "Unable to fetch uploaded documents.",
          );
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

  const totalPages = Math.ceil(documents.length / DOCUMENTS_PER_PAGE);
  const paginatedDocuments = documents.slice(
    (currentPage - 1) * DOCUMENTS_PER_PAGE,
    currentPage * DOCUMENTS_PER_PAGE,
  );

   const handleViewButtonClick = (documentId: number) => {
    router.push(`/history/details?id=${documentId}`);
   }

  return (
    <div className="mx-auto w-full max-w-6xl p-5 sm:p-8">
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <Badge variant="secondary" className="w-fit bg-primary/10 text-foreground dark:bg-primary/50">
              Processing History
            </Badge>
            <CardTitle className="text-3xl font-semibold tracking-tight">Uploaded Documents</CardTitle>
            <CardDescription>
              Review every uploaded document and its extraction status.
            </CardDescription>
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
            <CardDescription>
              {documents.length} document(s) found
            </CardDescription>
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
                <p className="text-sm text-muted-foreground">
                  No uploaded documents yet.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded At</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDocuments.map((document) => {
                    return (
                      <TableRow
                        key={`${document.document_name}-${document.document_uploaded_path}`}
                      >
                        <TableCell>
                          <div className="flex min-w-56 items-center gap-2">
                            <FileText className={cn("size-4", document.document_name.endsWith('xlsx') || document.document_name.endsWith('xls') || document.document_name.endsWith('csv') ? "text-green-500" : "text-primary")} />
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {document.document_name}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={"default"}
                            className={`${document.status === "Uploaded" ? "bg-blue-50 text-blue-500" : document.status === "Extracted" && "bg-green-50 text-green-500"}`}
                          >
                            {document.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {document.created_at
                            ? new Date(document.created_at).toLocaleString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Button variant="link" className="cursor-pointer text-xs" onClick={() => handleViewButtonClick(document.id)}>View Details</Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            {!isDataLoading && totalPages > 1 && (
              <Pagination className="mt-2">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      aria-disabled={currentPage === 1}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
                      onClick={(event) => {
                        event.preventDefault();
                        setCurrentPage((page) => Math.max(1, page - 1));
                      }}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                    (page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          href="#"
                          isActive={page === currentPage}
                          aria-label={`Go to page ${page}`}
                          onClick={(event) => {
                            event.preventDefault();
                            setCurrentPage(page);
                          }}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ),
                  )}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      aria-disabled={currentPage === totalPages}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined}
                      onClick={(event) => {
                        event.preventDefault();
                        setCurrentPage((page) => Math.min(totalPages, page + 1));
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

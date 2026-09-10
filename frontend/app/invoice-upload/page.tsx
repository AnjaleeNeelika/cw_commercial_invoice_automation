"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowUpToLine,
  FileSpreadsheet,
  FileText,
  Eye,
  Loader2,
  Lock,
  Pencil,
  RefreshCw,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const acceptedTypes = [
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/tiff",
  ".pdf",
  ".xls",
  ".xlsx",
  ".csv",
  ".png",
  ".jpg",
  ".jpeg",
  ".tiff",
];

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  const value = bytes / 1024 ** index;

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${sizes[index]}`;
};

const getFileType = (file: File) => {
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf")) return "PDF";
  if (name.endsWith(".xls") || name.endsWith(".xlsx") || name.endsWith(".csv")) return "Spreadsheet";
  if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".tiff")) return "Image";
  if (file.type.includes("pdf")) return "PDF";
  if (file.type.includes("sheet") || file.type.includes("excel") || file.type.includes("csv")) return "Spreadsheet";

  return "Document";
};

const getDocumentType = (file: File) => {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "PDF";
  if (file.type.startsWith("image/") || /\.(png|jpe?g|tiff?)$/.test(name)) return "Image";
  if (
    file.type === "application/vnd.ms-excel" ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "text/csv" ||
    name.endsWith(".xls") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".csv")
  )
    return "Spreadsheet";

  return "Unsupported";
};

const isImageFile = (file: File) =>
  file.type.startsWith("image/") || /\.(png|jpe?g|tiff?)$/i.test(file.name);

const humanizeKey = (key: string) =>
  key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (value) => value.toUpperCase());

export default function InvoiceUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<Array<{ document_name: string; document_uploaded_path: string }>>([]);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [extractedData, setExtractedData] = useState<unknown>(null);
  const [editableData, setEditableData] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState<string | null>(null);
  const [officePreviewUrl, setOfficePreviewUrl] = useState<string | null>(null);

  const selectedFile = useMemo(
    () => files.find((file) => file.name === selectedFileName) ?? files[0] ?? null,
    [files, selectedFileName]
  );

  const editableFields = useMemo(() => {
    try {
      const parsed = JSON.parse(editableData);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return Object.entries(parsed) as Array<[string, unknown]>;
      }
    } catch {
      return null;
    }

    return null;
  }, [editableData]);

  useEffect(() => {
    if (!selectedFile) {
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    // Keep the original uploaded File intact and only create a temporary browser URL for display.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDocumentPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  useEffect(() => {
    let cancelled = false;
    const activeDocument = selectedFile
      ? uploadedDocuments.find((item) => item.document_name === selectedFile.name)
      : null;
    const isSpreadsheet = selectedFile && getFileType(selectedFile) === "Spreadsheet";

    if (!activeDocument || !isSpreadsheet) {
      // Clear the previous workbook viewer when the selected document changes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOfficePreviewUrl(null);
      return () => {
        cancelled = true;
      };
    }

    fetch("/api/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_uploaded_path: activeDocument.document_uploaded_path }),
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to prepare spreadsheet preview.");
        if (!cancelled) setOfficePreviewUrl(result.signed_url);
      })
      .catch((error) => {
        if (!cancelled) {
          setOfficePreviewUrl(null);
          toast.error(error instanceof Error ? error.message : "Unable to prepare spreadsheet preview.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedFile, uploadedDocuments]);

  const handleFiles = (incomingFiles: FileList | null | undefined) => {
    if (!incomingFiles) return;

    const nextFiles = Array.from(incomingFiles).filter((file) => {
      const fileName = file.name.toLowerCase();
      return (
        acceptedTypes.includes(file.type) ||
        fileName.endsWith(".pdf") ||
        fileName.endsWith(".xls") ||
        fileName.endsWith(".xlsx") ||
        fileName.endsWith(".csv")
      );
    });

    const unsupportedFiles = Array.from(incomingFiles).filter((file) => {
      const fileName = file.name.toLowerCase();
      return !(
        acceptedTypes.includes(file.type) ||
        fileName.endsWith(".pdf") ||
        fileName.endsWith(".xls") ||
        fileName.endsWith(".xlsx") ||
        fileName.endsWith(".csv")
      );
    });

    if (unsupportedFiles.length > 0) {
      toast.error(`Unsupported file type: ${unsupportedFiles[0].name}. Please upload a PDF or Excel file.`);
      setUploadSuccess(false);
    }

    setFiles((currentFiles) => {
      const merged = [...currentFiles, ...nextFiles];
      const unique = merged.filter(
        (file, index, array) => array.findIndex((item) => item.name === file.name && item.size === file.size) === index
      );

      return unique;
    });

    if (nextFiles.length > 0) {
      setSelectedFileName(nextFiles[0].name);
    }
  };

  const uploadFiles = async () => {
    if (!files.length) {
      toast.error("Please choose at least one file to upload.");
      setUploadSuccess(false);
      return;
    }

    const invalidFile = files.find((file) => getDocumentType(file) === "Unsupported");
    if (invalidFile) {
      toast.error(`Unsupported document type: ${invalidFile.name}. Only PDF or Excel files are allowed.`);
      setUploadSuccess(false);
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }

      setUploadedDocuments(result.documents ?? []);
      toast.success(`Uploaded ${files.length} file(s) successfully.`);
      setUploadSuccess(true);
      setExtractedData(null);
      setEditableData("");
      setIsEditing(false);
      setIsConfirmed(false);
      toast.info("Your document is ready for extraction.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong during upload.");
      setUploadSuccess(false);
    } finally {
      setIsUploading(false);
    }
  };

  const extractData = async () => {
    const activeDocument = selectedFile
      ? uploadedDocuments.find((item) => item.document_name === selectedFile.name)
      : null;

    if (!activeDocument) {
      toast.error("Please upload a file before extracting data.");
      return;
    }

    setIsExtracting(true);
    setIsConfirmed(false);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document_name: activeDocument.document_name,
          document_uploaded_path: activeDocument.document_uploaded_path,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Extraction failed");
      }

      setExtractedData(result.extracted_data ?? null);
      setEditableData(JSON.stringify(result.extracted_data ?? null, null, 2));
      setIsEditing(false);
      toast.success("Extraction completed successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to extract data.");
      setExtractedData(null);
    } finally {
      setIsExtracting(false);
    }
  };

  const confirmData = async () => {
    try {
      const parsedData = JSON.parse(editableData);
      const activeDocument = selectedFile
        ? uploadedDocuments.find((item) => item.document_name === selectedFile.name)
        : null;

      if (!activeDocument) {
        toast.error("Upload the document before confirming its extracted data.");
        return;
      }

      setIsConfirming(true);
      const response = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_uploaded_path: activeDocument.document_uploaded_path,
          extracted_data: parsedData,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to confirm extracted data.");
      }

      setExtractedData(parsedData);
      setEditableData(JSON.stringify(parsedData, null, 2));
      setIsEditing(false);
      setIsConfirmed(true);
      toast.success("Extracted data confirmed and locked.");
    } catch (error) {
      toast.error(
        error instanceof SyntaxError
          ? "The extracted data is not valid JSON. Correct it before confirming."
          : error instanceof Error
            ? error.message
            : "Unable to confirm extracted data."
      );
      setIsConfirmed(false);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-background p-5">
      <Card className={`w-full max-w-[80vw] rounded-2xl border-border/80 shadow-sm max-h-[85vh] overflow-auto ${uploadSuccess ? "hidden" : ""}`}>
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-semibold">Upload invoice</CardTitle>
          <CardDescription>
            Upload one or more PDF or Excel files to validate the document type, save them to the invoice bucket, and extract data after upload.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              handleFiles(event.dataTransfer.files);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all ${
              isDragging
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-muted/20 hover:border-primary/60 hover:bg-muted/30"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.tiff,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,image/png,image/jpeg,image/tiff"
              className="hidden"
              multiple
              onChange={(event) => handleFiles(event.target.files)}
            />

            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Upload className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <p className="text-lg font-medium text-foreground">Drag & drop your files here</p>
              <p className="text-sm text-muted-foreground">
                Supported formats: PDF, XLS, XLSX, CSV, PNG, JPG, TIFF
              </p>
            </div>

            <Button type="button" variant="outline" className="mt-5">
              Browse files
            </Button>
          </div>

          {files.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-[0.5fr_1fr]">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Selected files</p>
                  <p className="text-xs text-muted-foreground">{files.length} file(s)</p>
                </div>

                <div className="space-y-2">
                  {files.map((file) => {
                    const isPdf = file.name.toLowerCase().endsWith(".pdf");
                    const isExcel =
                      file.name.toLowerCase().endsWith(".xls") ||
                      file.name.toLowerCase().endsWith(".xlsx") ||
                      file.name.toLowerCase().endsWith(".csv");
                    const isSelected = selectedFile?.name === file.name;

                    return (
                      <Button
                        key={`${file.name}-${file.size}`}
                        type="button"
                        variant="ghost"
                        onClick={() => setSelectedFileName(file.name)}
                        className={`h-auto w-full justify-between rounded-xl border px-3 py-2 text-left ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border bg-muted/20 hover:border-primary/60 hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background">
                            {isPdf ? (
                              <FileText className="h-5 w-5 text-primary" />
                            ) : isExcel ? (
                              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                            ) : (
                              <ArrowUpToLine className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="hidden sm:inline-flex">
                            {getFileType(file)}
                          </Badge>
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                {selectedFile ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-background">
                          {selectedFile.name.toLowerCase().endsWith(".pdf") ? (
                            <FileText className="h-5 w-5 text-primary" />
                          ) : (
                            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{selectedFile.name}</p>
                          <p className="text-xs text-muted-foreground">{getFileType(selectedFile)}</p>
                        </div>
                      </div>
                    </div>

                    {/* <div className="rounded-xl border border-border bg-background p-3">
                      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span>File details</span>
                        <span>{formatFileSize(selectedFile.size)}</span>
                      </div>
                      <Separator className="mb-3" />

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Name</span>
                          <span className="truncate text-right font-medium text-foreground">{selectedFile.name}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Type</span>
                          <span className="font-medium text-foreground">{getFileType(selectedFile)}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Size</span>
                          <span className="font-medium text-foreground">{formatFileSize(selectedFile.size)}</span>
                        </div>
                      </div>
                    </div> */}

                    <div className="overflow-hidden rounded-xl border border-dashed border-border bg-background">
                      {selectedFile.name.toLowerCase().endsWith(".pdf") && documentPreviewUrl ? (
                        <iframe src={documentPreviewUrl} title={selectedFile.name} className="h-64 w-full rounded-lg" />
                      ) : isImageFile(selectedFile) && documentPreviewUrl ? (
                        <object data={documentPreviewUrl} type={selectedFile.type} aria-label={selectedFile.name} className="max-h-64 w-full object-contain" />
                      ) : selectedFile.name.toLowerCase().endsWith(".pdf") ? (
                        <div className="flex h-64 items-center justify-center px-3 text-center text-sm text-muted-foreground">
                          PDF preview is loading...
                        </div>
                      ) : (
                        <div className="flex h-64 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
                          <p>Spreadsheet files cannot be rendered natively by the browser.</p>
                          {documentPreviewUrl && (
                            <Button asChild variant="outline" size="sm">
                              <a href={documentPreviewUrl} target="_blank" rel="noreferrer">Open original file</a>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {extractedData !== null && (
                      <div className="rounded-xl border border-border bg-background p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-foreground">Extracted data</p>
                            <p className="text-xs text-muted-foreground">
                              {isConfirmed ? "Confirmed and locked" : "Review and edit before confirming"}
                            </p>
                          </div>
                          <Badge variant={isConfirmed ? "default" : "secondary"}>
                            {isConfirmed ? "Confirmed" : "Draft"}
                          </Badge>
                        </div>
                        <Textarea
                          value={editableData}
                          onChange={(event) => {
                            setEditableData(event.target.value);
                          }}
                          disabled={isConfirmed}
                          aria-label="Extracted invoice data"
                          className="min-h-64 resize-y bg-muted/20 font-mono text-xs"
                        />
                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                          {!isConfirmed && (
                            <Button type="button" onClick={confirmData} disabled={isConfirming}>
                              {isConfirming ? <Loader2 className="animate-spin" /> : <Lock />}
                              {isConfirming ? "Confirming..." : "Confirm data"}
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            onClick={extractData}
                            disabled={isExtracting || isConfirmed}
                          >
                            <RefreshCw className={isExtracting ? "animate-spin" : undefined} />
                            Re-extract
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-full min-h-40 items-center justify-center text-sm text-muted-foreground">
                    Select a file to preview it.
                  </div>
                )}
              </div>
            </div>
          )}

        </CardContent>

        <CardFooter className="flex flex-col gap-4 border-t border-border/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {uploadSuccess && (
              <Button type="button" variant="secondary" onClick={extractData} disabled={isExtracting || !selectedFile}>
                {isExtracting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  "Extract data"
                )}
              </Button>
            )}

            <Button type="button" onClick={uploadFiles} disabled={isUploading || files.length === 0} className="min-w-28">
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload files"
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>

      {uploadSuccess && selectedFile && (
        <Card className="w-full max-w-[90vw] rounded-2xl border-border/80 shadow-sm max-h-[88vh] overflow-auto">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-2xl font-semibold">Review extracted data</CardTitle>
                <CardDescription className="mt-2">
                  Review the extracted fields, edit the draft if needed, then confirm it to lock the document.
                </CardDescription>
              </div>
              <Badge variant={isConfirmed ? "default" : "secondary"}>
                {isConfirmed ? "Confirmed" : "Ready to review"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border bg-muted/20 p-3">
                {selectedFile.name.toLowerCase().endsWith(".pdf") ? (
                  <FileText className="size-5 text-primary" />
                ) : (
                  <FileSpreadsheet className="size-5 text-emerald-600" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{getFileType(selectedFile)} · {formatFileSize(selectedFile.size)}</p>
                </div>
              </div>

              <div className="flex min-h-[32rem] items-center justify-center overflow-hidden rounded-xl border border-border bg-white shadow-inner dark:bg-neutral-950 sm:min-h-[40rem]">
                {selectedFile.name.toLowerCase().endsWith(".pdf") && documentPreviewUrl ? (
                  <iframe
                    src={`${documentPreviewUrl}#toolbar=1&navpanes=1&view=FitH`}
                    title={`Preview of ${selectedFile.name}`}
                    className="h-[32rem] w-full sm:h-[40rem]"
                  />
                ) : isImageFile(selectedFile) && documentPreviewUrl ? (
                  <object data={documentPreviewUrl} type={selectedFile.type} aria-label={selectedFile.name} className="max-h-[32rem] w-full object-contain sm:max-h-[40rem]" />
                ) : getFileType(selectedFile) === "Spreadsheet" && officePreviewUrl ? (
                  <iframe
                    src={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(officePreviewUrl)}`}
                    title={`Preview of ${selectedFile.name}`}
                    className="h-[32rem] w-full sm:h-[40rem]"
                  />
                ) : (
                  <div className="flex h-[32rem] flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground sm:h-[40rem]">
                    <p>Preparing the original spreadsheet preview...</p>
                    {(officePreviewUrl || documentPreviewUrl) && (
                      <Button asChild variant="outline">
                        <a href={officePreviewUrl ?? documentPreviewUrl ?? undefined} target="_blank" rel="noreferrer">Open original file</a>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex min-h-0 flex-col rounded-xl border bg-background p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Extracted data</p>
                  <p className="text-xs text-muted-foreground">
                    {isConfirmed ? "Confirmed and locked." : isEditing ? "Make corrections, then confirm the data." : "Click Edit to change a field."}
                  </p>
                </div>
                <Badge variant={isConfirmed ? "default" : "secondary"}>
                  {isConfirmed ? "Confirmed" : extractedData === null ? "Pending" : "Draft"}
                </Badge>
              </div>

              {extractedData === null ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center">
                  <p className="text-sm text-muted-foreground">No extracted data is available yet.</p>
                  <Button type="button" onClick={extractData} disabled={isExtracting}>
                    {isExtracting ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                    {isExtracting ? "Extracting..." : "Extract data"}
                  </Button>
                </div>
              ) : editableFields ? (
                <div className="flex flex-1 flex-col">
                  <div className="space-y-4 overflow-auto pr-1">
                    {editableFields.map(([key, value]) => {
                      const isSimpleValue = value === null || typeof value !== "object";
                      const displayValue = isSimpleValue ? String(value ?? "") : JSON.stringify(value, null, 2);

                      return (
                        <div key={key} className="space-y-2">
                          <Label htmlFor={`field-${key}`}>{humanizeKey(key)}</Label>
                          {isSimpleValue ? (
                            <Input
                              id={`field-${key}`}
                              value={displayValue}
                              disabled={!isEditing || isConfirmed}
                              onChange={(event) => {
                                const parsed = JSON.parse(editableData) as Record<string, unknown>;
                                parsed[key] = event.target.value;
                                setEditableData(JSON.stringify(parsed, null, 2));
                              }}
                            />
                          ) : (
                            <Textarea
                              id={`field-${key}`}
                              value={displayValue}
                              disabled={!isEditing || isConfirmed}
                              onChange={(event) => {
                                const parsed = JSON.parse(editableData) as Record<string, unknown>;
                                try {
                                  parsed[key] = JSON.parse(event.target.value);
                                } catch {
                                  parsed[key] = event.target.value;
                                }
                                setEditableData(JSON.stringify(parsed, null, 2));
                              }}
                              className="font-mono text-xs"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex flex-wrap justify-end gap-2 border-t pt-4">
                    {!isConfirmed && (
                      <Button type="button" variant="outline" onClick={() => setIsEditing((editing) => !editing)}>
                        <Pencil />
                        {isEditing ? "Done editing" : "Edit"}
                      </Button>
                    )}
                    {!isConfirmed && (
                      <Button type="button" onClick={confirmData} disabled={isConfirming}>
                        {isConfirming ? <Loader2 className="animate-spin" /> : <Lock />}
                        {isConfirming ? "Confirming..." : "Confirm data"}
                      </Button>
                    )}
                    <Button type="button" variant="outline" onClick={extractData} disabled={isExtracting || isConfirmed}>
                      <RefreshCw className={isExtracting ? "animate-spin" : undefined} />
                      Re-extract
                    </Button>
                  </div>
                </div>
              ) : (
                <Textarea
                  value={editableData}
                  onChange={(event) => setEditableData(event.target.value)}
                  disabled={!isEditing || isConfirmed}
                  className="min-h-72 flex-1 font-mono text-xs"
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
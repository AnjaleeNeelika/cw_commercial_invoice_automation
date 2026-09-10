'use client';

import { useCallback, useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Point this at your n8n Form Trigger's production webhook URL.
// Easiest to set as an env var: NEXT_PUBLIC_N8N_WEBHOOK_URL=https://your-instance/webhook/...
const WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ?? '';

type Status = 'idle' | 'uploading' | 'error' | 'done';

export default function DocumentExtractor() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const chooseFile = useCallback((f: File | undefined | null) => {
    if (!f) return;
    setFile(f);
    setStatus('idle');
    setError(null);
    setResult(null);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragActive(false);
      chooseFile(e.dataTransfer.files?.[0]);
    },
    [chooseFile]
  );

  const submit = useCallback(async () => {
    if (!file) return;
    if (!WEBHOOK_URL) {
      setStatus('error');
      setError('No webhook URL configured. Set NEXT_PUBLIC_N8N_WEBHOOK_URL.');
      return;
    }

    setStatus('uploading');
    setError(null);

    try {
      const body = new FormData();
      // "Document" must match the field label set on your n8n Form Trigger.
      body.append('Document', file);

      const res = await fetch(WEBHOOK_URL, { method: 'POST', body });

      if (!res.ok) {
        throw new Error(`Extraction failed (${res.status}). Try again.`);
      }

      const data = await res.json();
      setResult(data);
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Extraction failed. Try again.');
    }
  }, [file]);

  const reset = useCallback(() => {
    setFile(null);
    setStatus('idle');
    setError(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  return (
    <div
      style={{
        maxWidth: 640,
        margin: '0 auto',
        padding: '48px 24px',
        color: '#1C2321',
        fontFamily:
          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <h1
        style={{
          fontFamily: "'Iowan Old Style', 'Palatino Linotype', Georgia, serif",
          fontSize: 30,
          fontWeight: 600,
          letterSpacing: '-0.01em',
          marginBottom: 8,
        }}
      >
        Upload a document
      </h1>
      <p style={{ color: '#6B7268', fontSize: 15, lineHeight: 1.5, marginBottom: 28 }}>
        Add a PDF, image, or spreadsheet. We&apos;ll read it and pull out the
        structured fields.
      </p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        style={{
          border: `1.5px dashed ${dragActive ? '#3C6E5A' : '#C7CCC5'}`,
          borderRadius: 8,
          padding: '36px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragActive ? '#EEF3F0' : '#FBFBF9',
          transition: 'background 120ms ease, border-color 120ms ease',
        }}
      >
        <Input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.tiff,.xlsx,.xls"
          onChange={(e) => chooseFile(e.target.files?.[0])}
          className="hidden"
        />

        {file ? (
          <>
            <div>
              <div style={{ fontWeight: 500 }}>{file.name}</div>
              <div style={{ color: '#6B7268', fontSize: 13, marginTop: 2 }}>
                {(file.size / 1024).toFixed(0)} KB &middot; click to replace
              </div>
            </div>
            <Badge variant="secondary" className="mt-3">Ready</Badge>
          </>
        ) : (
          <div>
            <div style={{ fontWeight: 500 }}>Drop a file here, or click to choose one</div>
            <div style={{ color: '#6B7268', fontSize: 13, marginTop: 2 }}>
              PDF, image, or Excel file
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-5 flex gap-3">
        <Button
          onClick={submit}
          disabled={!file || status === 'uploading'}
        >
          {status === 'uploading' ? 'Extracting...' : 'Extract data'}
        </Button>

        {(file || result !== null) && (
          <Button
            onClick={reset}
            variant="outline"
          >
            Start over
          </Button>
        )}
      </div>

      {/* Error */}
      {status === 'error' && error && (
        <Alert variant="destructive" className="mt-5">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {status === 'done' && result !== null && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Extracted data</CardTitle>
            <CardDescription>Fields returned by the extraction workflow.</CardDescription>
          </CardHeader>
          <ResultView data={result} />
        </Card>
      )}
    </div>
  );
}

// Converts any unknown value into something safe to render as a ReactNode.
// Centralizing this avoids relying on TypeScript's control-flow narrowing,
// which some tsconfig strictness levels won't infer through JSX branches.
function toDisplay(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '—';
    }
  }
  return String(value);
}

// Renders whatever shape the workflow returns: a single object of fields,
// or an array of rows (e.g. spreadsheet rows tagged with sheetName).
function ResultView({ data }: { data: unknown }) {
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <Empty />;
    }
    return <RowTable rows={data as Record<string, unknown>[]} />;
  }

  if (data && typeof data === 'object') {
    return <FieldList obj={data as Record<string, unknown>} />;
  }

  return (
    <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>
      {toDisplay(data)}
    </div>
  );
}

function FieldList({ obj }: { obj: Record<string, unknown> }) {
  const entries = Object.entries(obj);
  return (
    <CardContent className="gap-0">
      {entries.map(([key, value], i) => (
        <div
          key={key}
          className={`grid grid-cols-[minmax(120px,160px)_1fr] gap-3 py-2.5 text-sm ${i > 0 ? 'border-t' : ''}`}
        >
          <div className="text-muted-foreground">{humanize(key)}</div>
          <div className="break-words font-mono text-xs">
            {Array.isArray(value) ? (
              <RowTable rows={value as Record<string, unknown>[]} compact />
            ) : (
              toDisplay(value)
            )}
          </div>
        </div>
      ))}
    </CardContent>
  );
}

function RowTable({
  rows,
  compact = false,
}: {
  rows: Record<string, unknown>[];
  compact?: boolean;
}) {
  const columns = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((k) => set.add(k));
      return set;
    }, new Set<string>())
  );

  return (
    <div className={compact ? 'mt-1.5 overflow-x-auto' : 'overflow-x-auto'}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead
                key={c}
              >
                {humanize(c)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              {columns.map((c) => (
                <TableCell
                  key={c}
                  className="whitespace-nowrap font-mono text-xs"
                >
                  {toDisplay(row[c])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function Empty() {
  return (
    <div style={{ color: '#6B7268', fontSize: 14, padding: '16px 0' }}>
      No data came back for this file.
    </div>
  );
}

function humanize(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (s) => s.toUpperCase());
}
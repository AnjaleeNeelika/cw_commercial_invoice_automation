import Link from "next/link";
import { ArrowRight, FileCheck2, FileText, UploadCloud } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return <Dashboard />;
}

function Dashboard() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-5 sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <Badge variant="default" className="bg-primary/10 text-foreground dark:bg-primary/50">Commercial operations</Badge>
          <h1 className="text-3xl font-semibold tracking-tight">Invoice Dashboard</h1>
          <p className="max-w-xl text-muted-foreground">
            Upload, validate, and extract structured data from commercial invoices.
          </p>
        </div>
        <Button asChild>
          <Link href="/invoice-upload">
            <UploadCloud />
            Upload invoice
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Documents uploaded" value="0" detail="Ready for processing" icon={FileText} />
        <StatCard label="Ready to extract" value="0" detail="Awaiting extraction" icon={FileCheck2} />
        <StatCard label="Processing history" value="0" detail="Completed documents" icon={ArrowRight} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Start with an invoice</CardTitle>
          <CardDescription>Upload a PDF or spreadsheet to begin the validation and extraction workflow.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/invoice-upload">
              Open upload workspace
              <ArrowRight />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof FileText;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-6">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
        <Icon className="size-5 text-primary" />
      </CardContent>
    </Card>
  );
}

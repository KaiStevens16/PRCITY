"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatLongDate } from "@/lib/date";
import type { DexaScan } from "@/types/database";
import {
  deleteDexaScan,
  getDexaScanPdfUrl,
  previewDexaPdf,
  saveDexaScan,
} from "@/app/actions/dexa";
import type { ParsedDexaBca } from "@/lib/dexa-parse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronDown, ChevronRight, FileUp, Trash2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

function numStr(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return "";
  return String(Number(n));
}

function applyParsed(p: ParsedDexaBca | null) {
  if (!p) {
    return {
      scanDate: "",
      bodyFatPct: "",
      totalMassLb: "",
      fatMassLb: "",
      leanMassLb: "",
      bmcLb: "",
      fatFreeLb: "",
    };
  }
  return {
    scanDate: p.scanDate,
    bodyFatPct: String(p.bodyFatPct),
    totalMassLb: String(p.totalMassLb),
    fatMassLb: String(p.fatMassLb),
    leanMassLb: String(p.leanMassLb),
    bmcLb: String(p.bmcLb),
    fatFreeLb: String(p.fatFreeLb),
  };
}

type Props = { initialScans: DexaScan[] };

export function DexaScansSection({ initialScans }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [scans, setScans] = useState(initialScans);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewHint, setPreviewHint] = useState<string | null>(null);
  const [form, setForm] = useState({
    scanDate: "",
    bodyFatPct: "",
    totalMassLb: "",
    fatMassLb: "",
    leanMassLb: "",
    bmcLb: "",
    fatFreeLb: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setScans(initialScans);
  }, [initialScans]);

  function openPicker() {
    setError(null);
    fileRef.current?.click();
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Please choose a PDF file.");
      return;
    }
    setError(null);
    setPendingFile(file);
    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      const r = await previewDexaPdf(fd);
      if ("error" in r) {
        setError(r.error);
        setPendingFile(null);
        return;
      }
      setPreviewHint(r.hint);
      setForm(applyParsed(r.parsed));
      setDialogOpen(true);
    });
  }

  function closeDialog() {
    setDialogOpen(false);
    setPendingFile(null);
    setPreviewHint(null);
    setForm(applyParsed(null));
  }

  function save() {
    if (!pendingFile) {
      setError("Choose a PDF again.");
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("file", pendingFile);
    fd.set("scanDate", form.scanDate.trim());
    fd.set("bodyFatPct", form.bodyFatPct.trim());
    fd.set("totalMassLb", form.totalMassLb.trim());
    fd.set("fatMassLb", form.fatMassLb.trim());
    fd.set("leanMassLb", form.leanMassLb.trim());
    fd.set("bmcLb", form.bmcLb.trim());
    fd.set("fatFreeLb", form.fatFreeLb.trim());
    startTransition(async () => {
      const r = await saveDexaScan(fd);
      if ("error" in r) {
        setError(r.error);
        return;
      }
      closeDialog();
      router.refresh();
    });
  }

  async function openPdf(path: string) {
    const r = await getDexaScanPdfUrl(path);
    if ("error" in r) {
      window.alert(r.error);
      return;
    }
    window.open(r.url, "_blank", "noopener,noreferrer");
  }

  function removeScan(id: string) {
    if (!window.confirm("Delete this DEXA scan and its stored PDF?")) return;
    startTransition(async () => {
      const r = await deleteDexaScan(id);
      if ("error" in r) {
        window.alert(r.error);
        return;
      }
      setExpandedId(null);
      router.refresh();
    });
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={onFileSelected}
      />

      <Card className="border-border/60 bg-card/90 shadow-card-lg">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-2">
          <div>
            <CardTitle className="text-base">DEXA scans</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload a report PDF. We try to read date and body comp from GE / Lunar-style BCA
              tables; you confirm before saving.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="gap-2 shrink-0"
            disabled={pending}
            onClick={openPicker}
          >
            <FileUp className="h-4 w-4" />
            Upload DEXA PDF
          </Button>
        </CardHeader>
        <CardContent className="pb-6">
          {error && !dialogOpen && (
            <p className="mb-3 text-sm text-destructive">{error}</p>
          )}
          {scans.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No scans yet. Upload a PDF to start a timeline (newest first).
            </p>
          ) : (
            <ul className="divide-y divide-border/40 rounded-xl border border-border/50">
              {scans.map((s) => {
                const open = expandedId === s.id;
                const bf = Number(s.body_fat_pct);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-3 text-left text-sm transition-colors hover:bg-muted/20",
                        open && "bg-muted/10"
                      )}
                      onClick={() => setExpandedId(open ? null : s.id)}
                    >
                      <span className="text-muted-foreground">
                        {open ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1 font-medium">
                        {formatLongDate(s.scan_date)}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {Number.isFinite(bf) ? `${bf.toFixed(1)}%` : "—"} body fat
                      </span>
                    </button>
                    {open && (
                      <div className="space-y-3 border-t border-border/30 bg-muted/5 px-3 py-4 text-sm">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Total mass
                            </span>
                            <p className="font-mono tabular-nums">
                              {numStr(s.total_mass_lb) ? `${numStr(s.total_mass_lb)} lb` : "—"}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Fat mass
                            </span>
                            <p className="font-mono tabular-nums">
                              {numStr(s.fat_mass_lb) ? `${numStr(s.fat_mass_lb)} lb` : "—"}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Lean mass
                            </span>
                            <p className="font-mono tabular-nums">
                              {numStr(s.lean_mass_lb) ? `${numStr(s.lean_mass_lb)} lb` : "—"}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              BMC / fat-free
                            </span>
                            <p className="font-mono tabular-nums">
                              {numStr(s.bmc_lb) ? `${numStr(s.bmc_lb)} lb` : "—"}
                              <span className="text-border"> · </span>
                              {numStr(s.fat_free_lb) ? `${numStr(s.fat_free_lb)} lb` : "—"}
                            </p>
                          </div>
                        </div>
                        {s.original_filename ? (
                          <p className="text-xs text-muted-foreground">
                            File: {s.original_filename}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="gap-1.5"
                            onClick={() => void openPdf(s.storage_path)}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open PDF
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => removeScan(s.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            Tap a row to expand. PDFs are stored privately; “Open PDF” uses a short-lived link.
          </p>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="border-border/80 bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm DEXA scan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {previewHint ? (
              <p className="text-sm text-amber-200/90">{previewHint}</p>
            ) : null}
            {error && dialogOpen ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="dexa-date">Scan date</Label>
              <Input
                id="dexa-date"
                type="date"
                value={form.scanDate}
                onChange={(e) => setForm((f) => ({ ...f, scanDate: e.target.value }))}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dexa-bf">Body fat %</Label>
              <Input
                id="dexa-bf"
                type="text"
                value={form.bodyFatPct}
                onChange={(e) => setForm((f) => ({ ...f, bodyFatPct: e.target.value }))}
                className="font-mono tabular-nums"
              />
            </div>
            <details className="rounded-lg border border-border/50 bg-background/30 px-3 py-2 text-sm">
              <summary className="cursor-pointer font-medium text-muted-foreground">
                Optional masses (lb)
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["totalMassLb", "Total mass", form.totalMassLb],
                    ["fatMassLb", "Fat", form.fatMassLb],
                    ["leanMassLb", "Lean", form.leanMassLb],
                    ["bmcLb", "BMC", form.bmcLb],
                    ["fatFreeLb", "Fat-free", form.fatFreeLb],
                  ] as const
                ).map(([key, label, val]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <Input
                      type="text"
                      value={val}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [key]: e.target.value }))
                      }
                      className="h-8 font-mono text-xs tabular-nums"
                    />
                  </div>
                ))}
              </div>
            </details>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={closeDialog}>
              Cancel
            </Button>
            <Button type="button" disabled={pending} onClick={save}>
              {pending ? "Saving…" : "Save scan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

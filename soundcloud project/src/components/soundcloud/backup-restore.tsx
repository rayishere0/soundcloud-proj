"use client";

import { useState } from "react";
import { Download, Upload, Loader2, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportAllData, importAllData } from "@/lib/persistent-storage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * BackupRestore — UI for exporting all user data to a file and importing it
 * back. This is the ultimate safety net: even if IndexedDB AND localStorage
 * are both cleared, the user can restore from a downloaded backup file.
 */
export function BackupRestore() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const json = await exportAllData();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `notsoundcloud-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded — keep this file safe to restore your data later");
    } catch (e: any) {
      toast.error("Failed to export: " + e.message);
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      await importAllData(text);
      toast.success("Backup restored — reloading the page...");
      // Reload to pick up the rehydrated state
      setTimeout(() => window.location.reload(), 1000);
    } catch (e: any) {
      toast.error("Failed to import: " + e.message);
      setImporting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-medium flex items-center gap-2">
          <Database className="size-4" />
          Backup &amp; restore
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Your data (playlists, liked songs, history, settings) is stored in
          your browser. Download a backup file to keep it safe — if your
          browser data is ever cleared, you can restore everything from this
          file.
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={handleExport}
          disabled={exporting}
          variant="outline"
          className="border-[#2a2a2a] text-white hover:bg-[#1a1a1a] hover:text-white"
        >
          {exporting ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <Download className="size-4 mr-2" />
          )}
          Download backup
        </Button>
        <label className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors cursor-pointer",
          "border border-[#2a2a2a] text-white hover:bg-[#1a1a1a]",
          "h-9 px-3",
          importing && "opacity-50 pointer-events-none"
        )}>
          {importing ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <Upload className="size-4 mr-2" />
          )}
          Restore from file
          <input
            type="file"
            accept="application/json,.json"
            onChange={handleImport}
            disabled={importing}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}

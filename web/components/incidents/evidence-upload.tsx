"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";

type Props = {
  incidentId: string;
  disabled?: boolean;
};

export function EvidenceUpload({ incidentId, disabled }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setProgress(0);
    let uploaded = 0;
    let failures = 0;
    for (let i = 0; i < files.length; i++) {
      const fd = new FormData();
      fd.append("file", files[i]);
      fd.append("incidentId", incidentId);
      try {
        const res = await fetch("/api/evidence", { method: "POST", body: fd });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error?.message ?? `Upload failed for ${files[i].name}`);
        }
      } catch (err) {
        failures++;
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
      uploaded++;
      setProgress(Math.round((uploaded / files.length) * 100));
    }
    setUploading(false);
    if (failures === 0) toast.success(`${files.length} file${files.length > 1 ? "s" : ""} uploaded`);
    else toast.warning(`${failures} of ${files.length} uploads failed`);
    router.refresh();
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
        className="gap-1"
      >
        {uploading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {progress}%
          </>
        ) : (
          <>
            <Upload className="h-3.5 w-3.5" /> Upload
          </>
        )}
      </Button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,video/mp4,video/quicktime"
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
        }}
      />
    </>
  );
}

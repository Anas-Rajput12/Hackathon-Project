"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon, FileText, Film } from "lucide-react";
import { formatDateTime } from "@/components/shared/badges";
import { EvidenceReviewActions } from "@/components/evidence/evidence-review-actions";

type EvidenceItem = {
  id: string;
  fileUrl: string;
  fileType: "IMAGE" | "DOCUMENT" | "VIDEO";
  description: string | null;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  verificationConfidence: number | null;
  uploadedAt: Date | string;
  uploadedBy: { id: string; name: string };
};

const statusColors: Record<string, string> = {
  PENDING: "text-slate-600 bg-slate-50 border-slate-200",
  VERIFIED: "text-green-600 bg-green-50 border-green-200",
  REJECTED: "text-red-600 bg-red-50 border-red-200",
};

export function EvidenceGallery({ evidence, canReview }: { evidence: EvidenceItem[]; canReview?: boolean }) {
  const [active, setActive] = useState<EvidenceItem | null>(null);

  if (evidence.length === 0) {
    return (
      <div className="py-12 text-center">
        <ImageIcon className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No evidence uploaded yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {evidence.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(item)}
            className="group relative rounded-lg border overflow-hidden bg-muted/20 aspect-square text-left hover:ring-2 hover:ring-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {item.fileType === "IMAGE" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.fileUrl}
                alt={item.description ?? "Evidence"}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : item.fileType === "VIDEO" ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                <Film className="h-10 w-10 text-muted-foreground" />
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                <FileText className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
            <div className="absolute top-2 left-2">
              <Badge variant="outline" className={statusColors[item.status]}>
                {item.status}
              </Badge>
            </div>
            {item.verificationConfidence !== null && (
              <div className="absolute top-2 right-2 bg-background/90 rounded-md px-1.5 py-0.5 text-[10px] font-medium">
                {Math.round(item.verificationConfidence * 100)}%
              </div>
            )}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-white text-xs truncate">
              {item.description ?? item.fileUrl.split("/").pop()}
            </div>
          </button>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={() => setActive(null)}>
        <DialogContent className="max-w-3xl">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>{active.description ?? "Evidence"}</DialogTitle>
                <DialogDescription>
                  Uploaded by {active.uploadedBy.name} · {formatDateTime(active.uploadedAt)}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-2">
                {active.fileType === "IMAGE" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={active.fileUrl}
                    alt={active.description ?? "Evidence"}
                    className="w-full max-h-[70vh] object-contain rounded-lg"
                  />
                ) : (
                  <a
                    href={active.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-primary underline"
                  >
                    Open file: {active.fileUrl}
                  </a>
                )}
                <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={statusColors[active.status]}>
                      {active.status}
                    </Badge>
                    {active.verificationConfidence !== null && (
                      <span className="text-muted-foreground">
                        Confidence: {Math.round(active.verificationConfidence * 100)}%
                      </span>
                    )}
                  </div>
                  {canReview && (
                    <EvidenceReviewActions evidenceId={active.id} currentStatus={active.status} />
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

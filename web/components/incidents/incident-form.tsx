"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Upload, X, FileText, Film, Loader2 } from "lucide-react";
import {
  createIncidentSchema,
  type CreateIncidentInput,
} from "@/lib/validations/incident";
import { POLLUTION_TYPES, SEVERITY_CONFIG, WATER_BODY_TYPES } from "@/lib/constants";
import type { WaterBodyType } from "@/types";

type WaterBody = { id: string; name: string; type: WaterBodyType };

type Props = {
  waterBodies: WaterBody[];
};

type FileEntry = {
  id: string;
  file: File;
  preview: string | null;
};

export function IncidentForm({ waterBodies }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const form = useForm<CreateIncidentInput>({
    resolver: zodResolver(createIncidentSchema) as never,
    defaultValues: {
      title: "",
      description: "",
      pollutionType: "Chemical",
      severity: "MEDIUM",
      waterBodyId: null,
      location: "",
      latitude: undefined,
      longitude: undefined,
      observedAt: undefined,
      notes: "",
    },
  });

  const onSubmit = async (values: CreateIncidentInput) => {
    setSubmitting(true);
    setUploadProgress(0);
    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          observedAt: values.observedAt ? values.observedAt.toISOString() : undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.data) {
        throw new Error(body?.error?.message ?? "Failed to create incident");
      }
      const incidentId = body.data.id as string;

      if (files.length > 0) {
        let uploaded = 0;
        for (const entry of files) {
          const fd = new FormData();
          fd.append("file", entry.file);
          fd.append("incidentId", incidentId);
          const evRes = await fetch("/api/evidence", { method: "POST", body: fd });
          if (!evRes.ok) {
            const evBody = await evRes.json().catch(() => ({}));
            toast.error(`Upload failed for ${entry.file.name}`, {
              description: evBody?.error?.message,
            });
          }
          uploaded += 1;
          setUploadProgress(Math.round((uploaded / files.length) * 100));
        }
      }

      toast.success("Incident reported", {
        description: "Your report has been submitted and the AI analysis is running.",
      });
      router.push(`/incidents/${incidentId}`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create incident";
      toast.error("Could not submit report", { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList) return;
    const entries: FileEntry[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const isImage = file.type.startsWith("image/");
      entries.push({
        id: `${file.name}-${i}-${Date.now()}`,
        file,
        preview: isImage ? URL.createObjectURL(file) : null,
      });
    }
    setFiles((prev) => [...prev, ...entries]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        form.setValue("latitude", pos.coords.latitude, { shouldValidate: true });
        form.setValue("longitude", pos.coords.longitude, { shouldValidate: true });
        toast.success("Location captured");
      },
      () => toast.error("Could not get your location"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Oil spill near coastal water" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description *</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder="Describe what you observed: color, odor, affected area, wildlife..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="pollutionType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pollution Type *</FormLabel>
                <FormControl>
                  <Select {...field}>
                    {POLLUTION_TYPES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="severity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Severity *</FormLabel>
                <FormControl>
                  <Select {...field}>
                    {Object.entries(SEVERITY_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="waterBodyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Water Body</FormLabel>
              <FormControl>
                <Select
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                >
                  <option value="">— None / Not listed —</option>
                  {waterBodies.map((w) => (
                    <option key={w.id} value={w.id}>
                      {WATER_BODY_TYPES[w.type]} · {w.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormDescription>Select the affected water body if known.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Coastal Bay, Zone B" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="latitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Latitude *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. 51.5074"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="longitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Longitude *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. -0.1278"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={useCurrentLocation}>
            Use my current location
          </Button>
        </div>

        <FormField
          control={form.control}
          name="observedAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date/Time Observed</FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  value={
                    field.value
                      ? new Date(field.value).toISOString().slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    field.onChange(e.target.value ? new Date(e.target.value) : undefined)
                  }
                />
              </FormControl>
              <FormDescription>Leave blank if you observed it just now.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Notes</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  placeholder="Any additional context, witnesses, or safety concerns"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <FormLabel>Evidence</FormLabel>
              <p className="text-xs text-muted-foreground">
                Upload photos, documents, or video. Max 10 MB per file.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("evidence-file-input")?.click()}
              disabled={submitting}
              className="gap-1"
            >
              <Upload className="h-3.5 w-3.5" /> Add files
            </Button>
            <input
              id="evidence-file-input"
              type="file"
              multiple
              accept="image/*,application/pdf,video/mp4,video/quicktime"
              className="hidden"
              onChange={(e) => {
                handleFilesSelected(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {files.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {files.map((entry) => (
                <div
                  key={entry.id}
                  className="relative group rounded-lg border overflow-hidden bg-muted/20 aspect-square"
                >
                  {entry.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={entry.preview} alt={entry.file.name} className="w-full h-full object-cover" />
                  ) : entry.file.type.startsWith("video/") ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                      <Film className="h-8 w-8 text-muted-foreground" />
                      <p className="text-xs truncate mt-1 w-full">{entry.file.name}</p>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <p className="text-xs truncate mt-1 w-full">{entry.file.name}</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(entry.id)}
                    className="absolute top-1 right-1 h-7 w-7 rounded-full bg-background/90 hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center shadow"
                    aria-label={`Remove ${entry.file.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-0 inset-x-0 bg-background/80 px-2 py-1 text-[10px] text-muted-foreground truncate">
                    {entry.file.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={submitting} className="gap-2">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {files.length > 0 && uploadProgress > 0
                  ? `Uploading... ${uploadProgress}%`
                  : "Submitting..."}
              </>
            ) : (
              "Submit Report"
            )}
          </Button>
          <Button type="button" variant="outline" asChild disabled={submitting}>
            <Link href="/incidents">Cancel</Link>
          </Button>
        </div>
      </form>
    </Form>
  );
}

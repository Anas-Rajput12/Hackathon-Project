import { ApiError } from "./errors";

export type UploadResult = {
  url: string;
  publicId?: string;
  width?: number;
  height?: number;
  bytes?: number;
  provider: "cloudinary" | "mock";
};

const ALLOWED_MIME: Record<string, "IMAGE" | "DOCUMENT" | "VIDEO"> = {
  "image/jpeg": "IMAGE",
  "image/png": "IMAGE",
  "image/webp": "IMAGE",
  "image/gif": "IMAGE",
  "application/pdf": "DOCUMENT",
  "video/mp4": "VIDEO",
  "video/quicktime": "VIDEO",
};

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "pdf",
  "mp4",
  "mov",
]);

export function classifyFile(file: File): {
  mime: string;
  evidenceType: "IMAGE" | "DOCUMENT" | "VIDEO";
} {
  const mime = file.type || "application/octet-stream";
  const evidenceType = ALLOWED_MIME[mime];
  if (!evidenceType) {
    throw new ApiError(400, "INVALID_FILE_TYPE", `File type ${mime} is not allowed.`);
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    throw new ApiError(
      400,
      "INVALID_FILE_TYPE",
      `File extension .${ext || "(none)"} is not allowed. Allowed: ${[...ALLOWED_EXTENSIONS].join(", ")}.`
    );
  }
  if (file.size > MAX_BYTES) {
    throw new ApiError(400, "FILE_TOO_LARGE", `File must be under ${MAX_BYTES / 1024 / 1024}MB.`);
  }
  if (file.size === 0) {
    throw new ApiError(400, "EMPTY_FILE", "Uploaded file is empty.");
  }
  return { mime, evidenceType };
}

export async function validateFileContent(file: File, mime = file.type): Promise<void> {
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const startsWith = (...signature: number[]) => signature.every((byte, index) => bytes[index] === byte);
  const hasFtyp = bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;

  const valid =
    (mime === "image/jpeg" && startsWith(0xff, 0xd8, 0xff)) ||
    (mime === "image/png" && startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) ||
    (mime === "image/gif" && (startsWith(0x47, 0x49, 0x46, 0x38, 0x37, 0x61) || startsWith(0x47, 0x49, 0x46, 0x38, 0x39, 0x61))) ||
    (mime === "image/webp" && startsWith(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) ||
    (mime === "application/pdf" && startsWith(0x25, 0x50, 0x44, 0x46, 0x2d)) ||
    ((mime === "video/mp4" || mime === "video/quicktime") && hasFtyp);

  if (!valid) {
    throw new ApiError(400, "INVALID_FILE_CONTENT", "The file contents do not match its declared type.");
  }
}

function cloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

export async function uploadFile(file: File, folder = "aquatrace/evidence"): Promise<UploadResult> {
  const { mime } = classifyFile(file);
  await validateFileContent(file, mime);

  if (cloudinaryConfigured()) {
    return uploadToCloudinary(file, folder);
  }
  if (process.env.NODE_ENV === "production") {
    throw new ApiError(503, "UPLOAD_UNAVAILABLE", "Evidence storage is not configured.");
  }
  return mockUpload(file);
}

async function uploadToCloudinary(file: File, folder: string): Promise<UploadResult> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;
  const timestamp = Math.floor(Date.now() / 1000);

  const signPayload = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signatureBuf = new TextEncoder().encode(signPayload);
  const hashBuf = await crypto.subtle.digest("SHA-1", signatureBuf);
  const signature = Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  form.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
    { method: "POST", body: form }
  );

  if (!res.ok) {
    throw new ApiError(502, "UPLOAD_FAILED", "Evidence storage rejected the upload. Please try again.");
  }

  const json = (await res.json()) as {
    secure_url: string;
    public_id: string;
    width?: number;
    height?: number;
    bytes?: number;
  };

  return {
    url: json.secure_url,
    publicId: json.public_id,
    width: json.width,
    height: json.height,
    bytes: json.bytes,
    provider: "cloudinary",
  };
}

async function mockUpload(file: File): Promise<UploadResult> {
  const id = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const ext = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "bin";
  const url = `/api/evidence/mock/${id}.${ext}`;

  mockUploadStore.set(id, {
    buffer: Buffer.from(await file.arrayBuffer()),
    mime: file.type || "application/octet-stream",
  });

  return {
    url,
    publicId: id,
    bytes: file.size,
    provider: "mock",
  };
}

type MockEntry = { buffer: Buffer; mime: string };
export const mockUploadStore = new Map<string, MockEntry>();

export function getMockUpload(id: string): MockEntry | undefined {
  return mockUploadStore.get(id);
}

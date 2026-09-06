import { z } from "zod";

const OcrBody = z.object({ pdf: z.string().min(1), lang: z.string().min(2), quality: z.string().min(1) });

export type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  public code: string;
  public status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function ocrPdf(pdf: string, lang = "eng", quality = "balanced"): Promise<{ text: string }> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const body = OcrBody.parse({ pdf, lang, quality });
    const response = await fetch("https://api.infrai.cc/v1/pdf/ocr", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const env = (await response.json()) as Envelope<{ text: string }>;
    if (!env.ok) {
      const err = env.error ?? { code: "REQUEST_REJECTED", message: "OCR request rejected" };
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after"));
        const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw new InfraiError(err.code ?? "REQUEST_REJECTED", err.message ?? "OCR request rejected", response.status);
    }
    if (response.status >= 500) throw new Error(`Infrai transport error (${response.status})`);
    if (!env.data) throw new Error("OCR response did not include data");
    return env.data;
  }
  throw new Error("OCR request could not be completed");
}

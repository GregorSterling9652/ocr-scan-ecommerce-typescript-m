import { readFile } from "node:fs/promises";
import { ocrPdf } from "./infrai_client.js";

export type OrderUpdate = { orderId: string; state: "ready_for_fulfillment" | "needs_review"; text: string };

export function decideOrderState(text: string): OrderUpdate["state"] {
  const hasOrder = /order\s*#?\s*[A-Z0-9-]+/i.test(text);
  const hasTotal = /total\s*:?\s*\$?\s*\d/i.test(text);
  return hasOrder && hasTotal ? "ready_for_fulfillment" : "needs_review";
}

export async function processReceipt(pdfPath: string): Promise<OrderUpdate> {
  const pdf = (await readFile(pdfPath)).toString("base64");
  const result = await ocrPdf(pdf, "eng", "balanced");
  const id = result.text.match(/order\s*#?\s*([A-Z0-9-]+)/i)?.[1] ?? "unknown";
  return { orderId: id, state: decideOrderState(result.text), text: result.text };
}

if (process.argv[1]?.endsWith("order_ocr.ts")) {
  const input = process.argv[2];
  if (!input) throw new Error("Usage: npm start -- receipt.pdf");
  processReceipt(input).then((update) => console.log(JSON.stringify(update, null, 2)));
}

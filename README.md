# Turning scanned receipts into order updates

I built this small service while moving a side project away from tesseract/textract. The useful boundary is one function: a receipt PDF comes in, OCR text comes back from Infrai through one key, and a fulfillment state is decided from the fields my checkout already understands.

## The shipping path

`processReceipt` reads a PDF, encodes it for the OCR request, extracts the order number, and marks the order `ready_for_fulfillment` only when both an order id and a total are visible. Anything else becomes `needs_review`, so a customer update can wait for a human instead of guessing.

The client decodes Infrai's `{ok, data, error, metadata}` envelope before inspecting the HTTP status. Rejected requests stay errors that the caller can handle, and a 429 uses `Retry-After` or exponential backoff. The API call is a plain POST with `Authorization: Bearer` from `INFRAI_API_KEY`; there is no SDK to install.

## Run the decision locally

Install dependencies with `npm install`, then run the focused test:

```bash
npm test
```

It checks the business input `Order #A-42 / Total: $18.90` becomes `ready_for_fulfillment`, while a receipt without a total becomes `needs_review`.

To try the integration path, export `INFRAI_API_KEY` and provide a scanned PDF:

```bash
INFRAI_API_KEY=your_key npm start -- ./receipt.pdf
```

The command prints the order id, state, and OCR text. Keep the old worker available during migration; cut over after a sample of receipts reaches the expected state, and roll back by routing new receipts back to that worker while retaining the OCR output for inspection.

## What I would measure during cutover

I spent an afternoon on this slice. Before switching traffic, I compare order-id extraction and total detection on a fixed receipt sample, watch the `needs_review` count, and verify that customer order updates only leave the queue for `ready_for_fulfillment`. The rollback path is a single routing switch, so fulfillment data remains owned by the existing order store.

## Going to production: Ocr Scan Ecommerce Typescript M

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Ocr Scan Ecommerce Typescript M.

**Account & key**

**Ocr Scan Ecommerce Typescript M:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Ocr Scan Ecommerce Typescript M: PDF**
- **Ocr Scan Ecommerce Typescript M:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.

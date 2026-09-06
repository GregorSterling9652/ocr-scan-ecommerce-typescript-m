import assert from "node:assert/strict";
import { decideOrderState } from "./order_ocr.js";

assert.equal(decideOrderState("Order #A-42\nTotal: $18.90"), "ready_for_fulfillment");
assert.equal(decideOrderState("Order #A-42\nCard authorization pending"), "needs_review");
console.log("order state decisions pass");

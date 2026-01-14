import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkAndDeductCredits } from "../../_lib/creditService.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).send("method_not_allowed");
    return;
  }

  let body: any = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).send("invalid_json");
      return;
    }
  }

  const cost = Number(body?.cost);
  if (!Number.isFinite(cost) || cost <= 0) {
    res.status(400).json({ message: "invalid_cost" });
    return;
  }

  const creditResult = await checkAndDeductCredits(req, res, cost);
  if (!creditResult.allowed) {
    res.status(creditResult.status || 402).json({
      message: creditResult.message || "Credits required",
      error: "credit_limit",
      currentCredits: creditResult.currentCredits,
    });
    return;
  }

  res.status(200).json({ credits: creditResult.currentCredits });
}

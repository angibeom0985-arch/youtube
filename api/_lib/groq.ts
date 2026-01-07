export type GroqLabel = "normal" | "suspicious" | "abusive";

export type GroqDecision = {
  label: GroqLabel;
  score: number;
  reason: string;
};

type GroqInput = {
  ipHash: string | null;
  userAgent: string;
  browser: string;
  os: string;
  fingerprintHash: string | null;
  metrics: Record<string, number>;
};

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const clampScore = (value: number) => Math.max(0, Math.min(100, value));

const fallbackDecision = (input: GroqInput): GroqDecision => {
  const { metrics } = input;
  const ipCount = metrics.eventsByIp24h || 0;
  const fpCount = metrics.eventsByFingerprint24h || 0;
  const total = metrics.totalEvents24h || 0;

  if (ipCount >= 200 || fpCount >= 300 || total >= 500) {
    return {
      label: "abusive",
      score: 90,
      reason: "High volume of requests within 24h window.",
    };
  }

  if (ipCount >= 50 || fpCount >= 80 || total >= 200) {
    return {
      label: "suspicious",
      score: 65,
      reason: "Repeated requests detected within 24h window.",
    };
  }

  return {
    label: "normal",
    score: 10,
    reason: "No strong abuse signals detected.",
  };
};

const parseDecision = (raw: string): GroqDecision | null => {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as Partial<GroqDecision>;
    if (!parsed.label || !parsed.reason) return null;
    if (parsed.score === undefined || parsed.score === null) return null;
    if (!(["normal", "suspicious", "abusive"] as string[]).includes(parsed.label)) {
      return null;
    }
    return {
      label: parsed.label as GroqLabel,
      score: clampScore(Number(parsed.score)),
      reason: String(parsed.reason),
    };
  } catch (error) {
    return null;
  }
};

export const classifyWithGroq = async (input: GroqInput) => {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || "llama-3.1-70b-versatile";

  if (!apiKey) {
    return {
      decision: fallbackDecision(input),
      raw: "",
      model,
      source: "fallback" as const,
    };
  }

  const systemPrompt =
    "You are a risk analyst for abuse detection. " +
    "Classify the request as normal, suspicious, or abusive. " +
    "Return STRICT JSON: {\"label\":\"normal|suspicious|abusive\",\"score\":0-100,\"reason\":\"short explanation\"}.";

  const userPrompt = {
    ipHash: input.ipHash,
    userAgent: input.userAgent,
    browser: input.browser,
    os: input.os,
    fingerprintHash: input.fingerprintHash,
    metrics: input.metrics,
    guidance: {
      suspiciousSignals: [
        "High request volume from same IP or fingerprint",
        "Multiple fingerprints per IP",
        "Multiple IPs per fingerprint",
      ],
    },
  };

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 256,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(userPrompt) },
      ],
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    return {
      decision: fallbackDecision(input),
      raw,
      model,
      source: "fallback" as const,
    };
  }

  try {
    const data = JSON.parse(raw) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data?.choices?.[0]?.message?.content || "";
    const parsed = parseDecision(content);
    if (!parsed) {
      return {
        decision: fallbackDecision(input),
        raw: content,
        model,
        source: "fallback" as const,
      };
    }

    return { decision: parsed, raw: content, model, source: "groq" as const };
  } catch (error) {
    return {
      decision: fallbackDecision(input),
      raw,
      model,
      source: "fallback" as const,
    };
  }
};

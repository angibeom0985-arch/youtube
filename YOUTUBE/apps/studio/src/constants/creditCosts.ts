export const CREDIT_COSTS = {
  SEARCH: 5,
  ANALYZE_TRANSCRIPT: 1,
  GENERATE_IDEAS: 1,
  REFORMAT_TOPIC: 1,
  GENERATE_SCRIPT: 10,
  GENERATE_IMAGE: 5,
  TTS_PER_10_CHARS: 1,
} as const;

export const formatCreditLabel = (cost: number): string => `${cost} 农饭调`;

export const formatCreditButtonLabel = (cost: number): string => `? ${formatCreditLabel(cost)}`;

export const formatCreditPer10CharsButtonLabel = (costPer10Chars: number): string =>
  `? ${costPer10Chars} 农饭调/10磊`;
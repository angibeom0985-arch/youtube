export const CREDIT_COSTS = {
  SEARCH: 5,
  ANALYZE_TRANSCRIPT: 1,
  GENERATE_IDEAS: 1,
  REFORMAT_TOPIC: 1,
  GENERATE_SCRIPT: 10,
  GENERATE_IMAGE: 5,
  TTS_PER_10_CHARS: 1,
} as const;

const KR_CREDIT = "\uD06C\uB808\uB52F";
const BOLT = "\u26A1";
const TEN_CHARS = "10\uC790";

export const formatCreditLabel = (cost: number): string => `${cost} ${KR_CREDIT}`;

export const formatCreditButtonLabel = (cost: number): string =>
  `${BOLT} ${formatCreditLabel(cost)}`;

export const formatCreditPer10CharsButtonLabel = (costPer10Chars: number): string =>
  `${BOLT} ${costPer10Chars} ${KR_CREDIT}/${TEN_CHARS}`;

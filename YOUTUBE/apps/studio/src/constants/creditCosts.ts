export const CREDIT_COSTS = {
  SEARCH: 5,
  ANALYZE_TRANSCRIPT: 1,
  GENERATE_IDEAS: 1,
  REFORMAT_TOPIC: 0,
  GENERATE_SCRIPT: 10,
  GENERATE_IMAGE: 5,
  TTS_PER_10_CHARS: 1,
} as const;

const BOLT = "⚡";
const KR_CREDIT = "\uD06C\uB808\uB527"; // 크레딧
const TEN_CHARS = "\u0031\u0030\uC790"; // 10자

const normalizeCreditText = (value: string): string =>
  value.replace(
    /(?:\uD06C\uB808\uB529|\uD06C\uB808\uB52F|\uD06C\uB808\uB51B|\uD06C\uB808\uB528|\uB52F)/g,
    KR_CREDIT
  );

export const formatCreditLabel = (cost: number): string =>
  normalizeCreditText(`${cost} ${KR_CREDIT}`);

export const formatCreditButtonLabel = (cost: number): string =>
  normalizeCreditText(`${BOLT} ${formatCreditLabel(cost)}`);

export const formatCreditPer10CharsButtonLabel = (costPer10Chars: number): string =>
  normalizeCreditText(`${BOLT} ${costPer10Chars} ${KR_CREDIT}/${TEN_CHARS}`);

type BillingLabelOptions = {
  couponBypass?: boolean;
};

export const withCreditLabel = (
  baseLabel: string,
  cost: number,
  options?: BillingLabelOptions
): string => {
  if (options?.couponBypass) return baseLabel;
  return `${baseLabel} (${formatCreditButtonLabel(cost)})`;
};

export const withCreditPer10CharsLabel = (
  baseLabel: string,
  costPer10Chars: number,
  options?: BillingLabelOptions
): string => {
  if (options?.couponBypass) return baseLabel;
  return `${baseLabel} (${formatCreditPer10CharsButtonLabel(costPer10Chars)})`;
};

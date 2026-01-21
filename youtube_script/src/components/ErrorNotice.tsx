import React, { useMemo, useState } from "react";
import { FiCopy, FiCheckCircle } from "react-icons/fi";

type ErrorNoticeProps = {
  error: string | null;
  context: string;
};

const buildCreatorMessage = (error: string, context: string) => {
  const page =
    typeof window !== "undefined" ? window.location.href : "페이지 정보를 확인할 수 없습니다.";
  const agent =
    typeof navigator !== "undefined"
      ? navigator.userAgent
      : "브라우저 정보를 확인할 수 없습니다.";
  const timestamp = new Date().toISOString();

  return [
    "오류 제보",
    "",
    "[발생 단계]",
    context,
    "",
    "[오류 메시지]",
    error,
    "",
    "[환경]",
    `페이지: ${page}`,
    `브라우저: ${agent}`,
    `시간: ${timestamp}`,
  ].join("\n");
};

const copyToClipboard = async (text: string) => {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
};

const ErrorNotice: React.FC<ErrorNoticeProps> = ({ error, context }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const creatorMessage = useMemo(
    () => (error ? buildCreatorMessage(error, context) : ""),
    [error, context]
  );

  if (!error) return null;

  const handleCopy = async (text: string, key: string) => {
    try {
      await copyToClipboard(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2000);
    } catch (copyError) {
      console.error("Clipboard copy failed:", copyError);
    }
  };

  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
      <div className="rounded-xl border border-red-500/20 bg-black/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-red-200">오류 메시지</p>
          <button
            type="button"
            onClick={() => handleCopy(creatorMessage, "error")}
            className="inline-flex items-center gap-2 rounded-full border border-red-400/30 px-3 py-1 text-xs font-semibold text-red-200 hover:border-red-300"
          >
            {copiedKey === "error" ? <FiCheckCircle /> : <FiCopy />}
            {copiedKey === "error" ? "복사됨" : "복사"}
          </button>
        </div>
        <pre className="mt-2 whitespace-pre-wrap text-sm text-red-100/90">
          {creatorMessage}
        </pre>
      </div>
    </div>
  );
};

export default ErrorNotice;

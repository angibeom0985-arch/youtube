import React from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";

type Tone = "red" | "orange" | "purple" | "yellow";

const toneStyles: Record<Tone, string> = {
  red: "border-red-500/40 text-red-200 hover:border-red-400 hover:text-red-100 bg-red-500/10 hover:bg-red-500/20 shadow-[0_6px_18px_rgba(239,68,68,0.25)]",
  orange:
    "border-orange-500/40 text-orange-200 hover:border-orange-400 hover:text-orange-100 bg-orange-500/10 hover:bg-orange-500/20 shadow-[0_6px_18px_rgba(249,115,22,0.25)]",
  purple:
    "border-purple-500/40 text-purple-200 hover:border-purple-400 hover:text-purple-100 bg-purple-500/10 hover:bg-purple-500/20 shadow-[0_6px_18px_rgba(168,85,247,0.25)]",
  yellow:
    "border-yellow-400/40 text-yellow-200 hover:border-yellow-300 hover:text-yellow-100 bg-yellow-500/10 hover:bg-yellow-500/20 shadow-[0_6px_18px_rgba(234,179,8,0.25)]",
};

type HomeBackButtonProps = {
  tone?: Tone;
  className?: string;
  to?: string;
};

const HomeBackButton: React.FC<HomeBackButtonProps> = ({
  tone = "red",
  className = "",
  to = "/",
}) => {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 ${toneStyles[tone]} ${className}`}
    >
      <FiArrowLeft />
      <span>홈으로 돌아가기</span>
    </Link>
  );
};

export default HomeBackButton;

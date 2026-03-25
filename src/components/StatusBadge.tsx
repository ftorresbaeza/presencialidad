"use client";

import { StatusCode, STATUS_LABELS, STATUS_BADGE_COLORS } from "@/lib/constants";

interface StatusBadgeProps {
  status: StatusCode;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const sizeClass = size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1";
  return (
    <span
      className={`inline-flex items-center rounded border font-medium ${sizeClass} ${STATUS_BADGE_COLORS[status]}`}
    >
      {status}
    </span>
  );
}

export function StatusLabel({ status }: { status: StatusCode }) {
  return (
    <span className="text-xs text-gray-600">{STATUS_LABELS[status]}</span>
  );
}

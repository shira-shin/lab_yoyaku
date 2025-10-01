"use client";

import clsx from "clsx";
import { useCallback, useState } from "react";

type Props = {
  value: string;
  className?: string;
  buttonLabel?: string;
};

export default function CopyableCode({ value, className, buttonLabel = "コピー" }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!value) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("copy failed", error);
    }
  }, [value]);

  return (
    <div className={clsx("flex items-center gap-2", className)}>
      <span className="font-mono text-sm break-all text-gray-800">{value}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 border border-gray-200 transition"
      >
        {copied ? "コピー済" : buttonLabel}
      </button>
    </div>
  );
}

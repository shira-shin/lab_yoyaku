"use client";

import PrimaryButton from "@/components/ui/PrimaryButton";
import SecondaryButton from "@/components/ui/SecondaryButton";
import Link from "next/link";

export type SubmitBarProps = {
  onSubmit: () => void;
  submitLabel?: string;
  cancelHref?: string;
  loading?: boolean;
  disabled?: boolean;
};

export default function SubmitBar({
  onSubmit,
  submitLabel = "登録",
  cancelHref = "/devices",
  loading = false,
  disabled = false,
}: SubmitBarProps) {
  return (
    <div
      className="
        sticky bottom-0 z-40
        mt-10 -mx-4 md:mx-0
        border-t bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70
      "
      role="region"
      aria-label="フォーム操作"
    >
      <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-end gap-3">
        <Link href={cancelHref} aria-label="キャンセルして一覧へ戻る">
          <SecondaryButton type="button">キャンセル</SecondaryButton>
        </Link>
        <PrimaryButton
          type="button"
          onClick={onSubmit}
          loading={loading}
          disabled={disabled}
          aria-label={submitLabel}
        >
          {submitLabel}
        </PrimaryButton>
      </div>
    </div>
  );
}

"use client";
export default function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div
      className="animate-spin rounded-full border-4 border-primary border-t-transparent"
      style={{ width: size, height: size }}
    />
  );
}

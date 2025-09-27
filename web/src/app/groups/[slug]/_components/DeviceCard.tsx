"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type DeviceInfo = {
  id: string;
  name: string;
  slug?: string;
  href?: string;
};

type Props = {
  device: DeviceInfo;
  onReserve: () => void;
  onDelete: () => void;
  onShowQR: () => void;
};

export function DeviceCard({ device, onReserve, onDelete, onShowQR }: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="rounded-xl border p-4 flex items-center justify-between">
      <div>
        {device.href ? (
          <Link href={device.href} className="font-semibold hover:underline">
            {device.name}
          </Link>
        ) : (
          <div className="font-semibold">{device.name}</div>
        )}
        <div className="text-xs text-gray-500">ID: {device.id}</div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onReserve}
          className="px-3 py-2 rounded bg-blue-600 text-white"
        >
          予約
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen((value) => !value)}
            className="w-9 h-9 rounded-full border flex items-center justify-center"
            aria-label="メニュー"
            aria-haspopup="menu"
            aria-expanded={open}
          >
            ︙
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-40 rounded-xl bg-white shadow ring-1 ring-black/10 overflow-hidden z-10">
              <button
                onClick={() => {
                  setOpen(false);
                  onShowQR();
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50"
              >
                QRコード
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  if (window.confirm("この機器を削除しますか？")) onDelete();
                }}
                className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600"
              >
                削除
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

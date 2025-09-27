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
  canManage: boolean;
};

export function DeviceCard({ device, onReserve, onDelete, onShowQR, canManage }: Props) {
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
    <div className="rounded-2xl border bg-white shadow-sm hover:shadow-md transition p-4 flex items-center justify-between gap-4">
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
            機器
          </span>
          {device.href ? (
            <Link href={device.href} className="font-semibold truncate hover:text-indigo-600">
              {device.name}
            </Link>
          ) : (
            <h3 className="font-semibold truncate">{device.name}</h3>
          )}
        </div>
        <div className="text-xs text-gray-500 truncate">ID: {device.id}</div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onReserve}
          className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
        >
          予約
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="w-10 h-10 rounded-full border bg-white hover:bg-gray-50 flex items-center justify-center text-lg"
            aria-label="その他の操作"
            aria-haspopup="menu"
            aria-expanded={open}
          >
            ︙
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-44 rounded-xl bg-white shadow ring-1 ring-black/10 overflow-hidden z-10 text-sm" role="menu">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onShowQR();
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50"
              >
                QRコード
              </button>
              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (window.confirm("この機器を削除しますか？")) onDelete();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600"
                >
                  削除
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useRef, useState } from "react";

type Props = {
  iconSrc: string;
  qrDataUrl: string;
  title: string;
  code: string;
  note?: string;
  cardWidthPx?: number;
};

function getSafeFileName(text: string) {
  return text.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 64) || "qr-card";
}

function toAbsoluteUrl(src: string) {
  if (typeof window === "undefined") return src;
  if (/^data:/i.test(src)) return src;
  return new URL(src, window.location.href).toString();
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    if (!/^data:/i.test(src)) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function getRect(target: HTMLElement, base: DOMRect) {
  const rect = target.getBoundingClientRect();
  return {
    x: rect.left - base.left,
    y: rect.top - base.top,
    width: rect.width,
    height: rect.height,
  };
}

function parseNumber(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function PrintableQrCard({
  iconSrc,
  qrDataUrl,
  title,
  code,
  note,
  cardWidthPx = 680,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    const card = cardRef.current;
    if (!card) return;
    setDownloading(true);

    try {
      const rect = card.getBoundingClientRect();
      const scale = Math.max(2, Math.min(3, window.devicePixelRatio || 2));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(rect.width * scale);
      canvas.height = Math.round(rect.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas not supported");

      ctx.scale(scale, scale);

      const computed = window.getComputedStyle(card);
      const borderRadius = parseNumber(computed.borderTopLeftRadius, 24);
      const borderWidth = parseNumber(computed.borderTopWidth, 1);
      const borderColor = computed.borderTopColor || "#e5e7eb";
      const backgroundColor = computed.backgroundColor || "#ffffff";

      drawRoundedRect(ctx, 0, 0, rect.width, rect.height, borderRadius);
      ctx.fillStyle = backgroundColor;
      ctx.fill();
      if (borderWidth > 0) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        ctx.stroke();
      }

      const iconElement = card.querySelector<HTMLElement>("[data-qr-card-icon]");
      const qrElement = card.querySelector<HTMLElement>("[data-qr-card-code]");
      const titleElement = card.querySelector<HTMLElement>("[data-qr-card-title]");
      const codeElement = card.querySelector<HTMLElement>("[data-qr-card-slug]");
      const noteElement = card.querySelector<HTMLElement>("[data-qr-card-note]");
      const watermarkElement = card.querySelector<HTMLElement>("[data-qr-card-watermark]");

      const paddingLeft = parseNumber(computed.paddingLeft, 20);
      const paddingRight = parseNumber(computed.paddingRight, 20);

      if (iconElement) {
        const iconRect = getRect(iconElement, rect);
        const icon = await loadImage(toAbsoluteUrl(iconSrc));
        ctx.drawImage(icon, iconRect.x, iconRect.y, iconRect.width, iconRect.height);
      }

      if (qrElement) {
        const qrRect = getRect(qrElement, rect);
        const qr = await loadImage(toAbsoluteUrl(qrDataUrl));
        ctx.drawImage(qr, qrRect.x, qrRect.y, qrRect.width, qrRect.height);
      }

      const maxTextWidth = rect.width - paddingLeft - paddingRight;
      const drawText = (element: HTMLElement | null) => {
        if (!element) return;
        const text = element.textContent?.trim();
        if (!text) return;
        const style = window.getComputedStyle(element);
        const fontSize = parseNumber(style.fontSize, 18);
        const fontWeight = style.fontWeight || "400";
        const fontFamily = style.fontFamily || "system-ui, sans-serif";
        const lineHeightRaw = style.lineHeight === "normal" ? `${fontSize * 1.3}` : style.lineHeight;
        const lineHeight = parseNumber(lineHeightRaw, fontSize * 1.3);
        const color = style.color || "#111827";
        const rectInfo = getRect(element, rect);

        const words = text.split(/\s+/).filter(Boolean);
        const lines: string[] = [];
        let current = "";

        const fontValue = `${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.font = fontValue;
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        const availableWidth = Math.min(rectInfo.width || maxTextWidth, maxTextWidth);

        if (words.length === 0) {
          lines.push(text);
        } else {
          for (const word of words) {
            const tentative = current ? `${current} ${word}` : word;
            const measure = ctx.measureText(tentative);
            if (measure.width <= availableWidth || !current) {
              current = tentative;
            } else {
              lines.push(current);
              current = word;
            }
          }
          if (current) lines.push(current);
        }

        const centerX = rectInfo.x + rectInfo.width / 2;
        let offsetY = rectInfo.y;
        lines.forEach((line) => {
          ctx.fillText(line, centerX, offsetY);
          offsetY += lineHeight;
        });
      };

      drawText(titleElement);
      drawText(codeElement);
      drawText(noteElement);
      drawText(watermarkElement);

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${getSafeFileName(title)}.png`;
      link.click();
    } catch (error) {
      console.error("download failed", error);
    } finally {
      setDownloading(false);
    }
  }, [iconSrc, qrDataUrl, title]);

  return (
    <div className="space-y-3">
      <div
        ref={cardRef}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 print:shadow-none"
        style={{ width: cardWidthPx }}
      >
        <div className="grid grid-cols-2 gap-6 items-center" data-qr-card-grid>
          <div className="flex justify-center">
            <div className="w-40 h-40 sm:w-48 sm:h-48">
              <img
                src={iconSrc}
                alt="Lab Yoyaku Icon"
                className="h-full w-full object-contain"
                data-qr-card-icon
              />
            </div>
          </div>

          <div className="flex justify-center">
            <img
              src={qrDataUrl}
              alt="QR Code"
              className="w-44 h-44 sm:w-52 sm:h-52"
              data-qr-card-code
            />
          </div>
        </div>

        <div className="mt-6 text-center space-y-1" data-qr-card-text>
          <div className="text-xl font-semibold tracking-wide" data-qr-card-title>
            {title}
          </div>
          <div className="mt-1 flex items-center justify-center gap-2">
            <code className="text-sm text-gray-700 break-all select-all" data-qr-card-slug>
              {code}
            </code>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(code)}
              className="text-xs px-2 py-1 rounded border bg-gray-50 hover:bg-gray-100"
              aria-label="コードをコピー"
            >
              コピー
            </button>
          </div>
          {note ? (
            <div className="text-xs text-gray-400" data-qr-card-note>
              {note}
            </div>
          ) : null}
        </div>

        <div
          className="mt-4 text-[11px] text-gray-400 text-center select-none"
          data-qr-card-watermark
        >
          ラボ予約 — Lab Yoyaku
        </div>
      </div>

      <div className="flex gap-2 print:hidden">
        <button
          className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200"
          onClick={() => window.print()}
        >
          印刷する
        </button>
        <button
          className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? "画像生成中..." : "PNGで保存"}
        </button>
      </div>
    </div>
  );
}

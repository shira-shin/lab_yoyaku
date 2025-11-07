'use client';

import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { deviceBg, deviceBgPast, deviceColor } from '@/lib/color';
import {
  formatUtcInAppTz,
  isPastUtc,
  localDayRange,
  overlapsLocalDay,
  utcIsoToLocalDate,
} from '@/lib/time';

export type Span = {
  id: string;
  name: string; // 表示用名称（機器名など）
  startsAtUTC: string;
  endsAtUTC: string;
  start: Date;
  end: Date;
  groupSlug: string;
  by: string;
  device: { id: string; name: string } | null;
  participants?: string[];
  color?: string;
};

const MAX_PER_CELL = 3;
const pad = (n: number) => n.toString().padStart(2, '0');
const short = (s: string, len = 16) => (s.length <= len ? s : `${s.slice(0, len - 1)}…`);
const toYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const formatTimeOnly = (iso: string) =>
  formatUtcInAppTz(iso, {
    month: undefined,
    day: undefined,
    hour: '2-digit',
    minute: '2-digit',
  });

function labelForDay(cell: Date, startIso: string, endIso: string) {
  const key = toYmd(cell);
  const { start, end } = localDayRange(key);
  const startLocal = utcIsoToLocalDate(startIso);
  const endLocal = utcIsoToLocalDate(endIso);
  const from = startLocal.getTime() <= start.getTime() ? '00:00' : formatTimeOnly(startIso);
  const to = endLocal.getTime() >= end.getTime() ? '24:00' : formatTimeOnly(endIso);
  return `${from}→${to}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type Density = 'compact' | 'standard';
const DENSITY_STORAGE_KEY = 'calendar-density';

function useDensity(): [Density, () => void] {
  const [density, setDensity] = useState<Density>(() => {
    if (typeof window === 'undefined') return 'compact';
    const stored = window.localStorage.getItem(DENSITY_STORAGE_KEY);
    return stored === 'standard' ? 'standard' : 'compact';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(DENSITY_STORAGE_KEY, density);
  }, [density]);

  const toggle = () => setDensity((prev) => (prev === 'compact' ? 'standard' : 'compact'));
  return [density, toggle];
}

export default function CalendarWithBars({
  weeks,
  month,
  spans,
  onSelectDate,
  showModal = true,
  selectedDate,
  groupSlug,
}: {
  weeks: Date[][];
  month: number;
  spans: Span[];
  onSelectDate?: (d: Date) => void;
  showModal?: boolean;
  selectedDate?: Date | null;
  groupSlug?: string;
}) {
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [highlightDeviceId, setHighlightDeviceId] = useState<string | null>(null);
  const [density, toggleDensity] = useDensity();

  const today = new Date();

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Span[]>();
    weeks.flat().forEach((day) => {
      const key = toYmd(day);
      const items = spans
        .filter((span) => overlapsLocalDay(span.startsAtUTC, span.endsAtUTC, key))
        .sort(
          (a, b) =>
            utcIsoToLocalDate(a.startsAtUTC).getTime() -
            utcIsoToLocalDate(b.startsAtUTC).getTime(),
        );
      map.set(key, items);
    });
    return map;
  }, [weeks, spans]);

  const legendDevices = useMemo(() => {
    const map = new Map<string, string>();
    spans.forEach((span) => {
      if (span.device) {
        map.set(span.device.id, span.device.name);
      }
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [spans]);

  const eventTextClass = density === 'compact' ? 'text-[11px]' : 'text-[13px]';
  const eventPaddingClass = density === 'compact' ? 'py-0.5' : 'py-1.5';
  const eventSpacingClass = density === 'compact' ? 'space-y-1' : 'space-y-2';
  const cellHeightClass = density === 'compact' ? 'min-h-[110px]' : 'min-h-[140px]';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {legendDevices.length > 0 && (
            <span className="text-xs text-gray-500">機器レジェンド</span>
          )}
          {legendDevices.map((device) => {
              const active = highlightDeviceId === device.id;
              const color = deviceColor(device.id);
              return (
                <button
                  key={device.id}
                  type="button"
                  onClick={() =>
                    setHighlightDeviceId((prev) => (prev === device.id ? null : device.id))
                  }
                  className={clsx(
                    'flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium transition',
                    active ? 'shadow-sm' : 'opacity-90 hover:opacity-100'
                  )}
                  style={{
                    background: active ? color : deviceBg(device.id),
                    color: active ? '#fff' : '#1f2937',
                    borderColor: color,
                  }}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: color }}
                  />
                  {device.name}
                </button>
              );
          })}
        </div>
        <button
          type="button"
          onClick={toggleDensity}
          className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
        >
          表示：{density === 'compact' ? 'コンパクト' : '標準'}
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weeks.flat().map((day, index) => {
          const key = toYmd(day);
          const todays = eventsByDay.get(key) ?? [];
          const displayEvents = todays.slice(0, MAX_PER_CELL);
          const restCount = todays.length - displayEvents.length;
          const isToday = isSameDay(day, today);
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
          const isSun = day.getDay() === 0;
          const isSat = day.getDay() === 6;
          const isCurrentMonth = day.getMonth() === month;
          const highlightMuted =
            highlightDeviceId !== null &&
            todays.every((event) => event.device?.id !== highlightDeviceId);

          const handleSelect = () => {
            if (showModal) {
              setModalDate(day);
            }
            onSelectDate?.(day);
          };

          const moreClick = (
            event: MouseEvent<HTMLSpanElement> | KeyboardEvent<HTMLSpanElement>,
          ) => {
            event.stopPropagation();
            if ('preventDefault' in event) event.preventDefault();
            if (showModal) {
              setModalDate(day);
            }
            onSelectDate?.(day);
          };

          return (
            <button
              key={`${key}-${index}`}
              type="button"
              className={clsx(
                'relative flex w-full flex-col rounded-xl border bg-white p-2 text-left shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
                cellHeightClass,
                !isCurrentMonth && 'bg-gray-50 text-gray-400',
                isToday && 'border-blue-500',
                isSelected && 'ring-2 ring-blue-500',
                highlightMuted && 'opacity-40'
              )}
              onClick={handleSelect}
              aria-label={`${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`}
            >
              <div className="flex items-start justify-between text-xs">
                <span
                  className={clsx(
                    'font-semibold',
                    isSun && 'text-red-500',
                    isSat && 'text-blue-500'
                  )}
                >
                  {day.getDate()}
                </span>
                {todays.length > 0 && (
                  <span className="text-[10px] text-gray-400">{todays.length}件</span>
                )}
              </div>

              <div className={clsx('mt-2 flex flex-1 flex-col', eventSpacingClass)}>
                {displayEvents.map((event) => {
                  const color = event.device
                    ? deviceColor(event.device.id)
                    : event.color ?? '#7c3aed';
                  const muted =
                    highlightDeviceId !== null && event.device?.id !== highlightDeviceId;
                  const past = isPastUtc(event.endsAtUTC);
                  const label = `${event.device?.name ?? event.name}（${labelForDay(
                    day,
                    event.startsAtUTC,
                    event.endsAtUTC,
                  )}）`;
                  return (
                    <div
                      key={event.id}
                      className={clsx(
                        'rounded px-1 text-white truncate',
                        eventPaddingClass,
                        eventTextClass,
                        {
                          'opacity-30': muted || past,
                        },
                      )}
                      style={{ background: color }}
                      title={`${formatUtcInAppTz(event.startsAtUTC)} → ${formatUtcInAppTz(event.endsAtUTC)}`}
                    >
                      {short(label, density === 'compact' ? 26 : 36)}
                    </div>
                  );
                })}
              </div>

              {restCount > 0 && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={moreClick}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      moreClick(event);
                    }
                  }}
                  className="mt-2 inline-flex w-fit cursor-pointer items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  +{restCount}件
                </span>
              )}
            </button>
          );
        })}
      </div>

      {showModal && modalDate && (
        <DayModal
          date={modalDate}
          items={(eventsByDay.get(toYmd(modalDate)) ?? []).sort(
            (a, b) =>
              utcIsoToLocalDate(a.startsAtUTC).getTime() -
              utcIsoToLocalDate(b.startsAtUTC).getTime(),
          )}
          onClose={() => setModalDate(null)}
          groupSlug={groupSlug}
        />
      )}
    </div>
  );
}

function DayModal({
  date,
  items,
  onClose,
  groupSlug,
}: {
  date: Date;
  items: Span[];
  onClose: () => void;
  groupSlug?: string;
}) {
  const ymd = toYmd(date);
  const slugForCreate = groupSlug ?? items[0]?.groupSlug;
  const createHref = slugForCreate
    ? `/groups/${encodeURIComponent(slugForCreate)}/day/${ymd}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center">
      <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-lg sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-semibold">{date.getMonth() + 1}月{date.getDate()}日の予定</div>
          <div className="flex items-center gap-2">
            {createHref ? (
              <Link
                href={createHref}
                className="text-xs rounded-md bg-blue-600 px-2 py-1 font-medium text-white hover:bg-blue-500"
              >
                この日に予約を追加
              </Link>
            ) : null}
            <button
              onClick={onClose}
              className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
            >
              閉じる
            </button>
          </div>
        </div>
        {!items.length && (
          <div className="text-sm text-gray-500">この日の予約はありません。</div>
        )}
        <ul className="space-y-3">
          {items.map((event) => {
            const color = event.device
              ? deviceColor(event.device.id)
              : event.color ?? '#7c3aed';
            const past = isPastUtc(event.endsAtUTC);
            const background = event.device
              ? past
                ? deviceBgPast(event.device.id)
                : deviceBg(event.device.id)
              : '#f5f3ff';
            const contentOpacity = past ? 'opacity-30' : undefined;
            return (
              <li
                key={event.id}
                className="overflow-hidden rounded-2xl border"
                style={{ background, borderColor: color }}
              >
                <div className="px-3 py-2 text-sm font-semibold text-white" style={{ background: color }}>
                  {event.device?.name ?? event.name}
                </div>
                <div className={clsx('space-y-1 px-4 py-3 text-sm text-gray-700', contentOpacity)}>
                  <div className="text-base font-semibold text-gray-900">
                    {formatTimeOnly(event.startsAtUTC)} → {formatTimeOnly(event.endsAtUTC)}
                  </div>
                  <div>
                    予約者：<span className="font-medium text-gray-900">{event.by}</span>
                  </div>
                  {event.participants?.length ? (
                    <div className="text-xs text-gray-500">
                      参加者: {event.participants.join(', ')}
                    </div>
                  ) : null}
                  <a
                    href={`/groups/${encodeURIComponent(event.groupSlug)}`}
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                  >
                    グループページへ
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

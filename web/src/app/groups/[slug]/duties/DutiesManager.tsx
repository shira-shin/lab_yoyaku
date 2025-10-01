"use client";

import { FormEventHandler, useCallback, useMemo, useState } from "react";

type DutyTypeOption = { id: string; name: string };
type MemberOption = { id: string; displayName: string; email?: string };

type Props = {
  groupSlug: string;
  dutyTypes: DutyTypeOption[];
  members: MemberOption[];
};

const WEEKDAYS = [
  { value: "0", label: "日" },
  { value: "1", label: "月" },
  { value: "2", label: "火" },
  { value: "3", label: "水" },
  { value: "4", label: "木" },
  { value: "5", label: "金" },
  { value: "6", label: "土" },
];

type Feedback = { type: "success" | "error"; message: string } | null;

export default function DutiesManager({ groupSlug, dutyTypes, members }: Props) {
  const [tab, setTab] = useState<"oneoff" | "weekly">("oneoff");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          className={`px-3 py-1 rounded ${tab === "oneoff" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
          onClick={() => setTab("oneoff")}
        >
          単発追加
        </button>
        <button
          type="button"
          className={`px-3 py-1 rounded ${tab === "weekly" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
          onClick={() => setTab("weekly")}
        >
          週次ルール
        </button>
      </div>

      {tab === "oneoff" ? (
        <OneOffForm groupSlug={groupSlug} dutyTypes={dutyTypes} members={members} />
      ) : (
        <WeeklyRuleForm groupSlug={groupSlug} dutyTypes={dutyTypes} members={members} />
      )}

      <BatchDutyPicker members={members} />
    </div>
  );
}

function FeedbackMessage({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  const color = feedback.type === "success" ? "text-green-600" : "text-red-600";
  return <div className={`text-sm ${color}`}>{feedback.message}</div>;
}

function OneOffForm({ groupSlug, dutyTypes, members }: Props) {
  const [dates, setDates] = useState<string[]>([""]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const hasTypes = dutyTypes.length > 0;

  const addDateField = () => setDates((prev) => [...prev, ""]);
  const updateDate = (index: number, value: string) => {
    setDates((prev) => prev.map((item, i) => (i === index ? value : item)));
  };
  const removeDate = (index: number) => {
    setDates((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFeedback(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const normalizedDates = dates.map((value) => value.trim()).filter(Boolean);
    if (normalizedDates.length === 0) {
      setFeedback({ type: "error", message: "日付を入力してください。" });
      setSubmitting(false);
      return;
    }

    formData.delete("dates");
    normalizedDates.forEach((value) => {
      formData.append("dates", value);
    });

    try {
      const res = await fetch("/api/duties/batch", {
        method: "POST",
        body: formData,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = typeof json?.error === "string" ? json.error : "登録に失敗しました。";
        throw new Error(message);
      }
      setFeedback({ type: "success", message: "当番を追加しました。" });
      form.reset();
      setDates([""]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "登録に失敗しました。";
      setFeedback({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border rounded-xl p-4 bg-white shadow-sm">
      <input type="hidden" name="groupSlug" value={groupSlug} />
      <div>
        <label className="block text-sm font-medium text-gray-700">当番種別</label>
        <select
          name="dutyTypeId"
          required
          defaultValue=""
          disabled={!hasTypes}
          className="mt-1 w-full rounded border px-2 py-1 disabled:bg-gray-100 disabled:text-gray-500"
        >
          <option value="" disabled>
            選択してください
          </option>
          {dutyTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
        {!hasTypes ? (
          <p className="mt-1 text-xs text-red-600">当番種別を作成すると利用できます。</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <span className="block text-sm font-medium text-gray-700">日付</span>
        {dates.map((value, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="date"
              name="dates"
              value={value}
              onChange={(event) => updateDate(index, event.target.value)}
              className="flex-1 rounded border px-2 py-1"
              required={index === 0}
            />
            {dates.length > 1 ? (
              <button
                type="button"
                onClick={() => removeDate(index)}
                className="px-2 py-1 text-xs rounded border"
              >
                削除
              </button>
            ) : null}
          </div>
        ))}
        <button type="button" onClick={addDateField} className="text-sm text-blue-600 hover:underline">
          日付を追加
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">1日の必要枠</label>
        <input
          type="number"
          name="slots"
          min={1}
          defaultValue={1}
          className="mt-1 w-32 rounded border px-2 py-1"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">担当者（任意・複数可）</label>
        <select name="assigneeIds" multiple className="mt-1 w-full rounded border px-2 py-1 h-28">
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.displayName}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">選択された担当者で順番に割り当てられます。</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting || !hasTypes}
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
        >
          {submitting ? "送信中..." : "追加"}
        </button>
        <FeedbackMessage feedback={feedback} />
      </div>
    </form>
  );
}

function BatchDutyPicker({ members }: { members: MemberOption[] }) {
  const submitBatchDuty = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    alert("一括追加の登録は現在準備中です。先に週次ルールまたは単発追加をご利用ください。");
  }, []);

  return (
    <div className="mt-6 p-4 rounded border">
      <div className="font-medium mb-2">複数日/週で当番を追加</div>
      <div className="flex flex-wrap items-center gap-2">
        <input type="week" name="weeks" multiple className="border rounded px-2 py-1" />
        <input type="date" name="days" multiple className="border rounded px-2 py-1" />
        <select name="member" className="border rounded px-2 py-1">
          <option value="">担当者を選択</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.displayName}
            </option>
          ))}
        </select>
        <button className="px-3 py-1.5 rounded bg-blue-600 text-white" onClick={submitBatchDuty}>
          一括追加
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-1">週(YYYY-Www) または日付を複数選択して一括登録します。</p>
    </div>
  );
}

function WeeklyRuleForm({ groupSlug, dutyTypes, members }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const hasMembers = members.length > 0;
  const hasTypes = dutyTypes.length > 0;
  const sortedMembers = useMemo(
    () => members.slice().sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [members],
  );

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFeedback(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const res = await fetch("/api/duties/rules", {
        method: "POST",
        body: formData,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = typeof json?.error === "string" ? json.error : "ルールの保存に失敗しました。";
        throw new Error(message);
      }
      setFeedback({ type: "success", message: "ルールを登録しました。" });
      form.reset();
    } catch (error) {
      const message = error instanceof Error ? error.message : "ルールの保存に失敗しました。";
      setFeedback({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border rounded-xl p-4 bg-white shadow-sm">
      <input type="hidden" name="groupSlug" value={groupSlug} />
      <div>
        <label className="block text-sm font-medium text-gray-700">当番種別</label>
        <select
          name="typeId"
          required
          defaultValue=""
          disabled={!hasTypes}
          className="mt-1 w-full rounded border px-2 py-1 disabled:bg-gray-100 disabled:text-gray-500"
        >
          <option value="" disabled>
            選択してください
          </option>
          {dutyTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
        {!hasTypes ? (
          <p className="mt-1 text-xs text-red-600">当番種別を作成すると利用できます。</p>
        ) : null}
      </div>

      <div>
        <span className="block text-sm font-medium text-gray-700">曜日</span>
        <div className="mt-2 flex flex-wrap gap-3">
          {WEEKDAYS.map((weekday) => (
            <label key={weekday.value} className="inline-flex items-center gap-1 text-sm">
              <input type="checkbox" name="byWeekday" value={weekday.value} />
              <span>{weekday.label}</span>
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-500">チェックした曜日に当番枠を作成します。</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">開始日</label>
          <input type="date" name="startDate" required className="mt-1 w-full rounded border px-2 py-1" />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">終了日</label>
          <input type="date" name="endDate" required className="mt-1 w-full rounded border px-2 py-1" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">1日の必要枠</label>
        <input
          type="number"
          name="slotsPerDay"
          min={1}
          defaultValue={1}
          className="mt-1 w-32 rounded border px-2 py-1"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">担当者プール（任意）</label>
        <select name="includeMemberIds" multiple className="mt-1 w-full rounded border px-2 py-1 h-28">
          {sortedMembers.map((member) => (
            <option key={member.id} value={member.id}>
              {member.displayName}
            </option>
          ))}
        </select>
        {!hasMembers ? (
          <p className="mt-1 text-xs text-gray-500">利用できるメンバーがまだ登録されていません。</p>
        ) : (
          <p className="mt-1 text-xs text-gray-500">選択したメンバーの中から割当対象になります。</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">除外するメンバー（任意）</label>
        <select name="excludeMemberIds" multiple className="mt-1 w-full rounded border px-2 py-1 h-28">
          {sortedMembers.map((member) => (
            <option key={member.id} value={member.id}>
              {member.displayName}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting || !hasTypes}
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60"
        >
          {submitting ? "送信中..." : "ルール追加"}
        </button>
        <FeedbackMessage feedback={feedback} />
      </div>
    </form>
  );
}

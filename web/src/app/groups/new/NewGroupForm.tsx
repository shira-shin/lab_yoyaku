'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createGroupAction, type NewGroupFormState } from './actions';

const initialState: NewGroupFormState = { error: '' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? '作成中…' : 'グループを作る'}
    </button>
  );
}

export default function NewGroupForm() {
  const [state, formAction] = useFormState(createGroupAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <label className="block">
        <div className="mb-1">名称</div>
        <input name="name" className="w-full rounded-xl border p-3" required />
      </label>
      <label className="block">
        <div className="mb-1">パスワード</div>
        <input
          type="password"
          name="password"
          className="w-full rounded-xl border p-3"
          required
        />
      </label>
      <div className="pt-2 space-y-4">
        <label className="block">
          <div className="mb-1">予約開始（任意）</div>
          <input type="datetime-local" name="startAt" className="w-full rounded-xl border p-3" />
        </label>
        <label className="block">
          <div className="mb-1">予約終了（任意）</div>
          <input type="datetime-local" name="endAt" className="w-full rounded-xl border p-3" />
        </label>
        <label className="block">
          <div className="mb-1">メモ（任意）</div>
          <textarea name="memo" className="w-full rounded-xl border p-3" />
        </label>
      </div>
      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}

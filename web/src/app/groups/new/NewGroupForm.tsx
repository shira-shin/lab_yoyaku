'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createGroupAction, type NewGroupFormState } from './actions';
import { Button } from '@/components/ui/Button';

type Props = {
  disabled?: boolean;
  disabledReason?: string | null;
};

const initialState: NewGroupFormState = { error: '' };

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="primary"
      block
      loading={pending}
      disabled={pending || disabled}
      aria-disabled={pending || disabled}
    >
      グループを作る
    </Button>
  );
}

export default function NewGroupForm({ disabled, disabledReason }: Props) {
  const [state, formAction] = useFormState(createGroupAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <fieldset disabled={disabled} className="space-y-5">
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
        <SubmitButton disabled={disabled} />
      </fieldset>
      {(disabledReason || state?.error) && (
        <p className="text-sm text-red-600" role="alert">
          {disabledReason || state.error}
        </p>
      )}
    </form>
  );
}

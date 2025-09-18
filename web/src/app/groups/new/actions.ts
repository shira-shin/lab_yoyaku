'use server';

import { unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation';
import { serverFetch } from '@/lib/http/server-fetch';

export type NewGroupFormState = {
  error?: string;
};

function asNullableString(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = String(value);
  return str ? str : null;
}

export async function createGroupAction(
  _prevState: NewGroupFormState,
  formData: FormData,
): Promise<NewGroupFormState> {
  noStore();

  const name = String(formData.get('name') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const startAt = asNullableString(formData.get('startAt'));
  const endAt = asNullableString(formData.get('endAt'));
  const memo = String(formData.get('memo') ?? '').trim();

  if (!name) {
    return { error: '名称を入力してください' };
  }

  const payload = {
    name,
    password,
    startAt,
    endAt,
    memo,
  };

  const createResponse = await serverFetch('/api/groups', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (createResponse.status === 401) {
    redirect('/login?next=/groups/new');
  }

  let createdJson: any = {};
  try {
    createdJson = await createResponse.json();
  } catch {
    createdJson = {};
  }

  if (createResponse.status === 409) {
    return { error: '同じ URL のグループが既に存在します' };
  }

  if (!createResponse.ok) {
    const message = typeof createdJson?.error === 'string' && createdJson.error
      ? createdJson.error
      : 'グループの作成に失敗しました';
    return { error: message };
  }

  const slugRaw = createdJson?.group?.slug ?? createdJson?.slug ?? '';
  const slug = typeof slugRaw === 'string' ? slugRaw.trim().toLowerCase() : '';
  if (!slug) {
    return { error: 'グループの作成に失敗しました' };
  }

  const joinResponse = await serverFetch('/api/groups/join', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ slug, query: slug, password }),
  });

  if (joinResponse.status === 401) {
    redirect(`/login?next=/groups/${encodeURIComponent(slug)}`);
  }

  let joinJson: any = {};
  try {
    joinJson = await joinResponse.json();
  } catch {
    joinJson = {};
  }

  if (!joinResponse.ok) {
    const message = typeof joinJson?.error === 'string' && joinJson.error
      ? joinJson.error
      : 'グループへの参加に失敗しました';
    return { error: message };
  }

  redirect(`/groups/${encodeURIComponent(slug)}`);
}

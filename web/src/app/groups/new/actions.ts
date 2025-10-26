'use server'

import { redirect } from 'next/navigation'
import { serverFetch } from '@/lib/http/serverFetch'
import { DB_NOT_INITIALIZED_ERROR } from '@/lib/db/constants'

export type NewGroupFormState = {
  error?: string
}

function asNullableString(value: FormDataEntryValue | null) {
  if (value === null) return null
  const str = String(value)
  return str ? str : null
}

async function readError(res: Response, fallback: string) {
  if (res.status === 503) {
    return 'データベースが初期化されていません。管理者に連絡してください。'
  }
  const text = await res.text().catch(() => '')
  if (!text) return fallback
  try {
    const parsed = JSON.parse(text)
    const errorCode = typeof parsed?.error === 'string' ? parsed.error : null
    if (errorCode === DB_NOT_INITIALIZED_ERROR || parsed?.code === DB_NOT_INITIALIZED_ERROR) {
      return 'データベースが初期化されていません。管理者に連絡してください。'
    }
    const message =
      typeof parsed?.error === 'string'
        ? parsed.error
        : typeof parsed?.message === 'string'
        ? parsed.message
        : null
    if (message) return message
  } catch {
    /* ignore */
  }
  return text
}

export async function createGroupAction(
  _prevState: NewGroupFormState,
  formData: FormData,
): Promise<NewGroupFormState> {
  const name = String(formData.get('name') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const startAt = asNullableString(formData.get('startAt'))
  const endAt = asNullableString(formData.get('endAt'))
  const memo = String(formData.get('memo') ?? '').trim()

  if (!name) {
    return { error: '名称を入力してください' }
  }

  const payload = {
    name,
    password,
    startAt,
    endAt,
    memo,
  }

  const createResponse = await serverFetch('/api/groups', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'content-type': 'application/json' },
  })

  if (!createResponse.ok) {
    const message = await readError(createResponse, 'グループの作成に失敗しました')
    return { error: message }
  }

  const created = await createResponse.json().catch(() => ({} as any))
  const slugRaw = created?.group?.slug ?? created?.slug ?? ''
  const slug = typeof slugRaw === 'string' ? slugRaw.trim().toLowerCase() : ''
  if (!slug) {
    return { error: 'グループの作成に失敗しました' }
  }

  const joinResponse = await serverFetch(`/api/groups/${encodeURIComponent(slug)}/join`, {
    method: 'POST',
    body: JSON.stringify({ passcode: password || undefined }),
    headers: { 'content-type': 'application/json' },
  })

  if (!joinResponse.ok) {
    const message = await readError(joinResponse, 'グループへの参加に失敗しました')
    return { error: message }
  }

  redirect(`/groups/${slug}`)
}

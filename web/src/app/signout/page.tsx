import Link from 'next/link'

export default function SignOutPage() {
  return (
    <main className="max-w-md mx-auto py-16 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2">サインアウト</h1>
        <p className="text-sm text-gray-600">
          通常のサインアウトボタンが効かない場合は、下記の直接リンクからお試しください。
        </p>
      </div>

      <form action="/api/auth/signout" method="post" className="space-y-3">
        <input type="hidden" name="callbackUrl" value="/signin" />
        <button
          type="submit"
          className="inline-flex w-full justify-center rounded bg-black px-3 py-2 text-white"
        >
          サインアウト
        </button>
      </form>

      <div className="space-y-2">
        <Link
          href="/api/auth/signout?callbackUrl=/signin"
          className="inline-block w-full rounded bg-black px-3 py-2 text-center text-white"
        >
          サインアウト（直接リンク）
        </Link>
        <p className="text-xs text-gray-500">
          サインアウト後にもう一度ログインする場合は{' '}
          <Link href="/signin" className="text-blue-600 hover:underline">
            ログインページ
          </Link>
          {' '}から再度お試しください。
        </p>
      </div>
    </main>
  )
}

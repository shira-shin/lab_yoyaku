import NewGroupForm from './NewGroupForm';

export default function NewGroupPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">グループ作成</h1>
        <a href="/" className="rounded-lg border px-3 py-2 hover:bg-gray-100">ホームに戻る</a>
      </div>
      <NewGroupForm />
    </main>
  );
}

import Link from "next/link";

export default function ErrorView({
  title,
  detail,
  retryHref,
}: {
  title: string;
  detail?: string;
  retryHref?: string;
}) {
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      {detail && <p className="text-neutral-600">{detail}</p>}
      {retryHref && (
        <Link
          href={retryHref}
          className="inline-block rounded border px-4 py-2 hover:bg-neutral-50"
        >
          戻る
        </Link>
      )}
    </main>
  );
}

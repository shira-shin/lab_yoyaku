import { GenerateDutiesForm } from './GenerateDutiesForm';

export default function Page({ params }: { params: { slug: string } }) {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">当番の自動割当</h1>
        <p className="text-sm text-muted-foreground">グループ: {params.slug}</p>
      </header>

      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <GenerateDutiesForm slug={params.slug} />
      </section>
    </main>
  );
}

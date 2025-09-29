export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import PrintableQrCard from "@/components/qr/PrintableQrCard";
import { absUrl } from "@/lib/url";

async function makeQrDataUrl(value: string) {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(value, { margin: 1, width: 560 });
}

export default async function DeviceQrPage({
  params,
}: { params: { slug: string; deviceSlug: string } }) {
  const groupRes = await fetch(absUrl(`/api/groups/${params.slug}`), { cache: "no-store" });
  const { data: group } = await groupRes.json();

  const devRes = await fetch(absUrl(`/api/groups/${params.slug}/devices/${params.deviceSlug}`), { cache: "no-store" });
  const { data: device } = await devRes.json();

  const targetUrl = absUrl(`/groups/${params.slug}/devices/${params.deviceSlug}`);
  const qrDataUrl = await makeQrDataUrl(targetUrl);

  const deviceCode =
    device?.code ??
    device?.shortCode ??
    device?.deviceCode ??
    device?.publicCode ??
    device?.id ??
    device?.slug ??
    params.deviceSlug;

  const title = device?.name ?? "機器";

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-semibold mb-4">QRコード（{title}）</h1>

      <PrintableQrCard
        // SVG/PNG どちらでも：存在する方に合わせて
        iconSrc="/brand/labyoyaku-icon.svg"
        qrDataUrl={qrDataUrl}
        title={title}
        code={deviceCode}
        note={group?.name ? `グループ：${group.name}` : undefined}
      />
    </div>
  );
}

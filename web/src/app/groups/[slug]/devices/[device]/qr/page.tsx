export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import PrintableQrCard from "@/components/qr/PrintableQrCard";
import { serverFetch } from "@/lib/http/serverFetch";
import { absUrl } from "@/lib/url";
import { notFound, redirect } from "next/navigation";

type GroupResponse = {
  group?: { name?: string } | null;
};

type DeviceResponse = {
  device?: { name?: string | null; slug: string; groupSlug: string } | null;
};

async function makeQrDataUrl(value: string) {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(value, { margin: 1, width: 560 });
}

function buildLoginRedirect(slug: string, device: string) {
  const target = `/groups/${encodeURIComponent(slug)}/devices/${encodeURIComponent(device)}/qr`;
  return `/login?next=${encodeURIComponent(target)}`;
}

export default async function DeviceQrPage({
  params,
}: {
  params: { slug: string; device: string };
}) {
  const { slug, device } = params;

  const groupRes = await serverFetch(`/api/groups/${encodeURIComponent(slug)}`);
  if (groupRes.status === 401) redirect(buildLoginRedirect(slug, device));
  if (groupRes.status === 403) redirect(`/groups/join?slug=${encodeURIComponent(slug)}`);
  if (groupRes.status === 404) return notFound();
  if (!groupRes.ok) redirect(buildLoginRedirect(slug, device));
  const groupJson = (await groupRes.json()) as GroupResponse;
  const groupName = groupJson.group?.name ?? "";

  const deviceRes = await serverFetch(
    `/api/groups/${encodeURIComponent(slug)}/devices/${encodeURIComponent(device)}`
  );
  if (deviceRes.status === 401) redirect(buildLoginRedirect(slug, device));
  if (deviceRes.status === 403) redirect(`/groups/join?slug=${encodeURIComponent(slug)}`);
  if (deviceRes.status === 404) return notFound();
  if (!deviceRes.ok) redirect(buildLoginRedirect(slug, device));
  const deviceJson = (await deviceRes.json()) as DeviceResponse;

  if (!deviceJson.device) return notFound();

  const title = deviceJson.device.name || "機器";
  const code = deviceJson.device.slug;
  const targetUrl = absUrl(
    `/groups/${encodeURIComponent(slug)}/devices/${encodeURIComponent(device)}`
  );
  const qrDataUrl = await makeQrDataUrl(targetUrl);

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">QRコード（{title}）</h1>
        <p className="text-sm text-gray-500 mt-1">
          左にアプリアイコン、右にQRコード、下段に機器名とコード名を表示します。
        </p>
      </div>

      <PrintableQrCard
        iconSrc="/brand/labyoyaku-icon.svg"
        qrDataUrl={qrDataUrl}
        title={title}
        code={code}
        note={groupName ? `グループ：${groupName}` : undefined}
      />

      <p className="text-sm text-gray-500">
        印刷ボタンで紙のカードを出力、PNG保存で画像として共有できます。
      </p>
    </div>
  );
}

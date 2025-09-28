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

// サーバ側でQRのDataURL生成
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
  params: { slug: string; deviceSlug: string };
}) {
  const { slug, deviceSlug } = params;

  const groupRes = await serverFetch(`/api/groups/${encodeURIComponent(slug)}`);
  if (groupRes.status === 401) redirect(buildLoginRedirect(slug, deviceSlug));
  if (groupRes.status === 403) redirect(`/groups/join?slug=${encodeURIComponent(slug)}`);
  if (groupRes.status === 404) return notFound();
  if (!groupRes.ok) redirect(buildLoginRedirect(slug, deviceSlug));
  const groupJson = (await groupRes.json()) as GroupResponse;
  const groupName = groupJson.group?.name ?? "";

  const deviceRes = await serverFetch(
    `/api/groups/${encodeURIComponent(slug)}/devices/${encodeURIComponent(deviceSlug)}`
  );
  if (deviceRes.status === 401) redirect(buildLoginRedirect(slug, deviceSlug));
  if (deviceRes.status === 403) redirect(`/groups/join?slug=${encodeURIComponent(slug)}`);
  if (deviceRes.status === 404) return notFound();
  if (!deviceRes.ok) redirect(buildLoginRedirect(slug, deviceSlug));
  const deviceJson = (await deviceRes.json()) as DeviceResponse;

  if (!deviceJson.device) return notFound();

  const title = deviceJson.device.name || "機器";
  const code = deviceJson.device.slug;
  const targetUrl = absUrl(
    `/groups/${encodeURIComponent(slug)}/devices/${encodeURIComponent(deviceSlug)}`
  );
  const qrDataUrl = await makeQrDataUrl(targetUrl);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-semibold mb-4">QRコード（{title}）</h1>

      <PrintableQrCard
        iconSrc="/brand/labyoyaku-icon.svg"
        qrDataUrl={qrDataUrl}
        title={title}
        code={code}
        note={groupName ? `グループ：${groupName}` : undefined}
      />
    </div>
  );
}

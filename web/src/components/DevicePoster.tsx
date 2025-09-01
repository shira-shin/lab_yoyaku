import { getBaseUrl } from '@/lib/config';
// eslint-disable-next-line import/no-unresolved
const { QRCodeCanvas } = require('qrcode.react');

export default function DevicePoster({ device }: { device: any }) {
  const url = `${getBaseUrl()}/devices/${device.device_uid}?from=qr`;
  return (
    <div className="mx-auto w-[794px] h-[1123px] p-10 border rounded bg-white">
      <h1 className="text-3xl font-bold mb-6">Lab Yoyaku</h1>
      <h2 className="text-2xl font-semibold mb-2">{device.name}</h2>
      <p className="text-neutral-600 mb-6">UID: {device.device_uid}</p>
      <div className="flex items-center gap-10">
        <QRCodeCanvas value={url} size={280} includeMargin />
        <div className="text-sm text-neutral-700 leading-7">
          <p>このQRから予約状況とカレンダーが確認できます。</p>
          <p className="font-medium">URL: {url}</p>
          <p className="mt-4">※利用前にSOP/注意を必ず確認してください。</p>
        </div>
      </div>
      <footer className="mt-16 text-neutral-500">© Lab Yoyaku</footer>
    </div>
  );
}

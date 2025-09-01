import Image from 'next/image';

export default function DevicesPage() {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">機器の管理</h1>
      <p>下の画像をクリックして新しい機器を登録します。</p>
      <a href="/devices/new">
        <Image
          src="https://via.placeholder.com/300x200?text=Register+Device"
          alt="register device"
          width={300}
          height={200}
          className="border rounded"
        />
      </a>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";

type Group = {
  id: string;
  name: string;
  slug: string;
  role?: "OWNER" | "ADMIN" | "MEMBER";
};

// レスポンス正規化ヘルパ
function normalizeGroups(payload: unknown): Group[] {
  if (Array.isArray(payload)) return payload as Group[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if ("data" in obj && Array.isArray((obj as any).data)) return (obj as any).data as Group[];
    if ("groups" in obj && Array.isArray((obj as any).groups)) return (obj as any).groups as Group[];
  }
  return [];
}

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [slug, setSlug] = useState("");
  const [passcode, setPasscode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profileRes = await fetch("/api/me/profile", { cache: "no-store" });
        if (profileRes.status === 401) {
          window.location.href = "/login?next=/profile";
          return;
        }
        if (profileRes.ok) {
          const meJson: unknown = await profileRes.json();
          if (!cancelled && meJson && typeof meJson === "object" && "data" in (meJson as any)) {
            setName(((meJson as any).data?.name as string) ?? "");
          }
        }
      } catch {
        /* noop */
      }
      try {
        const groupsRes = await fetch("/api/groups?mine=1", { cache: "no-store" });
        if (groupsRes.status === 401) {
          window.location.href = "/login?next=/profile";
          return;
        }
        if (groupsRes.ok) {
          const gsJson: unknown = await groupsRes.json();
          if (!cancelled) {
            setGroups(normalizeGroups(gsJson));
          }
        }
      } catch {
        /* noop */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveName() {
    setLoading(true);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        alert("保存に失敗しました");
      }
    } catch {
      alert("保存に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function join() {
    if (!slug) return;
    try {
      const res = await fetch(`/api/groups/${encodeURIComponent(slug)}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: passcode || undefined }),
      });
      if (!res.ok) {
        const { error } = (await res.json().catch(() => ({}))) as { error?: string };
        alert(`参加失敗: ${error ?? res.statusText}`);
        return;
      }
      window.location.reload();
    } catch {
      alert("参加失敗: 通信エラー");
    }
  }

  async function leave(s: string, role?: string) {
    if (role === "OWNER") {
      alert("オーナーは移譲しないと退出できません");
      return;
    }
    if (!window.confirm("このグループを退出しますか？")) return;
    try {
      const res = await fetch(`/api/groups/${encodeURIComponent(s)}/leave`, {
        method: "POST",
      });
      if (!res.ok) {
        const { error } = (await res.json().catch(() => ({}))) as { error?: string };
        alert(`退出失敗: ${error ?? res.statusText}`);
        return;
      }
      window.location.reload();
    } catch {
      alert("退出失敗: 通信エラー");
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-8">
      <h1 className="text-2xl font-bold">プロフィール</h1>

      <section className="space-y-3">
        <h2 className="font-semibold">表示名</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="flex-1 border rounded p-2"
          />
          <button
            onClick={saveName}
            disabled={loading}
            className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
          >
            {loading ? "保存中..." : "保存"}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">所属グループ</h2>
        <ul className="space-y-2">
          {groups.map((g) => (
            <li
              key={g.id}
              className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="font-medium">{g.name}</div>
                <div className="text-sm text-gray-500">
                  slug: {g.slug}
                  {g.role ? ` / role: ${g.role}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/groups/${encodeURIComponent(g.slug)}`}
                  className="px-3 py-1 rounded border"
                >
                  開く
                </a>
                <button
                  onClick={() => leave(g.slug, g.role)}
                  className="px-3 py-1 rounded bg-red-600 text-white"
                >
                  退出
                </button>
              </div>
            </li>
          ))}
          {groups.length === 0 && (
            <li className="rounded-lg border border-dashed p-3 text-sm text-gray-500">
              参加中のグループはありません。
            </li>
          )}
        </ul>

        <div className="mt-4 space-y-2 rounded-lg border p-3">
          <div className="font-semibold">グループに参加</div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              placeholder="group slug"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              className="flex-1 border rounded p-2"
            />
            <input
              placeholder="passcode (必要な場合)"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              className="flex-1 border rounded p-2"
            />
            <button
              onClick={join}
              className="px-4 py-2 rounded bg-emerald-600 text-white"
            >
              参加
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

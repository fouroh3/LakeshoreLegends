// src/pages/admin/components/StoreSettingsPanel.tsx

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import {
  adminStoreSnapshot,
  adminUpdateStore,
  type AdminStoreSettings,
} from "../adminApi";

function FieldLabel({ children }: { children: string }) {
  return (
    <label className="text-xs font-semibold uppercase tracking-[0.17em] text-zinc-500">
      {children}
    </label>
  );
}

function numberValue(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function StoreSettingsPanel() {
  const [settings, setSettings] = useState<AdminStoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await adminStoreSnapshot();
      setSettings(result.settings);
    } catch (err: any) {
      setError(err?.message || "Could not load Store settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const result = await adminUpdateStore(settings);
      await load();
      setSuccess(
        result.settings.storeLocked
          ? "Store settings saved. Student purchases are closed."
          : "Store settings saved. The Store is open for student purchases."
      );
    } catch (err: any) {
      setError(err?.message || "Could not save Store settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !settings) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-[26px] border border-white/10 bg-black/20 text-sm font-semibold text-zinc-500">
        <RefreshCw size={18} className="mr-2 animate-spin" /> Loading Store settings...
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="rounded-[26px] border border-red-300/20 bg-red-950/20 p-5 text-sm text-red-100">
        {error || "Store settings are unavailable."}
        <button
          type="button"
          onClick={() => void load()}
          className="ml-3 rounded-xl border border-red-200/20 px-3 py-1.5 font-bold"
        >
          Retry
        </button>
      </div>
    );
  }

  const storeOpen = !settings.storeLocked;

  return (
    <div className="space-y-5">
      <div
        className={[
          "rounded-[28px] border p-5 sm:p-6",
          storeOpen
            ? "border-emerald-400/20 bg-emerald-400/[0.055]"
            : "border-amber-300/20 bg-amber-300/[0.045]",
        ].join(" ")}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={[
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border",
                storeOpen
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                  : "border-amber-300/20 bg-amber-300/10 text-amber-100",
              ].join(" ")}
            >
              {storeOpen ? <ShoppingBag size={22} /> : <LockKeyhole size={22} />}
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Student Store
              </div>
              <div className="mt-1 text-xl font-black text-white">
                {storeOpen ? "Open for Purchases" : "Closed"}
              </div>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">
                {storeOpen
                  ? "Students can currently spend XP and Skill Tokens using the Store PIN."
                  : "Students can browse the Store, but purchases are blocked."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-[20px] border border-white/10 bg-black/25 p-1.5">
            <button
              type="button"
              onClick={() =>
                setSettings((prev) => (prev ? { ...prev, storeLocked: false } : prev))
              }
              className={[
                "rounded-2xl px-5 py-2.5 text-sm font-black transition",
                storeOpen
                  ? "bg-emerald-300 text-zinc-950"
                  : "text-zinc-500 hover:text-zinc-300",
              ].join(" ")}
            >
              Open
            </button>
            <button
              type="button"
              onClick={() =>
                setSettings((prev) => (prev ? { ...prev, storeLocked: true } : prev))
              }
              className={[
                "rounded-2xl px-5 py-2.5 text-sm font-black transition",
                !storeOpen
                  ? "bg-amber-300 text-zinc-950"
                  : "text-zinc-500 hover:text-zinc-300",
              ].join(" ")}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <KeyRound size={18} className="text-cyan-200" /> Student Purchase Access
          </div>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Students enter this PIN before a purchase. Changing it takes effect as soon as you save.
          </p>

          <div className="mt-4">
            <FieldLabel>Store PIN</FieldLabel>
            <input
              value={settings.storePin}
              onChange={(event) =>
                setSettings((prev) =>
                  prev ? { ...prev, storePin: event.target.value } : prev
                )
              }
              maxLength={12}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 font-mono text-lg font-black tracking-[0.22em] text-white outline-none ring-cyan-300/30 focus:ring-2"
              placeholder="PIN"
            />
          </div>

          <div className="mt-4">
            <FieldLabel>Store Window Label</FieldLabel>
            <input
              value={settings.windowLabel}
              onChange={(event) =>
                setSettings((prev) =>
                  prev ? { ...prev, windowLabel: event.target.value } : prev
                )
              }
              className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none ring-cyan-300/30 placeholder:text-zinc-700 focus:ring-2"
              placeholder="Friday Level Up"
            />
          </div>
        </div>

        <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <Sparkles size={18} className="text-violet-200" /> Purchase Costs & Limits
          </div>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            These values become the live rules used by the student Store.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <FieldLabel>XP per +1 Attribute</FieldLabel>
              <input
                type="number"
                min={1}
                max={999}
                value={settings.xpPerPoint}
                onChange={(event) =>
                  setSettings((prev) =>
                    prev
                      ? {
                          ...prev,
                          xpPerPoint: numberValue(event.target.value, prev.xpPerPoint),
                        }
                      : prev
                  )
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-center text-lg font-black text-white outline-none"
              />
            </div>

            <div>
              <FieldLabel>Tokens per Skill</FieldLabel>
              <input
                type="number"
                min={1}
                max={99}
                value={settings.skillTokenCost}
                onChange={(event) =>
                  setSettings((prev) =>
                    prev
                      ? {
                          ...prev,
                          skillTokenCost: numberValue(
                            event.target.value,
                            prev.skillTokenCost
                          ),
                        }
                      : prev
                  )
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-center text-lg font-black text-white outline-none"
              />
            </div>

            <div>
              <FieldLabel>Max Attribute Buys</FieldLabel>
              <input
                type="number"
                min={1}
                max={99}
                value={settings.maxPointsPerOpen}
                onChange={(event) =>
                  setSettings((prev) =>
                    prev
                      ? {
                          ...prev,
                          maxPointsPerOpen: numberValue(
                            event.target.value,
                            prev.maxPointsPerOpen
                          ),
                        }
                      : prev
                  )
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-center text-lg font-black text-white outline-none"
              />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.025] px-4 py-3 text-xs leading-5 text-zinc-500">
            Saving creates a fresh Store session automatically, so a student cannot reuse a checkout screen from before the change.
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-300/20 bg-red-950/25 px-4 py-3 text-sm font-semibold text-red-100">
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-3 text-sm font-semibold text-emerald-100">
          <CheckCircle2 size={17} /> {success}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-[24px] border border-white/10 bg-white/[0.025] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs leading-5 text-zinc-500">
          Last saved: {settings.updatedAt ? new Date(settings.updatedAt).toLocaleString() : "Not available"}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-zinc-300 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !settings.storePin.trim() || !settings.windowLabel.trim()}
            className="rounded-2xl bg-cyan-300 px-5 py-2.5 text-sm font-black text-zinc-950 disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save Store Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

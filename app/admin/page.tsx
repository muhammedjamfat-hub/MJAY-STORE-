"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Pencil } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase-browser";

interface OrderRow {
  id: string;
  order_number: string;
  customer_name: string;
  state: string | null;
  total: number | string;
  payment_status: string;
  order_status: string;
  created_at: string;
}
interface ProductRow {
  id: string;
  name: string;
  stock_quantity: number;
  active: boolean;
  images: string[] | null;
}
interface ItemRow {
  product_name: string;
  quantity: number;
  total_price: number | string;
}
interface Bucket {
  label: string;
  paid: number;
  awaiting: number;
}
type Range = "7d" | "30d" | "6m";

const GOAL_KEY = "mjay-sales-goal";
const TONE: Record<string, string> = {
  pending: "warn",
  confirmed: "info",
  processing: "info",
  shipped: "info",
  out_for_delivery: "info",
  delivered: "good",
  cancelled: "bad",
};

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;
const compact = (n: number) =>
  n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n));
const words = (s: string) => s.replace(/_/g, " ");
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

function lastDays(orders: OrderRow[], days: number, pick: (o: OrderRow) => number): number[] {
  const out: number[] = [];
  for (let i = 0; i < days; i++) out.push(0);
  const today = startOfDay(new Date());
  for (const o of orders) {
    if (o.order_status === "cancelled") continue;
    const ago = Math.round((today - startOfDay(new Date(o.created_at))) / 86400000);
    if (ago < 0 || ago >= days) continue;
    out[days - 1 - ago] += pick(o);
  }
  return out;
}

function buildBuckets(orders: OrderRow[], range: Range): Bucket[] {
  const now = new Date();
  const daily = range !== "6m";
  const n = range === "7d" ? 7 : range === "30d" ? 30 : 6;
  const buckets: Bucket[] = [];
  const index: Record<string, number> = {};
  for (let i = n - 1; i >= 0; i--) {
    const d = daily
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      : new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = daily ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : `${d.getFullYear()}-${d.getMonth()}`;
    index[key] = buckets.length;
    const label = daily
      ? range === "7d"
        ? d.toLocaleDateString("en-NG", { weekday: "short" })
        : String(d.getDate())
      : d.toLocaleDateString("en-NG", { month: "short" });
    buckets.push({ label, paid: 0, awaiting: 0 });
  }
  for (const o of orders) {
    if (o.order_status === "cancelled") continue;
    const d = new Date(o.created_at);
    const key = daily ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : `${d.getFullYear()}-${d.getMonth()}`;
    const at = index[key];
    if (at === undefined) continue;
    const amount = Number(o.total);
    if (o.payment_status === "paid") buckets[at].paid += amount;
    else buckets[at].awaiting += amount;
  }
  return buckets;
}

function Spark({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const last = Math.max(values.length - 1, 1);
  const pts = values.map((v, i) => `${(i / last) * 100},${30 - (v / max) * 26}`).join(" ");
  return (
    <svg viewBox="0 0 100 32" className="h-8 w-24 shrink-0" preserveAspectRatio="none">
      <polyline
        points={pts}
        fill="none"
        stroke="var(--adm-accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function Delta({ cur, prev }: { cur: number; prev: number }) {
  if (prev <= 0) return null;
  const pct = ((cur - prev) / prev) * 100;
  const up = pct >= 0;
  return (
    <span className="text-[11px] font-medium" style={{ color: up ? "var(--adm-good)" : "var(--adm-bad)" }}>
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function Gauge({ pct }: { pct: number }) {
  const ticks = 48;
  const cx = 110;
  const cy = 108;
  const lines = [];
  for (let i = 0; i < ticks; i++) {
    const a = Math.PI + (i / (ticks - 1)) * Math.PI;
    const on = (i + 1) / ticks <= Math.min(pct, 100) / 100;
    lines.push(
      <line
        key={i}
        x1={cx + 72 * Math.cos(a)}
        y1={cy + 72 * Math.sin(a)}
        x2={cx + 100 * Math.cos(a)}
        y2={cy + 100 * Math.sin(a)}
        strokeWidth="3"
        strokeLinecap="round"
        stroke={on ? "var(--adm-accent)" : "var(--adm-track)"}
      />
    );
  }
  return (
    <svg viewBox="0 0 220 120" className="mt-2 w-full max-w-[280px]">
      {lines}
      <text x="110" y="92" textAnchor="middle" fontSize="26" fontWeight="700" fill="var(--adm-text)">
        {Math.round(pct)}%
      </text>
      <text x="110" y="110" textAnchor="middle" fontSize="10" fill="var(--adm-muted)">
        of monthly goal
      </text>
    </svg>
  );
}

function Chip({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className="adm-chip" data-tone={tone}>
      {children}
    </span>
  );
}

export default function AdminOverviewPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [range, setRange] = useState<Range>("30d");
  const [hover, setHover] = useState<number | null>(null);
  const [goal, setGoal] = useState(500000);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  useEffect(() => {
    const supabase = supabaseBrowser();
    async function load() {
      const [o, p, it, u] = await Promise.all([
        supabase
          .from("orders")
          .select("id, order_number, customer_name, state, total, payment_status, order_status, created_at")
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase.from("products").select("id, name, stock_quantity, active, images"),
        supabase.from("order_items").select("product_name, quantity, total_price").limit(5000),
        supabase.auth.getUser(),
      ]);
      if (o.error || p.error) {
        setLoadError(true);
        setLoading(false);
        return;
      }
      setOrders((o.data as OrderRow[]) || []);
      setProducts((p.data as ProductRow[]) || []);
      setItems((it.data as ItemRow[]) || []);
      setEmail(u.data.user?.email || "");
      try {
        const g = Number(localStorage.getItem(GOAL_KEY));
        if (g > 0) setGoal(g);
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const live = orders.filter((o) => o.order_status !== "cancelled");
    const paid = live.filter((o) => o.payment_status === "paid");
    const sameMonth = (o: OrderRow) => {
      const c = new Date(o.created_at);
      return c.getMonth() === now.getMonth() && c.getFullYear() === now.getFullYear();
    };
    const byState: Record<string, number> = {};
    for (const o of live) {
      const k = o.state || "Unknown";
      byState[k] = (byState[k] || 0) + Number(o.total);
    }
    const sold: Record<string, number> = {};
    for (const it of items) sold[it.product_name] = (sold[it.product_name] || 0) + Number(it.quantity);
    return {
      revenue: sum(paid.map((o) => Number(o.total))),
      awaiting: sum(live.filter((o) => o.payment_status !== "paid").map((o) => Number(o.total))),
      pending: orders.filter((o) => o.order_status === "pending").length,
      delivered: orders.filter((o) => o.order_status === "delivered").length,
      verifying: orders.filter((o) => o.payment_status === "verification_pending").length,
      rev28: lastDays(orders, 28, (o) => (o.payment_status === "paid" ? Number(o.total) : 0)),
      cnt28: lastDays(orders, 28, () => 1),
      monthRevenue: sum(paid.filter(sameMonth).map((o) => Number(o.total))),
      monthOrders: live.filter(sameMonth).length,
      daysLeft: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate(),
      states: Object.keys(byState)
        .map((k) => ({ name: k, total: byState[k] }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5),
      top: Object.keys(sold)
        .map((k) => ({ name: k, qty: sold[k] }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5),
      low: products.filter((p) => p.active && p.stock_quantity <= 5).sort((a, b) => a.stock_quantity - b.stock_quantity),
    };
  }, [orders, products, items]);

  const buckets = useMemo(() => buildBuckets(orders, range), [orders, range]);
  const maxVal = Math.max(1, ...buckets.map((b) => Math.max(b.paid, b.awaiting)));

  function saveGoal(e: React.FormEvent) {
    e.preventDefault();
    const n = Math.round(Number(goalInput));
    if (!n || n <= 0) return;
    setGoal(n);
    try {
      localStorage.setItem(GOAL_KEY, String(n));
    } catch {}
    setEditingGoal(false);
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="adm-card h-40 animate-pulse" />
        <div className="adm-card h-72 animate-pulse" />
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="adm-card p-6 text-sm">
        We couldn&apos;t load your dashboard data. Refresh the page, and if it keeps happening, check your connection.
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name = email ? email.split("@")[0] : "there";
  const dateLine = new Date().toLocaleString("en-NG", { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const todo: string[] = [];
  if (stats.pending > 0) todo.push(`${stats.pending} order${stats.pending === 1 ? "" : "s"} to confirm`);
  if (stats.verifying > 0) todo.push(`${stats.verifying} payment${stats.verifying === 1 ? "" : "s"} to verify`);
  if (stats.low.length > 0) todo.push(`${stats.low.length} product${stats.low.length === 1 ? "" : "s"} running low`);
  const summary = todo.length ? `Here's what needs you: ${todo.join(", ")}.` : "You're all caught up. Nothing is waiting on you.";
  const outCount = stats.low.filter((p) => p.stock_quantity <= 0).length;
  const pct = goal > 0 ? (stats.monthRevenue / goal) * 100 : 0;
  const remaining = goal - stats.monthRevenue;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <section className="adm-card p-5 sm:col-span-2 xl:col-span-1">
          <p className="adm-muted text-xs">{dateLine}</p>
          <h1 className="mt-2 text-2xl font-semibold capitalize leading-tight">
            {greeting},
            <br />
            {name}!
          </h1>
          <p className="adm-muted mt-2 text-sm">{summary}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/admin/payments" className="adm-btn adm-btn-primary">
              Review payments
            </Link>
            <Link href="/admin/products/new" className="adm-btn">
              Add product
            </Link>
          </div>
        </section>

        <section className="adm-card p-4">
          <p className="adm-muted text-xs">Revenue (paid)</p>
          <div className="mt-2 flex items-end justify-between gap-2">
            <div>
              <p className="text-2xl font-semibold">{naira(stats.revenue)}</p>
              <div className="mt-1">
                <Delta cur={sum(stats.rev28.slice(14))} prev={sum(stats.rev28.slice(0, 14))} />
              </div>
            </div>
            <Spark values={stats.rev28.slice(14)} />
          </div>
          <p className="adm-muted mt-3 text-xs">{naira(stats.awaiting)} awaiting payment</p>
        </section>

        <section className="adm-card p-4">
          <p className="adm-muted text-xs">Orders</p>
          <div className="mt-2 flex items-end justify-between gap-2">
            <div>
              <p className="text-2xl font-semibold">{orders.length}</p>
              <div className="mt-1">
                <Delta cur={sum(stats.cnt28.slice(14))} prev={sum(stats.cnt28.slice(0, 14))} />
              </div>
            </div>
            <Spark values={stats.cnt28.slice(14)} />
          </div>
          <p className="adm-muted mt-3 text-xs">
            {stats.pending} pending · {stats.delivered} delivered
          </p>
        </section>

        <section className="adm-card p-4">
          <p className="adm-muted text-xs">Low stock items</p>
          <div className="mt-2 flex items-end justify-between gap-2">
            <div>
              <p className="text-2xl font-semibold">{stats.low.length}</p>
              <p className="mt-1 text-[11px]" style={{ color: outCount > 0 ? "var(--adm-bad)" : "var(--adm-muted)" }}>
                {outCount} out of stock
              </p>
            </div>
            <div className="flex -space-x-2">
              {stats.low.slice(0, 3).map((p) =>
                p.images && p.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={p.id} src={p.images[0]} alt={p.name} className="h-9 w-9 rounded-lg border object-cover" style={{ borderColor: "var(--adm-card-solid)" }} />
                ) : (
                  <span key={p.id} className="h-9 w-9 rounded-lg border" style={{ background: "var(--adm-track)", borderColor: "var(--adm-card-solid)" }} />
                )
              )}
            </div>
          </div>
          <p className="adm-muted mt-3 text-xs">Products with 5 or fewer left</p>
        </section>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.7fr_1fr]">
        <section className="adm-card p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">Sales</h2>
              <p className="adm-muted text-xs">Paid vs awaiting payment</p>
            </div>
            <div className="adm-seg">
              {(["7d", "30d", "6m"] as Range[]).map((r) => (
                <button
                  key={r}
                  className={range === r ? "on" : ""}
                  onClick={() => {
                    setRange(r);
                    setHover(null);
                  }}
                >
                  {r === "7d" ? "7 days" : r === "30d" ? "30 days" : "6 months"}
                </button>
              ))}
            </div>
          </div>
          <div className="adm-muted mt-3 flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: "var(--adm-accent)" }} /> Paid
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: "var(--adm-muted)", opacity: 0.45 }} /> Awaiting
            </span>
          </div>
          <div className="relative mt-3">
            <span className="adm-muted absolute left-0 top-0 text-[10px]">{compact(maxVal)}</span>
            <div className="flex h-44 items-end gap-[3px] border-b" style={{ borderColor: "var(--adm-border)" }}>
              {buckets.map((b, i) => {
                const base = hover === null || hover === i ? 1 : 0.4;
                return (
                  <button
                    key={i}
                    onClick={() => setHover(i)}
                    onMouseEnter={() => setHover(i)}
                    className="flex h-full min-w-0 flex-1 items-end justify-center gap-[2px]"
                    aria-label={`${b.label}: paid ${naira(b.paid)}, awaiting ${naira(b.awaiting)}`}
                  >
                    <span
                      className="block w-1/2 rounded-t"
                      style={{ height: `${(b.paid / maxVal) * 100}%`, minHeight: b.paid > 0 ? 3 : 0, background: "var(--adm-accent)", opacity: base }}
                    />
                    <span
                      className="block w-1/2 rounded-t"
                      style={{ height: `${(b.awaiting / maxVal) * 100}%`, minHeight: b.awaiting > 0 ? 3 : 0, background: "var(--adm-muted)", opacity: base * 0.45 }}
                    />
                  </button>
                );
              })}
            </div>
            <div className="mt-1 flex gap-[3px]">
              {buckets.map((b, i) => (
                <span key={i} className="adm-muted min-w-0 flex-1 truncate text-center text-[10px]">
                  {range === "30d" && i % 5 !== 0 ? "" : b.label}
                </span>
              ))}
            </div>
          </div>
          {hover !== null && buckets[hover] ? (
            <p className="mt-3 text-xs">
              <strong>{buckets[hover].label}</strong> · Paid {naira(buckets[hover].paid)} · Awaiting {naira(buckets[hover].awaiting)}
            </p>
          ) : (
            <p className="adm-muted mt-3 text-xs">Tap a bar to see the amounts.</p>
          )}
        </section>

        <section className="adm-card flex flex-col items-center p-4 md:p-5">
          <div className="flex w-full items-center justify-between">
            <h2 className="text-sm font-semibold">Monthly sales goal</h2>
            <button
              className="adm-muted flex items-center gap-1 text-xs"
              onClick={() => {
                setGoalInput(String(goal));
                setEditingGoal((v) => !v);
              }}
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
          </div>
          {editingGoal && (
            <form onSubmit={saveGoal} className="mt-3 flex w-full gap-2">
              <input type="number" inputMode="numeric" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} className="adm-input min-w-0 flex-1" placeholder="Goal in ₦" />
              <button type="submit" className="adm-btn adm-btn-primary">
                Save
              </button>
            </form>
          )}
          <Gauge pct={pct} />
          <div className="grid w-full grid-cols-2 gap-3 text-center text-xs">
            <div>
              <p className="adm-muted">Orders this month</p>
              <p className="mt-0.5 text-base font-semibold">{stats.monthOrders}</p>
            </div>
            <div>
              <p className="adm-muted">Paid this month</p>
              <p className="mt-0.5 text-base font-semibold">{naira(stats.monthRevenue)}</p>
            </div>
          </div>
          <p className="adm-muted mt-3 text-center text-xs">
            {remaining > 0 ? `${naira(remaining)} to reach ${naira(goal)} · ${stats.daysLeft} days left` : "Goal reached 🎉"}
          </p>
        </section>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="adm-card p-4 md:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent orders</h2>
            <Link href="/admin/orders" className="adm-muted flex items-center gap-1 text-xs">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-3 space-y-1">
            {orders.slice(0, 6).map((o) => (
              <Link key={o.id} href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{o.order_number}</p>
                  <p className="adm-muted truncate text-xs">
                    {o.customer_name} · {naira(Number(o.total))}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Chip tone={TONE[o.order_status] || "info"}>{words(o.order_status)}</Chip>
                  {o.payment_status === "verification_pending" && <Chip tone="warn">verify payment</Chip>}
                </div>
              </Link>
            ))}
            {orders.length === 0 && <p className="adm-muted py-6 text-center text-sm">No orders yet.</p>}
          </div>
        </section>

        <section className="adm-card p-4 md:p-5">
          <h2 className="text-sm font-semibold">Sales by state</h2>
          <p className="adm-muted text-xs">Where your orders ship to</p>
          <div className="mt-3 space-y-3">
            {stats.states.map((s, i) => (
              <div key={s.name}>
                <div className="flex items-center justify-between text-sm">
                  <span>
                    {i + 1}. {s.name}
                  </span>
                  <span className="font-medium">{naira(s.total)}</span>
                </div>
                <div className="adm-track mt-1">
                  <div style={{ width: `${(s.total / stats.states[0].total) * 100}%`, height: "100%", background: "var(--adm-accent)" }} />
                </div>
              </div>
            ))}
            {stats.states.length === 0 && <p className="adm-muted py-6 text-center text-sm">No sales yet.</p>}
          </div>
        </section>

        <section className="adm-card p-4 md:p-5">
          <h2 className="text-sm font-semibold">Top sellers</h2>
          <p className="adm-muted text-xs">By units sold</p>
          <div className="mt-3 space-y-3">
            {stats.top.map((t) => (
              <div key={t.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate pr-2">{t.name}</span>
                  <span className="font-medium">{t.qty} sold</span>
                </div>
                <div className="adm-track mt-1">
                  <div style={{ width: `${(t.qty / stats.top[0].qty) * 100}%`, height: "100%", background: "var(--adm-accent)" }} />
                </div>
              </div>
            ))}
            {stats.top.length === 0 && <p className="adm-muted py-6 text-center text-sm">Nothing sold yet.</p>}
          </div>
        </section>

        <section className="adm-card p-4 md:p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4" style={{ color: "var(--adm-warn)" }} /> Low stock
            </h2>
            <Link href="/admin/products" className="adm-muted flex items-center gap-1 text-xs">
              All products <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-3 space-y-1">
            {stats.low.slice(0, 5).map((p) => (
              <Link key={p.id} href={`/admin/products/${p.id}`} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2">
                <span className="truncate text-sm">{p.name}</span>
                <Chip tone={p.stock_quantity <= 0 ? "bad" : "warn"}>{p.stock_quantity <= 0 ? "out of stock" : `${p.stock_quantity} left`}</Chip>
              </Link>
            ))}
            {stats.low.length === 0 && <p className="adm-muted py-6 text-center text-sm">Everything is well stocked.</p>}
          </div>
        </section>
      </div>
    </div>
  );
  }

"use client";

import "./admin.css";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Bell, CreditCard, ExternalLink, LayoutGrid, LogOut, Moon, Package, Plus, Search, Settings, ShoppingCart, Sun } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Theme = "light" | "dark";
const THEME_KEY = "mjay-admin-theme";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: "orders" | "payments";
}

const NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutGrid },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart, badge: "orders" },
  { href: "/admin/payments", label: "Payments", icon: CreditCard, badge: "payments" },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function NavLink({ item, active, count }: { item: NavItem; active: boolean; count: number }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} title={item.label} aria-label={item.label} className={`adm-navbtn ${active ? "is-active" : ""}`}>
      <Icon className="h-[18px] w-[18px]" />
      {count > 0 && <span className="adm-badge">{count > 99 ? "99+" : count}</span>}
    </Link>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/admin/login";

  const [theme, setTheme] = useState<Theme>("light");
  const [email, setEmail] = useState("");
  const [counts, setCounts] = useState({ orders: 0, payments: 0 });
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchMsg, setSearchMsg] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "dark" || saved === "light") setTheme(saved);
    } catch {}
  }, []);

  useEffect(() => {
    if (isLogin) return;
    supabaseBrowser()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email || ""));
  }, [isLogin]);

  useEffect(() => {
    if (isLogin) return;
    const supabase = supabaseBrowser();
    Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("order_status", "pending"),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("payment_status", "verification_pending"),
    ]).then(([a, b]) => setCounts({ orders: a.count || 0, payments: b.count || 0 }));
  }, [pathname, isLogin]);

  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: Event) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [menuOpen]);

  function switchTheme(next: Theme, origin: HTMLElement) {
    if (next === theme) return;
    const commit = () => {
      setTheme(next);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {}
    };
    const doc = document as unknown as {
      startViewTransition?: (cb: () => void) => { ready: Promise<unknown> };
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!doc.startViewTransition || reduce) {
      commit();
      return;
    }
    const r = origin.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const transition = doc.startViewTransition(() => {
      flushSync(commit);
    });
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 620, easing: "cubic-bezier(0.65, 0.05, 0.36, 1)", pseudoElement: "::view-transition-new(root)" } as KeyframeAnimationOptions
      );
    });
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.replace(/[,()%*]/g, " ").trim();
    if (!q) return;
    const { data } = await supabaseBrowser()
      .from("orders")
      .select("id")
      .or(`order_number.ilike.%${q}%,customer_name.ilike.%${q}%,phone.ilike.%${q}%`)
      .order("created_at", { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      setQuery("");
      setSearchMsg("");
      router.push(`/admin/orders/${data[0].id}`);
    } else {
      setSearchMsg("No order found");
      setTimeout(() => setSearchMsg(""), 2500);
    }
  }

  async function handleLogout() {
    await supabaseBrowser().auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  if (isLogin) return <>{children}</>;

  const initial = (email[0] || "A").toUpperCase();
  const countFor = (item: NavItem) => (item.badge === "orders" ? counts.orders : item.badge === "payments" ? counts.payments : 0);
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <div className={`adm ${theme === "dark" ? "adm-dark" : ""} fixed inset-0 z-[100] overflow-y-auto`}>
      <div className="mx-auto w-full max-w-[1400px] px-3 pb-28 pt-3 md:px-5 md:pb-8">
        <header className="adm-card sticky top-3 z-30 flex items-center gap-2 px-3 py-2">
          <Link href="/admin" className="flex items-center gap-2 pr-1">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
              style={{ background: "var(--adm-accent)", color: "var(--adm-accent-ink)" }}
            >
              M
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-semibold tracking-wide">MJAY STORE</span>
              <span className="adm-muted block text-[11px]">Admin</span>
            </span>
          </Link>

          <form onSubmit={handleSearch} className="relative min-w-0 flex-1 md:mx-6 md:max-w-md">
            <Search className="adm-muted pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find an order or customer"
              className="adm-input w-full pl-9"
            />
            {searchMsg && <span className="adm-muted absolute -bottom-5 left-3 text-[11px]">{searchMsg}</span>}
          </form>

          <Link href="/admin/payments" className="adm-iconbtn relative" aria-label="Payments to verify" title="Payments to verify">
            <Bell className="h-[18px] w-[18px]" />
            {counts.payments > 0 && <span className="adm-badge">{counts.payments}</span>}
          </Link>

          <Link href="/admin/products/new" className="adm-btn adm-btn-primary">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New</span>
          </Link>

          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen((v) => !v)} className="adm-iconbtn text-sm font-semibold" aria-label="Account">
              {initial}
            </button>
            {menuOpen && (
              <div className="adm-card absolute right-0 top-12 z-40 w-60 p-2">
                <p className="adm-muted truncate px-3 py-2 text-xs">{email || "Admin"}</p>
                <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm">
                  <ExternalLink className="h-4 w-4" /> View store
                </a>
                <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="mt-6 flex items-start gap-4">
          <aside className="adm-card sticky top-24 hidden w-[60px] shrink-0 flex-col items-center gap-2 p-2 md:flex">
            <div className="flex flex-col gap-1 rounded-full p-1" style={{ background: "var(--adm-track)" }}>
              <button
                onClick={(e) => switchTheme("light", e.currentTarget)}
                className={`adm-themebtn ${theme === "light" ? "on" : ""}`}
                aria-label="Light mode"
              >
                <Sun className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => switchTheme("dark", e.currentTarget)}
                className={`adm-themebtn ${theme === "dark" ? "on" : ""}`}
                aria-label="Dark mode"
              >
                <Moon className="h-4 w-4" />
              </button>
            </div>
            <div className="my-1 h-px w-8" style={{ background: "var(--adm-border)" }} />
            {NAV.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} count={countFor(item)} />
            ))}
          </aside>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>

      <nav className="adm-card fixed bottom-3 left-3 right-3 z-40 flex items-center justify-between rounded-full px-2 py-1.5 md:hidden">
        {NAV.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} count={countFor(item)} />
        ))}
        <button
          onClick={(e) => switchTheme(theme === "dark" ? "light" : "dark", e.currentTarget)}
          className="adm-navbtn"
          aria-label="Toggle dark mode"
        >
          {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>
      </nav>
    </div>
  );
  }

"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Home, Mail, MapPin, MessageCircle, Moon, Phone, Search, ShoppingCart, Store, Sun, Truck } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { getWhatsAppLink } from "@/lib/whatsapp";

type Theme = "light" | "dark";
const THEME_KEY = "mjay-theme";
const BRAND = "MJAY STORE";

interface ShellSettings {
  whatsapp_number?: string | null;
  support_phone?: string | null;
  support_email?: string | null;
  store_address?: string | null;
  instagram_url?: string | null;
  twitter_url?: string | null;
  facebook_url?: string | null;
}
interface BottomItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const TOP = [
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/track-order", label: "Track order" },
];
const BOTTOM: BottomItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/shop", label: "Shop", icon: Store },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/track-order", label: "Track order", icon: Truck },
];

function Footer({ settings, waLink }: { settings: ShellSettings | null; waLink: string }) {
  const socials = [
    { label: "Instagram", url: settings?.instagram_url },
    { label: "Facebook", url: settings?.facebook_url },
    { label: "X / Twitter", url: settings?.twitter_url },
  ].filter((s) => !!s.url);
  return (
    <footer className="mx-auto mt-14 max-w-[1200px] px-3 md:px-5">
      <div className="sf-card grid gap-8 p-6 md:grid-cols-4 md:p-8">
        <div className="md:col-span-1">
          <p className="text-lg font-semibold tracking-wide">{BRAND}</p>
          <p className="sf-muted mt-2 text-sm">Time. Style. Confidence. Watches delivered across Nigeria.</p>
        </div>
        <div>
          <p className="text-sm font-semibold">Shop</p>
          <ul className="sf-muted mt-3 space-y-2 text-sm">
            <li><Link href="/shop">All watches</Link></li>
            <li><Link href="/cart">Your cart</Link></li>
            <li><Link href="/track-order">Track an order</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Company</p>
          <ul className="sf-muted mt-3 space-y-2 text-sm">
            <li><Link href="/about">About us</Link></li>
            <li><Link href="/contact">Contact</Link></li>
            {socials.map((s) => (
              <li key={s.label}>
                <a href={s.url as string} target="_blank" rel="noopener noreferrer">{s.label}</a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Get in touch</p>
          <ul className="sf-muted mt-3 space-y-2 text-sm">
            {waLink && (
              <li className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <a href={waLink} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a>
              </li>
            )}
            {settings?.support_phone && (
              <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> {settings.support_phone}</li>
            )}
            {settings?.support_email && (
              <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> {settings.support_email}</li>
            )}
            {settings?.store_address && (
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {settings.store_address}</li>
            )}
          </ul>
        </div>
      </div>
      <p className="sf-muted py-6 text-center text-xs">© {new Date().getFullYear()} {BRAND}. All rights reserved.</p>
    </footer>
  );
}

export default function StoreShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { itemCount } = useCart();
  const isAdmin = pathname.startsWith("/admin");
  const [theme, setTheme] = useState<Theme>("light");
  const [settings, setSettings] = useState<ShellSettings | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "dark" || saved === "light") setTheme(saved);
    } catch {}
  }, []);

  useEffect(() => {
    if (isAdmin || settings) return;
    supabaseBrowser()
      .from("store_settings")
      .select("*")
      .single()
      .then(({ data }) => {
        if (data) setSettings(data as ShellSettings);
      });
  }, [isAdmin, settings]);

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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
  }

  if (isAdmin) {
    return pathname === "/admin/login" ? <div className="min-h-screen bg-nova-black">{children}</div> : <>{children}</>;
  }

  const waNumber = settings?.whatsapp_number || "";
  const waLink = waNumber ? getWhatsAppLink(waNumber, `Hello ${BRAND} 👋 I have a question.`) : "";
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const nextTheme: Theme = theme === "dark" ? "light" : "dark";

  return (
    <div className={`sf ${theme === "dark" ? "sf-dark" : ""}`}>
      <div className="pb-28 md:pb-10">
        <div className="sticky top-3 z-40 mx-auto max-w-[1200px] px-3 pt-3 md:px-5">
          <header className="sf-card flex items-center gap-2 px-3 py-2">
            <Link href="/" className="flex items-center gap-2 pr-1">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
                style={{ background: "var(--sf-accent)", color: "var(--sf-accent-ink)" }}
              >
                M
              </span>
              <span className="hidden text-sm font-semibold tracking-wide sm:block">{BRAND}</span>
            </Link>

            <nav className="hidden items-center gap-1 lg:flex">
              {TOP.map((l) => (
                <Link key={l.href} href={l.href} className={`sf-navlink ${isActive(l.href) ? "is-active" : ""}`}>
                  {l.label}
                </Link>
              ))}
            </nav>

            <form onSubmit={handleSearch} className="relative min-w-0 flex-1 md:mx-4">
              <Search className="sf-muted pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search watches"
                className="sf-input w-full pl-9"
              />
            </form>

            <Link href="/cart" className="sf-iconbtn" aria-label="Cart" title="Cart">
              <ShoppingCart className="h-[18px] w-[18px]" />
              {itemCount > 0 && <span className="sf-badge">{itemCount}</span>}
            </Link>
            <button
              onClick={(e) => switchTheme(nextTheme, e.currentTarget)}
              className="sf-iconbtn hidden md:inline-flex"
              aria-label="Toggle dark mode"
            >
              {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
            {waLink && (
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="sf-iconbtn hidden md:inline-flex" aria-label="WhatsApp">
                <MessageCircle className="h-[18px] w-[18px]" />
              </a>
            )}
          </header>
        </div>

        <main>{children}</main>
        <Footer settings={settings} waLink={waLink} />
      </div>

      <nav className="sf-card fixed bottom-3 left-3 right-3 z-40 flex items-center justify-between rounded-full px-2 py-1.5 md:hidden">
        {BOTTOM.map((item) => {
          const Icon = item.icon;
          const count = item.href === "/cart" ? itemCount : 0;
          return (
            <Link key={item.href} href={item.href} aria-label={item.label} title={item.label} className={`sf-navbtn ${isActive(item.href) ? "is-active" : ""}`}>
              <Icon className="h-[18px] w-[18px]" />
              {count > 0 && <span className="sf-badge">{count}</span>}
            </Link>
          );
        })}
        {waLink && (
          <a href={waLink} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="sf-navbtn">
            <MessageCircle className="h-[18px] w-[18px]" />
          </a>
        )}
        <button onClick={(e) => switchTheme(nextTheme, e.currentTarget)} className="sf-navbtn" aria-label="Toggle dark mode">
          {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>
      </nav>
    </div>
  );
  }

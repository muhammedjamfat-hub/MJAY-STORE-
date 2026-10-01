"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { LayoutDashboard, Package, ShoppingCart, CreditCard, Settings, LogOut } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/admin/login") return <>{children}</>;

  const links = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/products", label: "Products", icon: Package },
    { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
    { href: "/admin/payments", label: "Payment Verification", icon: CreditCard },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];

  async function handleLogout() {
    await supabaseBrowser().auth.signOut();
    router.push("/admin/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 bg-nova-black text-white flex-shrink-0 flex flex-col">
        <div className="p-6 font-serif text-xl text-nova-gold">MJAY STORE</div>
        <nav className="flex-1 px-3 space-y-1">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm ${
                  active ? "bg-nova-gold text-nova-black" : "text-white/70 hover:bg-white/10"
                }`}
              >
                <l.icon className="w-4 h-4" /> {l.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-6 py-4 text-sm text-white/60 hover:text-white border-t border-white/10"
        >
          <LogOut className="w-4 h-4" /> Log Out
        </button>
      </aside>
      <main className="flex-1 bg-nova-cream p-8 overflow-x-auto">{children}</main>
    </div>
  );
}

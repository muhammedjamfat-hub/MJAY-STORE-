import Link from "next/link";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, Headphones, MessageCircle, ShieldCheck, Gem, Truck } from "lucide-react";
import { supabaseServer } from "@/lib/supabase-server";
import { Category, Product, StoreSettings } from "@/lib/types";
import ProductCard from "@/components/ProductCard";
import { getWhatsAppLink } from "@/lib/whatsapp";

export const revalidate = 60;

async function getHomeData() {
  const supabase = supabaseServer();
  const [featured, best, fresh, cats, used, settings] = await Promise.all([
    supabase.from("products").select("*").eq("active", true).eq("featured", true).order("created_at", { ascending: false }).limit(8),
    supabase.from("products").select("*").eq("active", true).eq("bestseller", true).limit(8),
    supabase.from("products").select("*").eq("active", true).eq("new_arrival", true).order("created_at", { ascending: false }).limit(8),
    supabase.from("categories").select("*"),
    supabase.from("products").select("category_id").eq("active", true),
    supabase.from("store_settings").select("*").single(),
  ]);
  const usedIds = new Set((used.data || []).map((p: { category_id: string | null }) => p.category_id));
  const categories = ((cats.data as Category[]) || []).filter((c) => usedIds.has(c.id));
  return {
    featured: (featured.data as Product[]) || [],
    best: (best.data as Product[]) || [],
    fresh: (fresh.data as Product[]) || [],
    categories,
    settings: settings.data as StoreSettings | null,
  };
}

function Section({ title, subtitle, products }: { title: string; subtitle: string; products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <section className="mx-auto mt-12 max-w-[1200px] px-3 md:px-5">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold md:text-2xl">{title}</h2>
          <p className="sf-muted text-sm">{subtitle}</p>
        </div>
        <Link href="/shop" className="sf-muted flex items-center gap-1 text-sm">
          View all <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

const TRUST: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Gem, title: "Quality watches", text: "Chosen to be worn every day." },
  { icon: ShieldCheck, title: "Secure ordering", text: "Pay by bank transfer, verified by us." },
  { icon: Truck, title: "Fast delivery", text: "Delivery across Nigeria." },
  { icon: Headphones, title: "Easy support", text: "Chat with us on WhatsApp." },
];

export default async function HomePage() {
  const { featured, best, fresh, categories, settings } = await getHomeData();
  const waNumber = settings?.whatsapp_number || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";
  const waLink = waNumber ? getWhatsAppLink(waNumber, "Hello MJAY STORE 👋 I'd like to order a watch.") : "";
  const hero = [...featured, ...fresh, ...best].find((p) => p.images && p.images.length > 0) || null;
  const nothing = featured.length + best.length + fresh.length === 0;

  return (
    <div>
      <section className="mx-auto max-w-[1200px] px-3 pt-6 md:px-5 md:pt-10">
        <div className="sf-card grid items-center gap-8 overflow-hidden p-6 md:grid-cols-2 md:p-10">
          <div>
            <span className="sf-chip">MJAY STORE</span>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              TIME. STYLE.
              <br />
              <span style={{ color: "var(--sf-accent)" }}>CONFIDENCE.</span>
            </h1>
            <p className="sf-muted mt-4 max-w-md text-base md:text-lg">
              Discover watches designed to elevate your everyday style.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/shop" className="sf-btn sf-btn-primary">
                Shop watches
              </Link>
              {waLink && (
                <a href={waLink} target="_blank" rel="noopener noreferrer" className="sf-btn">
                  <MessageCircle className="h-4 w-4" /> Order on WhatsApp
                </a>
              )}
            </div>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl md:aspect-square" style={{ background: "var(--sf-track)" }}>
            {hero && hero.images ? (
              <Link href={`/product/${hero.slug}`} className="block h-full w-full">
                <Image src={hero.images[0]} alt={hero.name} fill priority sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                <span className="sf-card absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl px-4 py-3 text-sm">
                  <span className="truncate font-medium">{hero.name}</span>
                  <span className="shrink-0 pl-3 font-semibold">₦{Number(hero.price).toLocaleString()}</span>
                </span>
              </Link>
            ) : (
              <div className="sf-muted flex h-full w-full items-center justify-center text-3xl font-semibold tracking-widest">MJAY</div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-4 grid max-w-[1200px] grid-cols-2 gap-3 px-3 md:grid-cols-4 md:px-5">
        {TRUST.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.title} className="sf-card p-4">
              <Icon className="h-5 w-5" style={{ color: "var(--sf-accent)" }} />
              <p className="mt-3 text-sm font-semibold">{t.title}</p>
              <p className="sf-muted mt-1 text-xs">{t.text}</p>
            </div>
          );
        })}
      </section>

      {nothing && (
        <section className="mx-auto mt-12 max-w-[1200px] px-3 md:px-5">
          <div className="sf-card p-8 text-center">
            <p className="text-lg font-semibold">New watches are arriving soon.</p>
            <p className="sf-muted mt-1 text-sm">Message us on WhatsApp to ask what is available right now.</p>
          </div>
        </section>
      )}

      <Section title="Featured watches" subtitle="Hand-picked for you" products={featured} />
      <Section title="Best sellers" subtitle="What customers choose most" products={best} />
      <Section title="New arrivals" subtitle="Just added to the store" products={fresh} />

      {categories.length > 0 && (
        <section className="mx-auto mt-12 max-w-[1200px] px-3 md:px-5">
          <h2 className="mb-4 text-xl font-semibold md:text-2xl">Shop by category</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {categories.map((c) => (
              <Link key={c.id} href={`/shop?category=${c.slug}`} className="sf-card flex items-center justify-between px-4 py-4 text-sm font-medium">
                {c.name} <ArrowUpRight className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto mt-12 max-w-[1200px] px-3 md:px-5">
        <div className="sf-card p-8 text-center">
          <h2 className="text-lg font-semibold">Customer reviews</h2>
          <p className="sf-muted mt-1 text-sm">Reviews from real customers will appear here as they come in.</p>
        </div>
      </section>

      {waLink && (
        <section className="mx-auto mt-12 max-w-[1200px] px-3 md:px-5">
          <div className="sf-card flex flex-col items-center gap-4 p-8 text-center md:flex-row md:justify-between md:text-left">
            <div>
              <h2 className="text-xl font-semibold">Prefer to order on WhatsApp?</h2>
              <p className="sf-muted mt-1 text-sm">Tell us the watch you like and we will confirm availability and delivery.</p>
            </div>
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="sf-btn sf-btn-primary">
              <MessageCircle className="h-4 w-4" /> Chat with us
            </a>
          </div>
        </section>
      )}
    </div>
  );
}

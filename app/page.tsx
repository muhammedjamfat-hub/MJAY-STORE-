import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import ProductCard from "@/components/ProductCard";
import { Product, Category, StoreSettings } from "@/lib/types";
import { getWhatsAppLink } from "@/lib/whatsapp";
import { ShieldCheck, Truck, MessageCircle, Headphones, BadgeCheck } from "lucide-react";

export const revalidate = 60;

async function getData() {
  const supabase = supabaseServer();

  const [{ data: featured }, { data: bestsellers }, { data: newArrivals }, { data: categories }, { data: settings }] =
    await Promise.all([
      supabase.from("products").select("*").eq("active", true).eq("featured", true).limit(4),
      supabase.from("products").select("*").eq("active", true).eq("bestseller", true).limit(4),
      supabase.from("products").select("*").eq("active", true).eq("new_arrival", true).limit(4),
      supabase.from("categories").select("*"),
      supabase.from("store_settings").select("*").single(),
    ]);

  return {
    featured: (featured as Product[]) || [],
    bestsellers: (bestsellers as Product[]) || [],
    newArrivals: (newArrivals as Product[]) || [],
    categories: (categories as Category[]) || [],
    settings: settings as StoreSettings | null,
  };
}

export default async function HomePage() {
  const { featured, bestsellers, newArrivals, categories, settings } = await getData();
  const whatsappNumber = settings?.whatsapp_number || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "2347041629846";
  const waLink = getWhatsAppLink(whatsappNumber, "Hello MJAY STORE 👋 I'd like to ask about your watches.");

  return (
    <div>
      {/* HERO */}
      <section className="relative bg-nova-black text-white">
        <div className="container-nova py-24 md:py-36 text-center">
          <h1 className="font-serif text-4xl md:text-6xl font-semibold tracking-tight">
            TIME. STYLE. <span className="text-nova-gold">CONFIDENCE.</span>
          </h1>
          <p className="mt-6 text-white/70 max-w-xl mx-auto">
            Discover watches designed to elevate your everyday style.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/shop" className="btn-gold">Shop Watches</Link>
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn-whatsapp flex items-center gap-2 justify-center">
              <MessageCircle className="w-4 h-4" /> Order on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* FEATURED */}
      {featured.length > 0 && (
        <section className="container-nova py-16">
          <h2 className="font-serif text-2xl mb-8">Featured Watches</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {featured.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* BEST SELLERS */}
      {bestsellers.length > 0 && (
        <section className="container-nova py-16">
          <h2 className="font-serif text-2xl mb-8">Best Sellers</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {bestsellers.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* NEW ARRIVALS */}
      {newArrivals.length > 0 && (
        <section className="container-nova py-16">
          <h2 className="font-serif text-2xl mb-8">New Arrivals</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {newArrivals.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* SHOP BY CATEGORY */}
      {categories.length > 0 && (
        <section className="container-nova py-16">
          <h2 className="font-serif text-2xl mb-8">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/shop?category=${c.slug}`}
                className="bg-nova-charcoal text-white rounded-sm p-6 text-center hover:bg-nova-gold hover:text-nova-black transition-colors"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* WHY SHOP MJAY STORE */}
      <section className="bg-nova-cream py-16">
        <div className="container-nova">
          <h2 className="font-serif text-2xl mb-10 text-center">Why Shop MJAY STORE?</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 text-center">
            {[
              { icon: BadgeCheck, label: "Quality watches" },
              { icon: ShieldCheck, label: "Secure ordering" },
              { icon: Truck, label: "Fast delivery" },
              { icon: Headphones, label: "Customer support" },
              { icon: MessageCircle, label: "Easy WhatsApp ordering" },
            ].map((f, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <f.icon className="w-8 h-8 text-nova-gold" />
                <span className="text-sm">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHATSAPP CTA */}
      <section className="bg-nova-black text-white py-16 text-center">
        <div className="container-nova">
          <h2 className="font-serif text-2xl mb-4">Prefer to order on WhatsApp?</h2>
          <p className="text-white/70 mb-6">Chat with us directly and we'll help you find the perfect watch.</p>
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn-whatsapp inline-flex items-center gap-2">
            <MessageCircle className="w-4 h-4" /> Chat on WhatsApp
          </a>
        </div>
      </section>
    </div>
  );
}

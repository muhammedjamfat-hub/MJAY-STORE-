import { supabaseServer } from "@/lib/supabase-server";
import { Product, ProductVariation, StoreSettings } from "@/lib/types";
import ProductCard from "@/components/ProductCard";
import ProductGallery from "@/components/ProductGallery";
import ProductPurchasePanel from "@/components/ProductPurchasePanel";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

async function getProduct(slug: string) {
  const supabase = supabaseServer();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .single();

  if (!product) return null;

  const { data: variations } = await supabase
    .from("product_variations")
    .select("*")
    .eq("product_id", product.id);

  const { data: related } = await supabase
    .from("products")
    .select("*")
    .eq("category_id", product.category_id)
    .eq("active", true)
    .neq("id", product.id)
    .limit(4);

  const { data: settings } = await supabase.from("store_settings").select("*").single();

  return {
    product: product as Product,
    variations: (variations as ProductVariation[]) || [],
    related: (related as Product[]) || [],
    settings: settings as StoreSettings | null,
  };
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await getProduct(params.slug);
  if (!data) return { title: "Watch Not Found — MJAY STORE" };
  return {
    title: `${data.product.name} — MJAY STORE`,
    description: data.product.description || `Shop ${data.product.name} at MJAY STORE.`,
    openGraph: { images: data.product.images?.[0] ? [data.product.images[0]] : [] },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const data = await getProduct(params.slug);
  if (!data) notFound();
  const { product, variations, related, settings } = data;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images,
    description: product.description,
    sku: product.sku,
    brand: { "@type": "Brand", name: "MJAY STORE" },
    offers: {
      "@type": "Offer",
      priceCurrency: "NGN",
      price: product.price,
      availability:
        product.stock_quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="container-nova py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="grid md:grid-cols-2 gap-10">
        <ProductGallery images={product.images} name={product.name} />
        <ProductPurchasePanel
          product={product}
          variations={variations}
          whatsappNumber={settings?.whatsapp_number || "2347041629846"}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-10 mt-16 border-t border-black/10 pt-10">
        <div>
          <h2 className="font-serif text-xl mb-3">Description</h2>
          <p className="text-black/70 text-sm leading-relaxed whitespace-pre-line">
            {product.description || "No description available."}
          </p>
        </div>
        <div>
          <h2 className="font-serif text-xl mb-3">Delivery & Returns</h2>
          <ul className="text-black/70 text-sm space-y-2 leading-relaxed">
            <li>• Nationwide delivery across Nigeria. Fee is calculated at checkout based on your state.</li>
            <li>• Orders are typically dispatched within 24–48 hours of confirmation.</li>
            <li>• Pay on Delivery available in select locations, plus bank transfer and online payment.</li>
            <li>• Contact us on WhatsApp within 24 hours of delivery for any issues with your order.</li>
          </ul>
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-16 border-t border-black/10 pt-10">
          <h2 className="font-serif text-xl mb-6">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

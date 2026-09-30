import { MetadataRoute } from "next";
import { supabaseServer } from "@/lib/supabase-server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://mjay-store.com";
  const supabase = supabaseServer();
  const { data: products } = await supabase.from("products").select("slug, updated_at").eq("active", true);

  const staticRoutes = ["", "/shop", "/about", "/contact", "/track-order"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));

  const productRoutes = (products || []).map((p) => ({
    url: `${base}/product/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
  }));

  return [...staticRoutes, ...productRoutes];
}

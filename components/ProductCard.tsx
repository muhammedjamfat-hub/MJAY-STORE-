import Link from "next/link";
import Image from "next/image";
import { Product } from "@/lib/types";

export default function ProductCard({ product }: { product: Product } & Record<string, unknown>) {
  const price = Number(product.price);
  const compare = product.compare_at_price ? Number(product.compare_at_price) : 0;
  const discount = compare > price ? Math.round(100 - (price / compare) * 100) : 0;
  const out = product.stock_quantity <= 0;
  const image = product.images && product.images.length > 0 ? product.images[0] : null;

  return (
    <Link href={`/product/${product.slug}`} className="sf-card group block overflow-hidden p-2">
      <div className="relative aspect-square overflow-hidden rounded-xl" style={{ background: "var(--sf-track)" }}>
        {image ? (
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="sf-muted flex h-full w-full items-center justify-center text-sm font-semibold">MJAY</div>
        )}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {discount > 0 && !out && <span className="sf-chip is-on">-{discount}%</span>}
          {out && <span className="sf-chip">Out of stock</span>}
        </div>
      </div>
      <div className="px-1.5 pb-1.5 pt-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{product.name}</h3>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
          <span className="text-base font-semibold">₦{price.toLocaleString()}</span>
          {compare > price && <span className="sf-muted text-xs line-through">₦{compare.toLocaleString()}</span>}
        </div>
      </div>
    </Link>
  );
      }

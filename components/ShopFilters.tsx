"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Category } from "@/lib/types";

export default function ShopFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") || "");

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const active = searchParams.get("category");

  return (
    <div className="sf-card space-y-3 p-3 md:p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateParam("q", q.trim() || null);
          }}
          className="relative flex-1"
        >
          <Search className="sf-muted pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search watches" className="sf-input w-full pl-9" />
        </form>

        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min ₦"
            defaultValue={searchParams.get("minPrice") || ""}
            onBlur={(e) => updateParam("minPrice", e.target.value || null)}
            className="sf-input w-24"
          />
          <span className="sf-muted text-sm">–</span>
          <input
            type="number"
            placeholder="Max ₦"
            defaultValue={searchParams.get("maxPrice") || ""}
            onBlur={(e) => updateParam("maxPrice", e.target.value || null)}
            className="sf-input w-24"
          />
        </div>

        <select
          value={searchParams.get("sort") || ""}
          onChange={(e) => updateParam("sort", e.target.value || null)}
          className="sf-input"
        >
          <option value="">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="bestselling">Best selling</option>
        </select>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => updateParam("category", null)} className={`sf-chip shrink-0 py-2 ${!active ? "is-on" : ""}`}>
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => updateParam("category", c.slug)}
            className={`sf-chip shrink-0 py-2 ${active === c.slug ? "is-on" : ""}`}
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}

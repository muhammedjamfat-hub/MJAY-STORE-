"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, Menu, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useState } from "react";

export default function Header() {
  const { itemCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "/shop", label: "Shop" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
    { href: "/track-order", label: "Track Order" },
  ];

  return (
    <header className="bg-nova-black text-white sticky top-0 z-50">
      <div className="container-nova flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/mjay-logo.svg" alt="MJAY STORE" width={180} height={52} className="h-10 w-auto" />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm tracking-wide hover:text-nova-gold transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/cart" className="relative" aria-label="View cart">
            <ShoppingBag className="w-6 h-6" />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-nova-gold text-nova-black text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold">
                {itemCount}
              </span>
            )}
          </Link>
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="md:hidden bg-nova-charcoal px-4 pb-4 flex flex-col gap-3">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="py-2 text-sm tracking-wide"
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

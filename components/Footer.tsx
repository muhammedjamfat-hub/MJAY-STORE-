import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-nova-black text-white/70 mt-24">
      <div className="container-nova py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h3 className="font-serif text-xl text-nova-gold mb-3 flex items-center gap-2">
            <img src="/mjay-logo.svg" alt="MJAY STORE" className="w-28 h-auto rounded-sm" />
          </h3>
          <p className="text-sm">Time. Style. Confidence. Premium watches, delivered across Nigeria.</p>
        </div>
        <div>
          <h4 className="text-white font-medium mb-3 text-sm tracking-wide">Shop</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/shop">All Watches</Link></li>
            <li><Link href="/track-order">Track Order</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-medium mb-3 text-sm tracking-wide">Company</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/about">About Us</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-medium mb-3 text-sm tracking-wide">Support</h4>
          <p className="text-sm">We reply fastest on WhatsApp.</p>
        </div>
      </div>
      <div className="border-t border-white/10 py-6 text-center text-xs">
        © {new Date().getFullYear()} MJAY STORE. All rights reserved.
      </div>
    </footer>
  );
}

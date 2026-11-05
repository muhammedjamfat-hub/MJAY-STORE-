import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./store.css";
import { CartProvider } from "@/context/CartContext";
import MetaPixel from "@/components/MetaPixel";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import StoreShell from "@/components/StoreShell";

export const metadata: Metadata = {
  title: "MJAY STORE — Premium Watches in Nigeria",
  description:
    "Discover watches designed to elevate your everyday style. Shop men's, women's and luxury-style watches with delivery across Nigeria.",
  manifest: "/manifest.json",
  icons: { icon: "/novahaus-logo.png" },
  openGraph: {
    title: "MJAY STORE — Premium Watches in Nigeria",
    description: "Time. Style. Confidence. Shop watches at MJAY STORE.",
    type: "website",
    images: ["/novahaus-logo.png"],
  },
  verification: {
    google: "MRKFjcs-t3ot9WBsI0a8k3h0Se62U9Cj6L732kRw254",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ec" },
    { media: "(prefers-color-scheme: dark)", color: "#100f0b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <MetaPixel />
        <ServiceWorkerRegister />
        <CartProvider>
          <StoreShell>{children}</StoreShell>
        </CartProvider>
      </body>
    </html>
  );
  }

import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MetaPixel from "@/components/MetaPixel";

export const metadata: Metadata = {
  title: "NOVAHAUS — Premium Watches in Nigeria",
  description:
    "Discover watches designed to elevate your everyday style. Shop premium men's, women's, and luxury watches with fast Nigeria-wide delivery.",
  manifest: "/manifest.json",
  icons: { icon: "/novahaus-logo.png" },
  openGraph: {
    title: "NOVAHAUS — Premium Watches in Nigeria",
    description: "Time. Style. Confidence. Shop premium watches at NOVAHAUS.",
    type: "website",
    images: ["/novahaus-logo.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased flex flex-col min-h-screen">
        <MetaPixel />
        <CartProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}

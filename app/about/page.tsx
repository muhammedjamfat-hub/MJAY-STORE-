import type { Metadata } from "next";

export const metadata: Metadata = { title: "About MJAY STORE" };

export default function AboutPage() {
  return (
    <div className="container-nova py-16 max-w-2xl">
      <h1 className="font-serif text-3xl mb-6">About MJAY STORE</h1>
      <div className="space-y-4 text-black/70 leading-relaxed">
        <p>
          MJAY STORE is a Nigerian watch store built for people who value time, style, and quiet confidence.
          Every piece in our collection is chosen to be worn every day — in the office, on a night out, or
          anywhere you want to feel put together.
        </p>
        <p>
          We keep the shopping experience simple: browse online, order by WhatsApp or checkout directly,
          and get your watch delivered wherever you are in Nigeria.
        </p>
        <p>
          Have a question before you order? Reach us any time on WhatsApp — we're happy to help you find
          the right piece.
        </p>
      </div>
    </div>
  );
}

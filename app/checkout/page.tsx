"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { DeliveryFee, StoreSettings } from "@/lib/types";

type PaymentMethod = "bank_transfer";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const [deliveryFees, setDeliveryFees] = useState<DeliveryFee[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [paymentMethod] = useState<PaymentMethod>("bank_transfer");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    whatsapp: "",
    email: "",
    state: "",
    city: "",
    address: "",
    deliveryInstructions: "",
  });

  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase
      .from("delivery_fees")
      .select("*")
      .then(({ data }) => setDeliveryFees((data as DeliveryFee[]) || []));
    supabase
      .from("store_settings")
      .select("*")
      .single()
      .then(({ data }) => setSettings(data as StoreSettings));
  }, []);

  const deliveryFee =
    deliveryFees.find((d) => d.state === form.state)?.fee ??
    deliveryFees.find((d) => d.state === "Other")?.fee ??
    0;
  const total = subtotal + deliveryFee;

  if (items.length === 0) {
    return (
      <div className="container-nova py-24 text-center">
        <p className="text-black/60 mb-6">Your cart is empty.</p>
        <Link href="/shop" className="btn-gold inline-block">
          Continue Shopping
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: form,
          paymentMethod,
          items: items.map((i) => ({
            productId: i.productId,
            variationId: i.variationId,
            quantity: i.quantity,
          })),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "We couldn't place your order. Please check your details and try again.");
        setSubmitting(false);
        return;
      }

      clearCart();
      router.push(`/order-success/${data.orderNumber}?oid=${data.orderId}`);
    } catch (err) {
      console.error(err);
      setError("We couldn't place your order. Please check your details and try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="container-nova py-12">
      <h1 className="font-serif text-3xl mb-8">Checkout</h1>

      <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-10">
        <div className="md:col-span-2 space-y-8">
          <section>
            <h2 className="font-serif text-lg mb-4">Customer Information</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <input
                required
                placeholder="Full name"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="border border-black/15 rounded-sm p-3 text-sm"
              />
              <input
                required
                placeholder="Phone number"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="border border-black/15 rounded-sm p-3 text-sm"
              />
              <input
                placeholder="WhatsApp number (if different)"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                className="border border-black/15 rounded-sm p-3 text-sm"
              />
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="border border-black/15 rounded-sm p-3 text-sm"
              />
            </div>
          </section>

          <section>
            <h2 className="font-serif text-lg mb-4">Delivery</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <select
                required
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="border border-black/15 rounded-sm p-3 text-sm"
              >
                <option value="">Select state</option>
                {deliveryFees.map((d) => (
                  <option key={d.state} value={d.state}>
                    {d.state}
                  </option>
                ))}
              </select>
              <input
                required
                placeholder="City"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="border border-black/15 rounded-sm p-3 text-sm"
              />
            </div>
            <textarea
              required
              placeholder="Full delivery address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="border border-black/15 rounded-sm p-3 text-sm w-full mt-4"
              rows={2}
            />
            <textarea
              placeholder="Delivery instructions (optional)"
              value={form.deliveryInstructions}
              onChange={(e) => setForm({ ...form, deliveryInstructions: e.target.value })}
              className="border border-black/15 rounded-sm p-3 text-sm w-full mt-4"
              rows={2}
            />
          </section>

          <section>
            <h2 className="font-serif text-lg mb-4">Payment Method</h2>
            <div className="border border-nova-gold bg-nova-cream rounded-sm p-4 text-sm">
              Bank Transfer
              <p className="text-black/60 text-xs mt-1">
                MJAY STORE currently accepts payment by bank transfer only.
              </p>
            </div>

            {settings && (
              <div className="mt-4 bg-nova-cream rounded-sm p-4 text-sm space-y-1">
                <p className="font-medium">Transfer the exact total to:</p>
                <p>Bank: {settings.bank_name}</p>
                <p>Account Name: {settings.bank_account_name}</p>
                <p>Account Number: {settings.bank_account_number}</p>
                <p className="font-medium mt-2">Amount: ₦{total.toLocaleString()}</p>
                <p className="text-black/60 mt-2">
                  After placing your order, you'll be able to upload your payment receipt on the order
                  confirmation page.
                </p>
              </div>
            )}
          </section>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-gold w-full sm:w-auto">
            {submitting ? "Processing order..." : "Place Order"}
          </button>
        </div>

        <div className="bg-nova-cream rounded-sm p-6 h-fit">
          <h2 className="font-serif text-lg mb-4">Order Summary</h2>
          <div className="space-y-3 mb-4">
            {items.map((item) => (
              <div key={`${item.productId}-${item.variationId}`} className="flex justify-between text-sm">
                <span>
                  {item.productName}
                  {item.variationName ? ` (${item.variationName})` : ""} × {item.quantity}
                </span>
                <span>₦{(item.unitPrice * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-black/10 pt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₦{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span>{form.state ? `₦${deliveryFee.toLocaleString()}` : "Select a state"}</span>
            </div>
            <div className="flex justify-between font-semibold text-base border-t border-black/10 pt-2">
              <span>Total</span>
              <span>₦{total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

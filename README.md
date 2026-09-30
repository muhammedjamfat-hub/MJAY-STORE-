# MJAY STORE

A production-ready ecommerce site for a premium Nigerian wristwatch store —
Next.js 14 + TypeScript + Tailwind + Supabase (Postgres, Auth, Storage).

Everything is real and connected: cart, checkout, order creation, stock
management, WhatsApp ordering, bank transfer with receipt upload + admin
verification, and a Paystack integration that activates the moment you add
your keys. Nothing here is a mockup — every button is wired to the database.

---

## 1. Create your accounts (10 minutes)

1. **Supabase** — supabase.com → New Project. Note your **Project URL**,
   **anon public key**, and **service_role key** (Project Settings → API).
2. **GitHub** — create an empty repository.
3. **Vercel** — vercel.com → sign in with GitHub.
4. **Paystack** (optional, can be added later) — paystack.com. Free to sign
   up; test keys work immediately, live payouts need ID verification (see
   note below).

## 2. Set up the database (5 minutes)

1. In Supabase: **SQL Editor → New Query**.
2. Paste the entire contents of `supabase/schema.sql` and click **Run**.
   This creates every table, security policy, the two storage buckets
   (`product-images`, `payment-receipts`), seed categories, seed delivery
   fees, and 5 sample watches so you have something to test with.
3. Go to **Storage** and confirm `product-images` (public) and
   `payment-receipts` (private) both exist.

## 3. Create your admin account

1. Run the site locally first (`npm install && npm run dev`, see below) or
   deploy it, then visit `/admin/login` and try signing up — actually,
   sign-up isn't exposed on `/admin/login` on purpose (admin accounts
   shouldn't be self-service). Instead:
   - Go to Supabase → **Authentication → Users → Add User**, create your
     admin email + password there directly.
2. Back in the SQL Editor, run:
   ```sql
   update profiles set role = 'admin' where id = '<paste-the-user-uuid>';
   ```
3. Now log in at `/admin/login` with that email/password.

## 4. Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev
```

Visit `http://localhost:3000`.

## 5. Deploy to Vercel

1. Push this project to your GitHub repo.
2. In Vercel: **Add New Project** → import that repo.
3. Add the environment variables below (Project Settings → Environment
   Variables) — same names as `.env.example`.
4. Deploy. Vercel gives you a live `.vercel.app` URL immediately; add your
   own domain afterward under Project Settings → Domains.
5. Update `NEXT_PUBLIC_APP_URL` to your real domain once it's live, and
   redeploy (Paystack callback URLs and the sitemap depend on it).

---

## Environment variables checklist

| Variable | Required to launch? | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | Supabase → Project Settings → API (keep secret) |
| `NEXT_PUBLIC_APP_URL` | ✅ Yes | Your production domain |
| `PAYSTACK_SECRET_KEY` | ⏳ Later | Paystack → Settings → API Keys |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | ⏳ Later | Paystack → Settings → API Keys |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Optional fallback | Set the real number in `/admin/settings` instead |

**Until `PAYSTACK_SECRET_KEY` is set**, the "Online Payment" option on
checkout shows a clear message telling the customer to use Bank Transfer or
Pay on Delivery instead — it never fakes a successful payment.

Also set the Paystack webhook URL once you have a domain:
`https://your-domain.com/api/payment/paystack/webhook` (Paystack Dashboard
→ Settings → API Keys & Webhooks).

---

## Day-to-day store management

Everything below is done from `/admin` — no code changes needed:

- **Products** — add/edit/delete, upload images, set price/stock/variations,
  mark featured/bestseller/new arrival.
- **Orders** — view all orders, update order status and payment status,
  add internal notes.
- **Payment Verification** — review bank transfer receipts, confirm or
  reject each one.
- **Settings** — store name, WhatsApp number, support contact, bank
  transfer details, Paystack public key, social links.
- **Delivery Fees** — add/edit/remove per-state fees; anything not listed
  falls back to the "Other" fee.

## How stock and pricing stay trustworthy

- Every price shown to a customer is looked up fresh from the database at
  checkout — the browser never gets to decide what something costs.
- Order totals are recalculated server-side inside a single database
  transaction (`create_order` in `schema.sql`), which also checks and
  reserves stock atomically — two people buying the last watch at the same
  moment can't both succeed.
- For online payments, stock is only deducted after Paystack confirms the
  transaction server-side (both via redirect verification and a webhook,
  so it's reliable even if the customer closes the tab).
- Bank transfer receipts only ever move an order to
  `verification_pending` — an admin must manually confirm or reject before
  it's treated as paid.

## Replacing the sample products

The 5 seed watches in `schema.sql` are development placeholders using
Unsplash stock photos. Delete or edit them from `/admin/products` and
upload your real product photos — they go straight into Supabase Storage.

## Updating settings after the database is already set up

If you already ran `schema.sql` before this change, run this once in the
Supabase SQL Editor to apply the current WhatsApp number and bank-transfer-only
payment setup without re-running the whole script:

```sql
update store_settings
set whatsapp_number = '2347041629846',
    support_phone = '2347041629846'
where id = 1;
```

(You can also just edit these from `/admin/settings` — no SQL needed.)

MJAY STORE currently accepts **Bank Transfer only** at checkout — Pay on
Delivery and Paystack were removed from the customer-facing flow. The
Paystack integration code is still in the project (API routes, webhook)
in case you want to re-enable online payment later; it's simply not
offered as a checkout option right now.



Paystack requires ID + proof of address for a "Starter" (individual)
account — no registered business needed. It usually takes a few days. The
store works fully without it: Bank Transfer and Pay on Delivery are live
from day one, and Online Payment activates automatically the moment you
add your `PAYSTACK_SECRET_KEY`.

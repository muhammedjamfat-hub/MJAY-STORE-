-- ============================================================
-- MJAY STORE — SUPABASE SCHEMA
-- Run this entire file in Supabase SQL Editor (one time setup)
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES / ROLES
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz default now()
);

-- Auto-create profile row when a new auth user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'customer');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- CATEGORIES
-- ============================================================
create table if not exists categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz default now()
);

-- ============================================================
-- PRODUCTS
-- ============================================================
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  description text,
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2),
  category_id uuid references categories(id),
  brand text default 'MJAY STORE',
  sku text unique,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  images text[] default '{}',
  featured boolean default false,
  bestseller boolean default false,
  new_arrival boolean default false,
  active boolean default true,
  rating numeric(2,1) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_products_slug on products(slug);
create index if not exists idx_products_category on products(category_id);
create index if not exists idx_products_active on products(active);

-- ============================================================
-- PRODUCT VARIATIONS
-- ============================================================
create table if not exists product_variations (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  variation_name text not null, -- e.g. "Black / Leather"
  sku text unique,
  price numeric(12,2),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  image text,
  created_at timestamptz default now()
);

create index if not exists idx_variations_product on product_variations(product_id);

-- ============================================================
-- DELIVERY FEES (admin-configurable, not hardcoded)
-- ============================================================
create table if not exists delivery_fees (
  id uuid primary key default uuid_generate_v4(),
  state text not null unique,
  fee numeric(12,2) not null default 0,
  updated_at timestamptz default now()
);

-- ============================================================
-- STORE SETTINGS (single row config table)
-- ============================================================
create table if not exists store_settings (
  id int primary key default 1,
  store_name text default 'MJAY STORE',
  whatsapp_number text default '2347041629846',
  support_phone text default '2347041629846',
  support_email text default 'support@mjay-store.com',
  store_address text default 'Lagos, Nigeria',
  paystack_public_key text,
  bank_name text default 'Kuda',
  bank_account_name text default 'ATITEBI AMAULA AHMAD',
  bank_account_number text default '2084167602',
  instagram_url text,
  twitter_url text,
  facebook_url text,
  constraint single_row check (id = 1)
);

insert into store_settings (id) values (1) on conflict (id) do nothing;

-- ============================================================
-- ORDERS
-- ============================================================
create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text not null unique,
  customer_id uuid references auth.users(id),
  customer_name text not null,
  phone text not null,
  whatsapp text,
  email text,
  state text not null,
  city text not null,
  address text not null,
  delivery_instructions text,
  subtotal numeric(12,2) not null,
  delivery_fee numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  payment_method text not null check (payment_method in ('pay_on_delivery','paystack','bank_transfer')),
  payment_status text not null default 'pending' check (payment_status in ('pending','verification_pending','paid','failed','rejected')),
  order_status text not null default 'pending' check (order_status in ('pending','confirmed','processing','shipped','out_for_delivery','delivered','cancelled')),
  paystack_reference text,
  receipt_url text,
  admin_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_orders_number on orders(order_number);
create index if not exists idx_orders_phone on orders(phone);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
create table if not exists order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id),
  variation_id uuid references product_variations(id),
  product_name text not null,
  variation_name text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  total_price numeric(12,2) not null
);

create index if not exists idx_order_items_order on order_items(order_id);

-- ============================================================
-- ORDER NUMBER GENERATOR: MJ-2026-00001
-- ============================================================
create sequence if not exists order_number_seq start 1;

create or replace function generate_order_number()
returns text as $$
declare
  next_val int;
  yr text;
begin
  next_val := nextval('order_number_seq');
  yr := to_char(now(), 'YYYY');
  return 'MJ-' || yr || '-' || lpad(next_val::text, 5, '0');
end;
$$ language plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table product_variations enable row level security;
alter table delivery_fees enable row level security;
alter table store_settings enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- Helper: check if current user is admin
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- PROFILES: users see their own row; admins see all
create policy "profiles_select_own_or_admin" on profiles
  for select using (auth.uid() = id or is_admin());
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- CATEGORIES / PRODUCTS / VARIATIONS: public read, admin write
create policy "categories_public_read" on categories for select using (true);
create policy "categories_admin_write" on categories for all using (is_admin()) with check (is_admin());

create policy "products_public_read" on products for select using (active = true or is_admin());
create policy "products_admin_write" on products for all using (is_admin()) with check (is_admin());

create policy "variations_public_read" on product_variations for select using (true);
create policy "variations_admin_write" on product_variations for all using (is_admin()) with check (is_admin());

-- DELIVERY FEES / SETTINGS: public read (needed at checkout), admin write
create policy "delivery_public_read" on delivery_fees for select using (true);
create policy "delivery_admin_write" on delivery_fees for all using (is_admin()) with check (is_admin());

create policy "settings_public_read" on store_settings for select using (true);
create policy "settings_admin_write" on store_settings for update using (is_admin());

-- ORDERS: customers can create orders (no auth required — guest checkout),
-- but can only READ their own order via server-side route (service role),
-- never directly list all orders. Admin can do everything.
create policy "orders_admin_all" on orders for all using (is_admin()) with check (is_admin());
create policy "orders_insert_anyone" on orders for insert with check (true);
-- Note: direct customer SELECT on orders table is intentionally NOT granted.
-- Order tracking is done through a server-side API route (using the service
-- role key) that validates order_number + phone before returning data.
-- This prevents guessing order numbers to read arbitrary orders via the API.

create policy "order_items_admin_all" on order_items for all using (is_admin()) with check (is_admin());
create policy "order_items_insert_anyone" on order_items for insert with check (true);

-- ============================================================
-- SEED DATA: CATEGORIES
-- ============================================================
insert into categories (name, slug) values
  ('Men''s Watches', 'mens-watches'),
  ('Women''s Watches', 'womens-watches'),
  ('Luxury Watches', 'luxury-watches'),
  ('Classic Watches', 'classic-watches'),
  ('Couple Watches', 'couple-watches'),
  ('Smart Watches', 'smart-watches')
on conflict (slug) do nothing;

-- ============================================================
-- SEED DATA: DELIVERY FEES
-- ============================================================
insert into delivery_fees (state, fee) values
  ('Lagos', 2500),
  ('Kwara', 3500),
  ('Abuja', 3000),
  ('Other', 4500)
on conflict (state) do nothing;

-- ============================================================
-- SEED DATA: PRODUCTS (development placeholders — replace later)
-- ============================================================
insert into products (name, slug, description, price, compare_at_price, category_id, sku, stock_quantity, images, featured, bestseller, new_arrival, rating)
select
  p.name, p.slug, p.description, p.price, p.compare_at_price,
  (select id from categories where slug = p.cat_slug),
  p.sku, p.stock, p.images, p.featured, p.bestseller, p.new_arrival, p.rating
from (values
  ('MJAY STORE Classic Black', 'mjay-classic-black',
   'A timeless black-dial watch with a stainless steel case, built for everyday sophistication.',
   45000, 55000, 'classic-watches', 'MJ-CB-001', 25,
   array['https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800'],
   true, true, false, 4.5),
  ('MJAY STORE Executive Gold', 'mjay-executive-gold',
   'Gold-tone executive watch designed for boardrooms and big moments.',
   68000, 80000, 'luxury-watches', 'MJ-EG-002', 15,
   array['https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=800'],
   true, false, true, 4.8),
  ('MJAY STORE Chronograph Silver', 'mjay-chronograph-silver',
   'Precision chronograph with a brushed silver finish and leather strap.',
   52000, null, 'mens-watches', 'MJ-CS-003', 20,
   array['https://images.unsplash.com/photo-1533139502658-0198f920d8e8?w=800'],
   false, true, false, 4.3),
  ('MJAY STORE Minimal Leather', 'mjay-minimal-leather',
   'A minimalist dial paired with genuine leather — quiet elegance for daily wear.',
   38000, null, 'womens-watches', 'MJ-ML-004', 30,
   array['https://images.unsplash.com/photo-1508057198894-247b23fe5ade?w=800'],
   false, false, true, 4.6),
  ('MJAY STORE Prestige', 'mjay-prestige',
   'Our flagship piece — a statement watch for those who value distinction.',
   95000, 110000, 'luxury-watches', 'MJ-PR-005', 8,
   array['https://images.unsplash.com/photo-1548171915-e79a380a2a4b?w=800'],
   true, true, true, 4.9)
) as p(name, slug, description, price, compare_at_price, cat_slug, sku, stock, images, featured, bestseller, new_arrival, rating)
on conflict (slug) do nothing;

-- ============================================================
-- STORAGE BUCKETS (run once — or create via Supabase Dashboard > Storage)
-- ============================================================
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) values ('payment-receipts', 'payment-receipts', false)
on conflict (id) do nothing;

-- Storage policies: product images public read, admin write
create policy "product_images_public_read" on storage.objects for select
  using (bucket_id = 'product-images');
create policy "product_images_admin_write" on storage.objects for insert
  with check (bucket_id = 'product-images' and is_admin());
create policy "product_images_admin_delete" on storage.objects for delete
  using (bucket_id = 'product-images' and is_admin());

-- Receipts: nobody can list/read directly from client (private bucket).
-- Upload allowed for anyone (guest checkout uploads their own receipt);
-- reading is only done server-side (service role) in the admin dashboard.
create policy "receipts_anyone_upload" on storage.objects for insert
  with check (bucket_id = 'payment-receipts');
create policy "receipts_admin_read" on storage.objects for select
  using (bucket_id = 'payment-receipts' and is_admin());

-- ============================================================
-- ORDER CREATION RPC — atomic, trusted-price, stock-safe
-- Called from the server (service role) only. Recomputes every price
-- and validates every stock level from the database itself — nothing
-- from the browser is trusted for money math.
-- ============================================================
create or replace function create_order(
  p_customer_name text,
  p_phone text,
  p_whatsapp text,
  p_email text,
  p_state text,
  p_city text,
  p_address text,
  p_delivery_instructions text,
  p_payment_method text,
  p_reserve_stock boolean,
  p_items jsonb -- [{ "product_id": "...", "variation_id": "..."|null, "quantity": n }]
)
returns jsonb as $$
declare
  v_delivery_fee numeric(12,2);
  v_subtotal numeric(12,2) := 0;
  v_total numeric(12,2);
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_product products%rowtype;
  v_variation product_variations%rowtype;
  v_unit_price numeric(12,2);
  v_stock integer;
  v_line_total numeric(12,2);
  v_qty integer;
begin
  if jsonb_array_length(p_items) = 0 then
    raise exception 'CART_EMPTY';
  end if;

  select fee into v_delivery_fee from delivery_fees where state = p_state;
  if v_delivery_fee is null then
    select fee into v_delivery_fee from delivery_fees where state = 'Other';
  end if;
  v_delivery_fee := coalesce(v_delivery_fee, 0);

  v_order_number := generate_order_number();

  insert into orders (
    order_number, customer_name, phone, whatsapp, email, state, city, address,
    delivery_instructions, subtotal, delivery_fee, total, payment_method,
    payment_status, order_status
  ) values (
    v_order_number, p_customer_name, p_phone, p_whatsapp, p_email, p_state, p_city, p_address,
    p_delivery_instructions, 0, v_delivery_fee, 0, p_payment_method,
    'pending', 'pending'
  ) returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::integer;
    if v_qty is null or v_qty < 1 then
      raise exception 'INVALID_QUANTITY';
    end if;

    select * into v_product from products where id = (v_item->>'product_id')::uuid and active = true;
    if not found then
      raise exception 'PRODUCT_UNAVAILABLE: %', (v_item->>'product_id');
    end if;

    if (v_item->>'variation_id') is not null and v_item->>'variation_id' != 'null' then
      select * into v_variation from product_variations where id = (v_item->>'variation_id')::uuid;
      if not found then
        raise exception 'VARIATION_UNAVAILABLE';
      end if;
      v_unit_price := coalesce(v_variation.price, v_product.price);
      v_stock := v_variation.stock_quantity;
    else
      v_unit_price := v_product.price;
      v_stock := v_product.stock_quantity;
    end if;

    if v_stock < v_qty then
      raise exception 'INSUFFICIENT_STOCK: %', v_product.name;
    end if;

    v_line_total := v_unit_price * v_qty;
    v_subtotal := v_subtotal + v_line_total;

    insert into order_items (order_id, product_id, variation_id, product_name, variation_name, quantity, unit_price, total_price)
    values (
      v_order_id, v_product.id,
      case when (v_item->>'variation_id') is not null and v_item->>'variation_id' != 'null' then v_variation.id else null end,
      v_product.name,
      case when (v_item->>'variation_id') is not null and v_item->>'variation_id' != 'null' then v_variation.variation_name else null end,
      v_qty, v_unit_price, v_line_total
    );

    if p_reserve_stock then
      if (v_item->>'variation_id') is not null and v_item->>'variation_id' != 'null' then
        update product_variations set stock_quantity = stock_quantity - v_qty where id = v_variation.id;
      else
        update products set stock_quantity = stock_quantity - v_qty where id = v_product.id;
      end if;
    end if;
  end loop;

  v_total := v_subtotal + v_delivery_fee;
  update orders set subtotal = v_subtotal, total = v_total where id = v_order_id;

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'delivery_fee', v_delivery_fee,
    'total', v_total
  );
end;
$$ language plpgsql security definer;

-- ============================================================
-- CONFIRM PAYSTACK ORDER — called after server-side payment verification.
-- Decrements stock now (it wasn't reserved at order creation time for
-- online payments) and flips payment/order status.
-- ============================================================
create or replace function confirm_paystack_order(p_order_id uuid, p_reference text)
returns jsonb as $$
declare
  v_item order_items%rowtype;
  v_oversold boolean := false;
begin
  for v_item in select * from order_items where order_id = p_order_id
  loop
    if v_item.variation_id is not null then
      update product_variations set stock_quantity = greatest(0, stock_quantity - v_item.quantity)
        where id = v_item.variation_id and stock_quantity >= v_item.quantity;
      if not found then v_oversold := true; end if;
    else
      update products set stock_quantity = greatest(0, stock_quantity - v_item.quantity)
        where id = v_item.product_id and stock_quantity >= v_item.quantity;
      if not found then v_oversold := true; end if;
    end if;
  end loop;

  update orders set
    payment_status = 'paid',
    order_status = 'confirmed',
    paystack_reference = p_reference,
    admin_notes = case when v_oversold then coalesce(admin_notes || E'\n', '') ||
      'STOCK CONFLICT: one or more items sold out before payment cleared. Contact customer.' else admin_notes end,
    updated_at = now()
  where id = p_order_id;

  return jsonb_build_object('oversold', v_oversold);
end;
$$ language plpgsql security definer;

-- ============================================================
-- DONE. Next step: create your first admin user.
-- 1. Sign up normally through the site (or Supabase Auth dashboard).
-- 2. Then run:
--    update profiles set role = 'admin' where id = '<your-user-uuid>';
-- ============================================================

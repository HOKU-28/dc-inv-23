-- WARNING: This drops the existing items, stock_logs, and sales tables
-- and recreates them with the correct schema. Only run this if you are
-- okay with losing any existing data in those tables.

DROP TABLE IF EXISTS public.sales CASCADE;
DROP TABLE IF EXISTS public.stock_logs CASCADE;
DROP TABLE IF EXISTS public.items CASCADE;
DROP TABLE IF EXISTS public.stock_in_logs CASCADE;
DROP TABLE IF EXISTS public.shopping_list CASCADE;

-- Items table
CREATE TABLE public.items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  category TEXT NOT NULL,
  min_stock NUMERIC NOT NULL,
  check_frequency_days INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  barcode TEXT,
  location TEXT,
  updated_at BIGINT
);

-- Stock logs table
CREATE TABLE public.stock_logs (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('in', 'check', 'add', 'archive')),
  qty NUMERIC NOT NULL,
  date TEXT NOT NULL,
  note TEXT,
  recorded_by TEXT,
  created_at BIGINT NOT NULL
);

-- Sales table
CREATE TABLE public.sales (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  qty NUMERIC NOT NULL,
  date TEXT NOT NULL,
  note TEXT,
  created_at BIGINT NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read/write for the exposed anon key.
CREATE POLICY "Allow anonymous select on items" ON public.items FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anonymous insert on items" ON public.items FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous update on items" ON public.items FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous delete on items" ON public.items FOR DELETE TO anon USING (true);

CREATE POLICY "Allow anonymous select on stock_logs" ON public.stock_logs FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anonymous insert on stock_logs" ON public.stock_logs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous update on stock_logs" ON public.stock_logs FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous delete on stock_logs" ON public.stock_logs FOR DELETE TO anon USING (true);

CREATE POLICY "Allow anonymous select on sales" ON public.sales FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anonymous insert on sales" ON public.sales FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous update on sales" ON public.sales FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous delete on sales" ON public.sales FOR DELETE TO anon USING (true);

-- Refresh PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';

-- ============================================================
--  SaasNegociosFast — Schema corregido
--  Ejecuta completo en Supabase > SQL Editor
-- ============================================================

-- ── RESET SEGURO (elimina todo para empezar limpio) ──────────
DROP TRIGGER  IF EXISTS on_auth_user_created            ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user()        CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin()         CASCADE;
DROP FUNCTION IF EXISTS public.my_business_id()         CASCADE;
DROP FUNCTION IF EXISTS public.confirmar_pedido(uuid,text,text,text,jsonb) CASCADE;

DROP TABLE IF EXISTS public.order_items  CASCADE;
DROP TABLE IF EXISTS public.orders       CASCADE;
DROP TABLE IF EXISTS public.products     CASCADE;
DROP TABLE IF EXISTS public.categories   CASCADE;
DROP TABLE IF EXISTS public.businesses   CASCADE;
DROP TABLE IF EXISTS public.profiles     CASCADE;
DROP TABLE IF EXISTS public.plans        CASCADE;

DROP TYPE IF EXISTS public.order_status  CASCADE;

-- ── 1. PLANES ────────────────────────────────────────────────
CREATE TABLE public.plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          text NOT NULL,
  precio_mxn      int  NOT NULL DEFAULT 0,
  max_productos   int  NOT NULL DEFAULT 10,
  max_pedidos_mes int  NOT NULL DEFAULT 50,
  created_at      timestamptz DEFAULT now()
);

INSERT INTO public.plans (nombre, precio_mxn, max_productos, max_pedidos_mes) VALUES
  ('Gratis', 0,   10,   30),
  ('Básico', 199, 50,  300),
  ('Pro',    399, 999, 9999);

-- ── 2. PERFILES ──────────────────────────────────────────────
CREATE TABLE public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text NOT NULL,
  role       text NOT NULL DEFAULT 'owner' CHECK (role IN ('super_admin', 'owner')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas separadas por operación (corrección crítica)
-- INSERT: permite que el trigger inserte el perfil del usuario nuevo
CREATE POLICY "profiles: insert propio" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- SELECT: cada usuario ve solo su perfil
CREATE POLICY "profiles: select propio" ON public.profiles
  FOR SELECT USING ((select auth.uid()) = id);

-- UPDATE: cada usuario edita solo su perfil
CREATE POLICY "profiles: update propio" ON public.profiles
  FOR UPDATE USING ((select auth.uid()) = id);

-- ── 3. TRIGGER — crear perfil al registrarse ─────────────────
-- SET search_path = '' es obligatorio en Supabase para SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'owner')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 4. NEGOCIOS ──────────────────────────────────────────────
CREATE TABLE public.businesses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  nombre         text NOT NULL,
  slug           text NOT NULL UNIQUE,
  descripcion    text,
  logo_url       text,
  color_primario text DEFAULT '#a855f7',
  horario        text,
  plan_id        uuid REFERENCES public.plans(id),
  activo         bool NOT NULL DEFAULT true,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- ── 5. CATEGORÍAS ────────────────────────────────────────────
CREATE TABLE public.categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  nombre      text NOT NULL,
  orden       int  NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- ── 6. PRODUCTOS ─────────────────────────────────────────────
CREATE TABLE public.products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_id     uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  nombre          text NOT NULL,
  descripcion     text,
  precio          int  NOT NULL,
  foto_url        text,
  disponible      bool NOT NULL DEFAULT true,
  stock           int  NOT NULL DEFAULT 0,
  stock_ilimitado bool NOT NULL DEFAULT false,
  tiene_stock     bool GENERATED ALWAYS AS (stock_ilimitado OR stock > 0) STORED,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ── 7. PEDIDOS ───────────────────────────────────────────────
CREATE TYPE public.order_status AS ENUM
  ('pendiente', 'en_camino', 'entregado', 'cancelado');

CREATE TABLE public.orders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  cliente_nombre text NOT NULL,
  cliente_tel    text,
  ubicacion      text NOT NULL,
  total          int  NOT NULL DEFAULT 0,
  estado         public.order_status NOT NULL DEFAULT 'pendiente',
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.order_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  nombre_snapshot text NOT NULL,
  precio_snapshot int  NOT NULL,
  cantidad        int  NOT NULL CHECK (cantidad > 0)
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- ── 8. FUNCIONES HELPER ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS bool
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (select auth.uid()) AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.my_business_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM public.businesses
  WHERE owner_id = (select auth.uid())
  LIMIT 1;
$$;

-- ── 9. RLS POLICIES ──────────────────────────────────────────

-- Admin puede ver y editar todos los perfiles
CREATE POLICY "profiles: admin all" ON public.profiles
  FOR ALL USING (public.is_super_admin());

-- businesses
CREATE POLICY "businesses: owner all" ON public.businesses
  FOR ALL USING (owner_id = (select auth.uid()));

CREATE POLICY "businesses: public read active" ON public.businesses
  FOR SELECT USING (activo = true);

CREATE POLICY "businesses: admin all" ON public.businesses
  FOR ALL USING (public.is_super_admin());

-- categories
CREATE POLICY "categories: owner all" ON public.categories
  FOR ALL USING (business_id = public.my_business_id());

CREATE POLICY "categories: public read" ON public.categories
  FOR SELECT USING (true);

CREATE POLICY "categories: admin all" ON public.categories
  FOR ALL USING (public.is_super_admin());

-- products
CREATE POLICY "products: owner all" ON public.products
  FOR ALL USING (business_id = public.my_business_id());

CREATE POLICY "products: public read available" ON public.products
  FOR SELECT USING (disponible = true);

CREATE POLICY "products: admin all" ON public.products
  FOR ALL USING (public.is_super_admin());

-- orders — los clientes insertan sin autenticarse
CREATE POLICY "orders: owner select" ON public.orders
  FOR SELECT USING (business_id = public.my_business_id());

CREATE POLICY "orders: owner update" ON public.orders
  FOR UPDATE USING (business_id = public.my_business_id());

CREATE POLICY "orders: public insert" ON public.orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "orders: admin all" ON public.orders
  FOR ALL USING (public.is_super_admin());

-- order_items
CREATE POLICY "order_items: owner select" ON public.order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM public.orders WHERE business_id = public.my_business_id()
    )
  );

CREATE POLICY "order_items: public insert" ON public.order_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "order_items: admin all" ON public.order_items
  FOR ALL USING (public.is_super_admin());

-- ── 10. FUNCIÓN ATÓMICA: confirmar_pedido ───────────────────
CREATE OR REPLACE FUNCTION public.confirmar_pedido(
  p_business_id uuid,
  p_nombre      text,
  p_telefono    text,
  p_ubicacion   text,
  p_items       jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  item       jsonb;
  prod       RECORD;
  v_order_id uuid;
  v_total    int := 0;
BEGIN
  -- Validar stock antes de crear nada
  FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT id, nombre, precio, stock, stock_ilimitado, disponible
    INTO prod
    FROM public.products
    WHERE id = (item->>'product_id')::uuid
      AND business_id = p_business_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'Producto no encontrado');
    END IF;

    IF NOT prod.disponible THEN
      RETURN jsonb_build_object('ok', false, 'motivo', prod.nombre || ' no está disponible');
    END IF;

    IF NOT prod.stock_ilimitado AND prod.stock < (item->>'cantidad')::int THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'Sin stock suficiente para: ' || prod.nombre);
    END IF;

    v_total := v_total + (prod.precio * (item->>'cantidad')::int);
  END LOOP;

  -- Crear orden
  INSERT INTO public.orders (business_id, cliente_nombre, cliente_tel, ubicacion, total)
  VALUES (p_business_id, p_nombre, p_telefono, p_ubicacion, v_total)
  RETURNING id INTO v_order_id;

  -- Insertar ítems y descontar stock
  FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT id, nombre, precio, stock_ilimitado
    INTO prod
    FROM public.products
    WHERE id = (item->>'product_id')::uuid;

    INSERT INTO public.order_items
      (order_id, product_id, nombre_snapshot, precio_snapshot, cantidad)
    VALUES
      (v_order_id, prod.id, prod.nombre, prod.precio, (item->>'cantidad')::int);

    IF NOT prod.stock_ilimitado THEN
      UPDATE public.products
      SET stock = stock - (item->>'cantidad')::int
      WHERE id = prod.id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'order_id', v_order_id);
END;
$$;

-- ── 11. REALTIME ─────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;

-- ── 12. SUPER ADMIN ──────────────────────────────────────────
-- Después de ejecutar este schema y crear tu usuario,
-- corre esta línea con tu email para darte acceso admin:
--
-- UPDATE public.profiles SET role = 'super_admin' WHERE email = 'tu@email.com';

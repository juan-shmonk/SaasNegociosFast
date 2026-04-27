-- ============================================================
--  SaasNegociosFast — Schema completo
--  Ejecuta este archivo en Supabase > SQL Editor
-- ============================================================

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. PLANES ────────────────────────────────────────────────
CREATE TABLE plans (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre              text NOT NULL,
  precio_mxn          int  NOT NULL DEFAULT 0,
  max_productos       int  NOT NULL DEFAULT 10,
  max_pedidos_mes     int  NOT NULL DEFAULT 50,
  created_at          timestamptz DEFAULT now()
);

INSERT INTO plans (nombre, precio_mxn, max_productos, max_pedidos_mes) VALUES
  ('Gratis',   0,   10,  30),
  ('Básico',   199, 50,  300),
  ('Pro',      399, 999, 9999);

-- ── 2. PERFILES DE USUARIO ───────────────────────────────────
-- Se crea automáticamente al registrarse (via trigger)
CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  role        text NOT NULL DEFAULT 'owner' CHECK (role IN ('super_admin', 'owner')),
  created_at  timestamptz DEFAULT now()
);

-- Trigger: crear perfil al registrar usuario
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN NEW.email = current_setting('app.super_admin_email', true)
         THEN 'super_admin' ELSE 'owner' END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 3. NEGOCIOS ──────────────────────────────────────────────
CREATE TABLE businesses (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  nombre        text NOT NULL,
  slug          text NOT NULL UNIQUE,
  descripcion   text,
  logo_url      text,
  color_primario text DEFAULT '#a855f7',
  horario       text,
  plan_id       uuid REFERENCES plans(id),
  activo        bool NOT NULL DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- ── 4. CATEGORÍAS ────────────────────────────────────────────
CREATE TABLE categories (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id   uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  nombre        text NOT NULL,
  orden         int  NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

-- ── 5. PRODUCTOS ─────────────────────────────────────────────
CREATE TABLE products (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id     uuid REFERENCES categories(id) ON DELETE SET NULL,
  nombre          text NOT NULL,
  descripcion     text,
  precio          int  NOT NULL,           -- en centavos o pesos enteros, tú decides
  foto_url        text,
  disponible      bool NOT NULL DEFAULT true,
  stock           int  NOT NULL DEFAULT 0,
  stock_ilimitado bool NOT NULL DEFAULT false,
  tiene_stock     bool GENERATED ALWAYS AS (stock_ilimitado OR stock > 0) STORED,
  created_at      timestamptz DEFAULT now()
);

-- ── 6. PEDIDOS ───────────────────────────────────────────────
CREATE TYPE order_status AS ENUM ('pendiente', 'en_camino', 'entregado', 'cancelado');

CREATE TABLE orders (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  cliente_nombre  text NOT NULL,
  cliente_tel     text,
  ubicacion       text NOT NULL,
  total           int  NOT NULL DEFAULT 0,
  estado          order_status NOT NULL DEFAULT 'pendiente',
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE order_items (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  nombre_snapshot text NOT NULL,    -- guarda el nombre al momento del pedido
  precio_snapshot int  NOT NULL,    -- guarda el precio al momento del pedido
  cantidad        int  NOT NULL CHECK (cantidad > 0)
);

-- ── 7. FUNCIÓN ATÓMICA: confirmar_pedido ─────────────────────
-- Verifica stock, descuenta y crea la orden en una sola transacción
CREATE OR REPLACE FUNCTION confirmar_pedido(
  p_business_id   uuid,
  p_nombre        text,
  p_telefono      text,
  p_ubicacion     text,
  p_items         jsonb   -- [{ product_id, cantidad }]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item          jsonb;
  prod          RECORD;
  v_order_id    uuid;
  v_total       int := 0;
BEGIN
  -- Validar stock de cada ítem antes de crear nada
  FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT id, nombre, precio, stock, stock_ilimitado, disponible, tiene_stock
    INTO prod
    FROM products
    WHERE id = (item->>'product_id')::uuid
      AND business_id = p_business_id
    FOR UPDATE;  -- bloquea la fila para evitar race conditions

    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'motivo', 'Producto no encontrado');
    END IF;

    IF NOT prod.disponible THEN
      RETURN jsonb_build_object('ok', false, 'motivo', prod.nombre || ' no está disponible');
    END IF;

    IF NOT prod.stock_ilimitado AND prod.stock < (item->>'cantidad')::int THEN
      RETURN jsonb_build_object(
        'ok', false,
        'motivo', 'Sin stock suficiente para: ' || prod.nombre
      );
    END IF;

    v_total := v_total + (prod.precio * (item->>'cantidad')::int);
  END LOOP;

  -- Crear la orden
  INSERT INTO orders (business_id, cliente_nombre, cliente_tel, ubicacion, total)
  VALUES (p_business_id, p_nombre, p_telefono, p_ubicacion, v_total)
  RETURNING id INTO v_order_id;

  -- Insertar ítems y descontar stock
  FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT id, nombre, precio, stock_ilimitado
    INTO prod
    FROM products
    WHERE id = (item->>'product_id')::uuid;

    INSERT INTO order_items (order_id, product_id, nombre_snapshot, precio_snapshot, cantidad)
    VALUES (
      v_order_id,
      prod.id,
      prod.nombre,
      prod.precio,
      (item->>'cantidad')::int
    );

    IF NOT prod.stock_ilimitado THEN
      UPDATE products
      SET stock = stock - (item->>'cantidad')::int
      WHERE id = prod.id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'order_id', v_order_id);
END;
$$;

-- ── 8. ROW LEVEL SECURITY ────────────────────────────────────

ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Helper: es super_admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS bool LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

-- Helper: business_id que pertenece al usuario actual
CREATE OR REPLACE FUNCTION my_business_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id FROM businesses WHERE owner_id = auth.uid() LIMIT 1;
$$;

-- profiles
CREATE POLICY "perfil propio" ON profiles FOR ALL USING (id = auth.uid());
CREATE POLICY "admin ve todos los perfiles" ON profiles FOR ALL USING (is_super_admin());

-- businesses
CREATE POLICY "owner ve su negocio" ON businesses
  FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "publico ve negocios activos" ON businesses
  FOR SELECT USING (activo = true);
CREATE POLICY "admin gestiona negocios" ON businesses
  FOR ALL USING (is_super_admin());

-- categories
CREATE POLICY "owner gestiona sus categorias" ON categories
  FOR ALL USING (business_id = my_business_id());
CREATE POLICY "publico ve categorias" ON categories
  FOR SELECT USING (true);
CREATE POLICY "admin gestiona categorias" ON categories
  FOR ALL USING (is_super_admin());

-- products
CREATE POLICY "owner gestiona sus productos" ON products
  FOR ALL USING (business_id = my_business_id());
CREATE POLICY "publico ve productos disponibles" ON products
  FOR SELECT USING (disponible = true);
CREATE POLICY "admin gestiona productos" ON products
  FOR ALL USING (is_super_admin());

-- orders
CREATE POLICY "owner ve sus pedidos" ON orders
  FOR SELECT USING (business_id = my_business_id());
CREATE POLICY "owner actualiza estado de pedidos" ON orders
  FOR UPDATE USING (business_id = my_business_id());
CREATE POLICY "admin ve todos los pedidos" ON orders
  FOR ALL USING (is_super_admin());

-- order_items
CREATE POLICY "owner ve items de sus pedidos" ON order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE business_id = my_business_id())
  );
CREATE POLICY "admin ve todos los items" ON order_items
  FOR ALL USING (is_super_admin());

-- ── 9. REALTIME ──────────────────────────────────────────────
-- Habilita realtime en las tablas que lo necesitan
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE products;

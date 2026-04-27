export type Role = 'super_admin' | 'owner'
export type OrderStatus = 'pendiente' | 'en_camino' | 'entregado' | 'cancelado'

export interface Profile {
  id: string
  email: string
  role: Role
  created_at: string
}

export interface Plan {
  id: string
  nombre: string
  precio_mxn: number
  max_productos: number
  max_pedidos_mes: number
}

export interface Business {
  id: string
  owner_id: string | null
  nombre: string
  slug: string
  descripcion: string | null
  logo_url: string | null
  color_primario: string
  horario: string | null
  plan_id: string | null
  activo: boolean
  created_at: string
  plans?: Plan
  profiles?: Profile
}

export interface Category {
  id: string
  business_id: string
  nombre: string
  orden: number
}

export interface Product {
  id: string
  business_id: string
  category_id: string | null
  nombre: string
  descripcion: string | null
  precio: number
  foto_url: string | null
  disponible: boolean
  stock: number
  stock_ilimitado: boolean
  tiene_stock: boolean
  categories?: Category
}

export interface Order {
  id: string
  business_id: string
  cliente_nombre: string
  cliente_tel: string | null
  ubicacion: string
  total: number
  estado: OrderStatus
  created_at: string
  order_items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  nombre_snapshot: string
  precio_snapshot: number
  cantidad: number
}

export interface CartItem {
  product: Product
  cantidad: number
}

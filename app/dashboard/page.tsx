import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TiendaToggle from '@/components/dashboard/TiendaToggle'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, nombre, tienda_abierta')
    .eq('owner_id', user.id)
    .single()

  if (!business) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Tu negocio aún no ha sido configurado por el administrador.</p>
      </div>
    )
  }

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const [{ count: pedidosHoy }, { count: pedidosMes }, { data: topProductos }] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .gte('created_at', hoy.toISOString()),
    supabase.from('orders').select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .gte('created_at', new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString()),
    supabase.from('order_items')
      .select('nombre_snapshot, cantidad')
      .order('cantidad', { ascending: false })
      .limit(3),
  ])

  const stats = [
    { label: 'Pedidos hoy',    value: pedidosHoy  ?? 0 },
    { label: 'Pedidos este mes', value: pedidosMes ?? 0 },
  ]

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Bienvenido, {business.nombre}</h1>

      <div className="mb-6">
        <TiendaToggle businessId={business.id} initialAbierta={business.tienda_abierta ?? true} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl shadow p-4 md:p-6">
            <p className="text-xs md:text-sm text-gray-400">{s.label}</p>
            <p className="text-3xl md:text-4xl font-bold text-brand-700 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow p-4 md:p-6">
        <h2 className="font-semibold text-gray-700 mb-3">Accesos rápidos</h2>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <a href="/dashboard/pedidos" className="text-center px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition">
            Ver pedidos
          </a>
          <a href="/dashboard/productos" className="text-center px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
            Gestionar stock
          </a>
          <a href="/dashboard/configuracion" className="text-center px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
            Configurar tienda
          </a>
        </div>
      </div>
    </div>
  )
}

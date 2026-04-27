import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, nombre')
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
      <h1 className="text-3xl font-bold mb-8">Bienvenido, {business.nombre}</h1>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl shadow p-6">
            <p className="text-sm text-gray-400">{s.label}</p>
            <p className="text-4xl font-bold text-brand-700 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Accesos rápidos</h2>
        <div className="flex gap-3">
          <a href="/dashboard/pedidos" className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 transition">
            Ver pedidos
          </a>
          <a href="/dashboard/productos" className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition">
            Gestionar stock
          </a>
          <a href="/dashboard/configuracion" className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition">
            Configurar tienda
          </a>
        </div>
      </div>
    </div>
  )
}

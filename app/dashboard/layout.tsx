import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('nombre, slug')
    .eq('owner_id', user.id)
    .single()

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col p-6 gap-6">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Mi negocio</p>
          <h2 className="font-bold text-gray-800 truncate">{business?.nombre ?? '—'}</h2>
          {business?.slug && (
            <a
              href={`/${business.slug}`}
              target="_blank"
              className="text-xs text-brand-600 hover:underline"
            >
              Ver mi tienda →
            </a>
          )}
        </div>

        <nav className="flex flex-col gap-1 text-sm">
          <Link href="/dashboard" className="px-3 py-2 rounded-lg hover:bg-gray-100 transition font-medium">
            Resumen
          </Link>
          <Link href="/dashboard/productos" className="px-3 py-2 rounded-lg hover:bg-gray-100 transition font-medium">
            Productos y stock
          </Link>
          <Link href="/dashboard/pedidos" className="px-3 py-2 rounded-lg hover:bg-gray-100 transition font-medium">
            Pedidos
          </Link>
          <Link href="/dashboard/configuracion" className="px-3 py-2 rounded-lg hover:bg-gray-100 transition font-medium">
            Configuración
          </Link>
        </nav>

        <div className="mt-auto">
          <form action={signOut}>
            <button className="text-xs text-gray-400 hover:text-gray-700 transition">Cerrar sesión</button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto bg-gray-50">{children}</main>
    </div>
  )
}

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

  const navLinks = [
    { href: '/dashboard',               label: 'Resumen',          icon: '📊' },
    { href: '/dashboard/productos',     label: 'Productos',        icon: '📦' },
    { href: '/dashboard/pedidos',       label: 'Pedidos',          icon: '🛍️' },
    { href: '/dashboard/configuracion', label: 'Configuración',    icon: '⚙️' },
  ]

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">

      {/* ── Topbar móvil ─────────────────────────────────────── */}
      <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div>
          <p className="text-xs text-gray-400">Mi negocio</p>
          <p className="font-bold text-gray-800 text-sm truncate max-w-[180px]">
            {business?.nombre ?? '—'}
          </p>
        </div>
        {business?.slug && (
          <a
            href={`/${business.slug}`}
            target="_blank"
            className="text-xs text-brand-600 border border-brand-200 rounded-lg px-2 py-1 hover:bg-brand-50 transition"
          >
            Ver tienda →
          </a>
        )}
      </header>

      {/* ── Sidebar escritorio ───────────────────────────────── */}
      <aside className="hidden md:flex w-56 bg-white border-r border-gray-200 flex-col p-6 gap-6 min-h-screen sticky top-0">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Mi negocio</p>
          <h2 className="font-bold text-gray-800 truncate">{business?.nombre ?? '—'}</h2>
          {business?.slug && (
            <a href={`/${business.slug}`} target="_blank"
              className="text-xs text-brand-600 hover:underline">
              Ver mi tienda →
            </a>
          )}
        </div>

        <nav className="flex flex-col gap-1 text-sm">
          {navLinks.map(l => (
            <Link key={l.href} href={l.href}
              className="px-3 py-2 rounded-lg hover:bg-gray-100 transition font-medium flex items-center gap-2">
              <span>{l.icon}</span> {l.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto">
          <form action={signOut}>
            <button className="text-xs text-gray-400 hover:text-gray-700 transition">
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* ── Contenido ────────────────────────────────────────── */}
      <main className="flex-1 p-4 md:p-8 overflow-auto pb-24 md:pb-8">
        {children}
      </main>

      {/* ── Bottom nav móvil ─────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 flex">
        {navLinks.map(l => (
          <Link key={l.href} href={l.href}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-gray-500 hover:text-brand-600 transition">
            <span className="text-xl">{l.icon}</span>
            <span className="text-[10px] font-medium">{l.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}

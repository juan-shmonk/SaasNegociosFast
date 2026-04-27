import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') redirect('/dashboard')

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/auth/login')
  }

  const navLinks = [
    { href: '/admin',                   label: 'Negocios' },
    { href: '/admin/negocios/nuevo',    label: '+ Nuevo negocio' },
  ]

  return (
    <div className="min-h-screen flex flex-col md:flex-row">

      {/* ── Topbar móvil ─────────────────────────────────────── */}
      <header className="md:hidden bg-gray-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <span className="font-bold text-brand-400">⚡ Admin</span>
        <div className="flex items-center gap-3">
          {navLinks.map(l => (
            <Link key={l.href} href={l.href}
              className="text-xs text-gray-300 hover:text-white transition">
              {l.label}
            </Link>
          ))}
          <form action={signOut}>
            <button className="text-xs text-gray-400 hover:text-white transition ml-2">
              Salir
            </button>
          </form>
        </div>
      </header>

      {/* ── Sidebar escritorio ───────────────────────────────── */}
      <aside className="hidden md:flex w-56 bg-gray-900 text-white flex-col p-6 gap-6 min-h-screen sticky top-0">
        <h2 className="text-lg font-bold text-brand-400">⚡ Admin</h2>
        <nav className="flex flex-col gap-2 text-sm">
          {navLinks.map(l => (
            <Link key={l.href} href={l.href}
              className="hover:text-brand-400 transition">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto">
          <form action={signOut}>
            <button className="text-xs text-gray-400 hover:text-white transition">
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
    </div>
  )
}

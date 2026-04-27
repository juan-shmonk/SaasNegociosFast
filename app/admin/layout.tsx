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

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-gray-900 text-white flex flex-col p-6 gap-6">
        <h2 className="text-lg font-bold text-brand-400">⚡ Admin</h2>
        <nav className="flex flex-col gap-2 text-sm">
          <Link href="/admin" className="hover:text-brand-400 transition">Negocios</Link>
          <Link href="/admin/negocios/nuevo" className="hover:text-brand-400 transition">+ Nuevo negocio</Link>
          <Link href="/admin/planes" className="hover:text-brand-400 transition">Planes</Link>
        </nav>
        <div className="mt-auto">
          <form action={signOut}>
            <button className="text-xs text-gray-400 hover:text-white transition">Cerrar sesión</button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}

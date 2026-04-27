import { createClient } from '@/lib/supabase/server'
import type { Business } from '@/lib/types'
import AdminBusinessTable from '@/components/admin/BusinessTable'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: businesses } = await supabase
    .from('businesses')
    .select('*, profiles(email), plans(nombre, precio_mxn)')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="text-xl md:text-3xl font-bold">Negocios registrados</h1>
        <a
          href="/admin/negocios/nuevo"
          className="px-3 py-2 md:px-4 bg-brand-600 text-white rounded-lg font-semibold hover:bg-brand-700 transition text-sm whitespace-nowrap flex-shrink-0"
        >
          + Nuevo negocio
        </a>
      </div>
      <AdminBusinessTable businesses={(businesses ?? []) as Business[]} />
    </div>
  )
}

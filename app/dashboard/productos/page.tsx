import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StockManager from '@/components/dashboard/StockManager'
import type { Product } from '@/lib/types'

export default async function ProductosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: business } = await supabase
    .from('businesses').select('id').eq('owner_id', user.id).single()

  if (!business) redirect('/dashboard')

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at', { ascending: true })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Productos y stock</h1>
      </div>
      <StockManager
        businessId={business.id}
        initialProducts={(products ?? []) as Product[]}
      />
    </div>
  )
}

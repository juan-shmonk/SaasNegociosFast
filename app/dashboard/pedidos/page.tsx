import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OrdersRealtime from '@/components/dashboard/OrdersRealtime'
import type { Order } from '@/lib/types'

export default async function PedidosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: business } = await supabase
    .from('businesses').select('id').eq('owner_id', user.id).single()
  if (!business) redirect('/dashboard')

  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Pedidos</h1>
      <OrdersRealtime
        businessId={business.id}
        initialOrders={(orders ?? []) as Order[]}
      />
    </div>
  )
}

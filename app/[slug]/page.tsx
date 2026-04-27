import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Business, Product } from '@/lib/types'
import Storefront from '@/components/storefront/Storefront'

interface Props { params: Promise<{ slug: string }> }

export default async function StorefrontPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .eq('activo', true)
    .single()

  if (!business) notFound()

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('business_id', business.id)
    .eq('disponible', true)
    .order('created_at', { ascending: true })

  return (
    <Storefront
      business={business as Business}
      initialProducts={(products ?? []) as Product[]}
    />
  )
}

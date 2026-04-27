'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Business, Product, CartItem } from '@/lib/types'

interface Props {
  business: Business
  initialProducts: Product[]
}

export default function Storefront({ business, initialProducts }: Props) {
  const supabase = createClient()
  const [products, setProducts] = useState(initialProducts)
  const [cart, setCart] = useState<CartItem[]>([])
  const [step, setStep] = useState<'menu' | 'checkout' | 'done'>('menu')
  const [form, setForm] = useState({ nombre: '', telefono: '', ubicacion: '' })
  const [loading, setLoading] = useState(false)
  const [orderError, setOrderError] = useState('')

  // Stock en tiempo real
  useEffect(() => {
    const channel = supabase
      .channel(`stock-${business.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'products',
        filter: `business_id=eq.${business.id}`,
      }, (payload) => {
        setProducts(prev =>
          prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } as Product : p)
        )
        // Si el producto se agotó, quitarlo del carrito
        if (!payload.new.tiene_stock) {
          setCart(prev => prev.filter(c => c.product.id !== payload.new.id))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [business.id])

  function addToCart(product: Product) {
    if (!product.tiene_stock) return
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id)
      if (existing) return prev.map(c => c.product.id === product.id ? { ...c, cantidad: c.cantidad + 1 } : c)
      return [...prev, { product, cantidad: 1 }]
    })
  }

  function removeFromCart(productId: string) {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === productId)
      if (existing && existing.cantidad > 1) {
        return prev.map(c => c.product.id === productId ? { ...c, cantidad: c.cantidad - 1 } : c)
      }
      return prev.filter(c => c.product.id !== productId)
    })
  }

  const cartTotal = cart.reduce((sum, c) => sum + c.product.precio * c.cantidad, 0)
  const cartCount = cart.reduce((sum, c) => sum + c.cantidad, 0)

  async function handleOrder(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setOrderError('')

    const { data, error } = await supabase.rpc('confirmar_pedido', {
      p_business_id: business.id,
      p_nombre: form.nombre,
      p_telefono: form.telefono,
      p_ubicacion: form.ubicacion,
      p_items: cart.map(c => ({ product_id: c.product.id, cantidad: c.cantidad })),
    })

    if (error || !data?.ok) {
      setOrderError(data?.motivo ?? 'Error al procesar el pedido. Intenta de nuevo.')
      setLoading(false)
      return
    }

    setStep('done')
    setCart([])
    setLoading(false)
  }

  const stockLabel = (p: Product) => {
    if (!p.tiene_stock) return <span className="text-xs text-red-500 font-semibold">Agotado</span>
    if (!p.stock_ilimitado && p.stock <= 3) return <span className="text-xs text-yellow-600">Últimas {p.stock}</span>
    return null
  }

  const cartQty = (id: string) => cart.find(c => c.product.id === id)?.cantidad ?? 0

  if (step === 'done') {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: business.color_primario + '10' }}>
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold mb-2">¡Pedido confirmado!</h2>
          <p className="text-gray-500 mb-6">El vendedor está preparando tu pedido y llegará pronto a tu ubicación.</p>
          <button onClick={() => setStep('menu')}
            className="px-6 py-2.5 text-white rounded-xl font-semibold hover:opacity-90 transition"
            style={{ backgroundColor: business.color_primario }}>
            Hacer otro pedido
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen pb-32" style={{ backgroundColor: business.color_primario + '08' }}>
      {/* Header */}
      <div className="text-white py-6 md:py-8 px-4 text-center" style={{ backgroundColor: business.color_primario }}>
        {business.logo_url && (
          <img src={business.logo_url} alt={business.nombre}
            className="w-16 h-16 md:w-20 md:h-20 rounded-full mx-auto mb-3 object-cover border-2 border-white/30" />
        )}
        <h1 className="text-xl md:text-2xl font-bold">{business.nombre}</h1>
        {business.descripcion && <p className="text-white/80 text-sm mt-1 max-w-xs mx-auto">{business.descripcion}</p>}
        {business.horario && <p className="text-white/60 text-xs mt-2">🕐 {business.horario}</p>}
      </div>

      {step === 'menu' && (
        <div className="max-w-2xl mx-auto px-4 pt-6">
          <div className="grid grid-cols-1 gap-3">
            {products.map(p => (
              <div key={p.id} className={`bg-white rounded-xl shadow-sm p-4 flex items-center gap-4 ${!p.tiene_stock ? 'opacity-60' : ''}`}>
                {p.foto_url && (
                  <img src={p.foto_url} alt={p.nombre}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{p.nombre}</p>
                  {p.descripcion && <p className="text-xs text-gray-400 truncate">{p.descripcion}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-bold" style={{ color: business.color_primario }}>${p.precio}</span>
                    {stockLabel(p)}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {cartQty(p.id) > 0 ? (
                    <>
                      <button onClick={() => removeFromCart(p.id)}
                        className="w-8 h-8 rounded-full border-2 font-bold text-lg flex items-center justify-center hover:bg-gray-50 transition"
                        style={{ borderColor: business.color_primario, color: business.color_primario }}>
                        −
                      </button>
                      <span className="w-5 text-center font-bold">{cartQty(p.id)}</span>
                    </>
                  ) : null}
                  <button onClick={() => addToCart(p)} disabled={!p.tiene_stock}
                    className="w-8 h-8 rounded-full text-white font-bold text-lg flex items-center justify-center hover:opacity-90 transition disabled:opacity-30"
                    style={{ backgroundColor: business.color_primario }}>
                    +
                  </button>
                </div>
              </div>
            ))}

            {products.length === 0 && (
              <p className="text-center text-gray-400 py-12">Este negocio aún no tiene productos disponibles.</p>
            )}
          </div>
        </div>
      )}

      {step === 'checkout' && (
        <div className="max-w-lg mx-auto px-4 pt-6">
          <h2 className="text-xl font-bold mb-4">Tu pedido</h2>
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
            {cart.map(c => (
              <div key={c.product.id} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                <span>{c.cantidad}x {c.product.nombre}</span>
                <span className="font-semibold">${c.product.precio * c.cantidad}</span>
              </div>
            ))}
            <div className="flex justify-between pt-3 font-bold text-lg">
              <span>Total</span>
              <span style={{ color: business.color_primario }}>${cartTotal}</span>
            </div>
          </div>

          <form onSubmit={handleOrder} className="bg-white rounded-xl shadow-sm p-4 flex flex-col gap-3">
            <h3 className="font-semibold">¿A quién le entregamos?</h3>
            <input required placeholder="Tu nombre" value={form.nombre}
              onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 text-sm"
              style={{ outlineColor: business.color_primario }} />
            <input placeholder="Teléfono (opcional)" value={form.telefono}
              onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none text-sm" />
            <textarea required placeholder="¿Dónde estás? Escribe con detalle para que te encontremos fácil..." rows={2}
              value={form.ubicacion}
              onChange={e => setForm(p => ({ ...p, ubicacion: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none text-sm resize-none" />

            {orderError && <p className="text-red-500 text-sm">{orderError}</p>}

            <button type="submit" disabled={loading}
              className="py-3 text-white rounded-xl font-bold hover:opacity-90 transition disabled:opacity-50"
              style={{ backgroundColor: business.color_primario }}>
              {loading ? 'Confirmando...' : `Confirmar pedido · $${cartTotal}`}
            </button>
          </form>

          <button onClick={() => setStep('menu')}
            className="mt-3 w-full text-center text-sm text-gray-400 hover:text-gray-600">
            ← Volver al menú
          </button>
        </div>
      )}

      {/* Carrito flotante */}
      {cartCount > 0 && step === 'menu' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <button onClick={() => setStep('checkout')}
            className="flex items-center gap-4 px-6 py-3.5 text-white rounded-full shadow-2xl font-semibold hover:opacity-90 transition"
            style={{ backgroundColor: business.color_primario }}>
            <span className="bg-white/30 rounded-full px-2 py-0.5 text-sm font-bold">{cartCount}</span>
            Ver pedido
            <span className="font-bold">${cartTotal}</span>
          </button>
        </div>
      )}
    </main>
  )
}

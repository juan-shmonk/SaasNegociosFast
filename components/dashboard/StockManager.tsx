'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/lib/types'

interface Props {
  businessId: string
  initialProducts: Product[]
}

export default function StockManager({ businessId, initialProducts }: Props) {
  const supabase = createClient()
  const [products, setProducts] = useState(initialProducts)
  const [showForm, setShowForm] = useState(false)
  const [newProduct, setNewProduct] = useState({
    nombre: '', precio: '', descripcion: '', stock: '0', stock_ilimitado: false,
  })
  const [saving, setSaving] = useState(false)

  async function adjustStock(id: string, delta: number) {
    const product = products.find(p => p.id === id)
    if (!product) return
    const newStock = Math.max(0, product.stock + delta)
    await supabase.from('products').update({ stock: newStock }).eq('id', id)
    setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: newStock } : p))
  }

  async function toggleIlimitado(id: string, current: boolean) {
    await supabase.from('products').update({ stock_ilimitado: !current }).eq('id', id)
    setProducts(prev => prev.map(p => p.id === id ? { ...p, stock_ilimitado: !current } : p))
  }

  async function toggleDisponible(id: string, current: boolean) {
    await supabase.from('products').update({ disponible: !current }).eq('id', id)
    setProducts(prev => prev.map(p => p.id === id ? { ...p, disponible: !current } : p))
  }

  async function createProduct(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data } = await supabase.from('products').insert({
      business_id: businessId,
      nombre: newProduct.nombre,
      precio: parseInt(newProduct.precio),
      descripcion: newProduct.descripcion,
      stock: parseInt(newProduct.stock),
      stock_ilimitado: newProduct.stock_ilimitado,
      disponible: true,
    }).select().single()

    if (data) setProducts(prev => [...prev, data as Product])
    setNewProduct({ nombre: '', precio: '', descripcion: '', stock: '0', stock_ilimitado: false })
    setShowForm(false)
    setSaving(false)
  }

  async function deleteProduct(id: string) {
    if (!confirm('¿Eliminar este producto?')) return
    await supabase.from('products').delete().eq('id', id)
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  const stockBadge = (p: Product) => {
    if (p.stock_ilimitado) return <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">∞ Ilimitado</span>
    if (p.stock === 0) return <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">Agotado</span>
    if (p.stock <= 3) return <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">Últimas {p.stock}</span>
    return <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">{p.stock} en stock</span>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(v => !v)}
          className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 transition"
        >
          {showForm ? 'Cancelar' : '+ Agregar producto'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createProduct} className="bg-white rounded-2xl shadow p-6 flex flex-col gap-3">
          <h3 className="font-semibold">Nuevo producto</h3>
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="Nombre" value={newProduct.nombre}
              onChange={e => setNewProduct(p => ({ ...p, nombre: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <input required type="number" placeholder="Precio ($)" value={newProduct.precio}
              onChange={e => setNewProduct(p => ({ ...p, precio: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <input placeholder="Descripción (opcional)" value={newProduct.descripcion}
            onChange={e => setNewProduct(p => ({ ...p, descripcion: e.target.value }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={newProduct.stock_ilimitado}
                onChange={e => setNewProduct(p => ({ ...p, stock_ilimitado: e.target.checked }))} />
              Stock ilimitado
            </label>
            {!newProduct.stock_ilimitado && (
              <input type="number" placeholder="Stock inicial" value={newProduct.stock}
                onChange={e => setNewProduct(p => ({ ...p, stock: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            )}
          </div>
          <button type="submit" disabled={saving}
            className="bg-brand-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-brand-700 transition disabled:opacity-50">
            {saving ? 'Guardando...' : 'Crear producto'}
          </button>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Producto</th>
              <th className="px-4 py-3 text-left">Precio</th>
              <th className="px-4 py-3 text-left">Stock</th>
              <th className="px-4 py-3 text-left">Ajustar</th>
              <th className="px-4 py-3 text-left">Visible</th>
              <th className="px-4 py-3 text-left"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">
                  {p.nombre}
                  {p.descripcion && <p className="text-xs text-gray-400">{p.descripcion}</p>}
                </td>
                <td className="px-4 py-3">${p.precio}</td>
                <td className="px-4 py-3">{stockBadge(p)}</td>
                <td className="px-4 py-3">
                  {p.stock_ilimitado ? (
                    <button onClick={() => toggleIlimitado(p.id, p.stock_ilimitado)}
                      className="text-xs text-blue-600 hover:underline">
                      Quitar ilimitado
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button onClick={() => adjustStock(p.id, -1)}
                        className="w-7 h-7 rounded-full border border-gray-300 hover:bg-gray-100 transition font-bold">
                        −
                      </button>
                      <span className="w-6 text-center font-semibold">{p.stock}</span>
                      <button onClick={() => adjustStock(p.id, 1)}
                        className="w-7 h-7 rounded-full border border-gray-300 hover:bg-gray-100 transition font-bold">
                        +
                      </button>
                      <button onClick={() => toggleIlimitado(p.id, p.stock_ilimitado)}
                        className="text-xs text-blue-600 hover:underline ml-1">
                        ∞
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleDisponible(p.id, p.disponible)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${p.disponible ? 'bg-brand-600' : 'bg-gray-300'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${p.disponible ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => deleteProduct(p.id)} className="text-red-400 hover:text-red-600 text-xs">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin productos. Agrega el primero.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

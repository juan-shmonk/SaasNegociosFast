'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Order, OrderStatus } from '@/lib/types'

const STATUS_LABELS: Record<OrderStatus, string> = {
  pendiente:  '🟡 Pendiente',
  en_camino:  '🚀 En camino',
  entregado:  '✅ Entregado',
  cancelado:  '❌ Cancelado',
}
const STATUS_NEXT: Record<OrderStatus, OrderStatus | null> = {
  pendiente: 'en_camino',
  en_camino: 'entregado',
  entregado: null,
  cancelado: null,
}
const STATUS_COLOR: Record<OrderStatus, string> = {
  pendiente: 'border-yellow-400 bg-yellow-50',
  en_camino: 'border-blue-400 bg-blue-50',
  entregado: 'border-green-400 bg-white',
  cancelado: 'border-gray-300 bg-white',
}

interface Props {
  businessId: string
  initialOrders: Order[]
}

export default function OrdersRealtime({ businessId, initialOrders }: Props) {
  const supabase = createClient()
  const [orders, setOrders] = useState(initialOrders)
  const [tab, setTab] = useState<'activos' | 'historial'>('activos')

  useEffect(() => {
    const channel = supabase
      .channel('pedidos-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `business_id=eq.${businessId}`,
      }, async (payload) => {
        const { data: items } = await supabase
          .from('order_items').select('*').eq('order_id', payload.new.id)
        const newOrder = { ...payload.new, order_items: items ?? [] } as Order
        setOrders(prev => [newOrder, ...prev])
        if (Notification.permission === 'granted') {
          new Notification('🛍️ Nuevo pedido', {
            body: `${newOrder.cliente_nombre} — ${newOrder.ubicacion}`,
          })
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `business_id=eq.${businessId}`,
      }, (payload) => {
        setOrders(prev =>
          prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o)
        )
      })
      .subscribe()

    if (Notification.permission === 'default') Notification.requestPermission()
    return () => { supabase.removeChannel(channel) }
  }, [businessId])

  async function advanceStatus(order: Order) {
    const next = STATUS_NEXT[order.estado]
    if (!next) return
    await supabase.from('orders').update({ estado: next }).eq('id', order.id)
  }

  async function cancelOrder(id: string) {
    if (!confirm('¿Cancelar este pedido?')) return
    await supabase.from('orders').update({ estado: 'cancelado' }).eq('id', id)
  }

  const active   = orders.filter(o => o.estado === 'pendiente' || o.estado === 'en_camino')
  const finished = orders.filter(o => o.estado === 'entregado'  || o.estado === 'cancelado')

  const OrderCard = ({ order }: { order: Order }) => (
    <div className={`rounded-xl border-l-4 p-4 flex flex-col gap-2 shadow-sm ${STATUS_COLOR[order.estado]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold truncate">{order.cliente_nombre}</p>
          <p className="text-sm text-gray-500 truncate">📍 {order.ubicacion}</p>
          {order.cliente_tel && (
            <a href={`tel:${order.cliente_tel}`} className="text-xs text-brand-600">
              📞 {order.cliente_tel}
            </a>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-semibold text-gray-500">{STATUS_LABELS[order.estado]}</p>
          <p className="text-base font-bold text-brand-700 mt-0.5">${order.total}</p>
        </div>
      </div>

      {order.order_items && order.order_items.length > 0 && (
        <ul className="text-sm text-gray-600 border-t border-gray-200 pt-2 flex flex-col gap-0.5">
          {order.order_items.map(item => (
            <li key={item.id} className="flex justify-between">
              <span>{item.cantidad}x {item.nombre_snapshot}</span>
              <span className="font-medium">${item.precio_snapshot * item.cantidad}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-gray-400">
        {new Date(order.created_at).toLocaleString('es-MX', {
          hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short'
        })}
      </p>

      {STATUS_NEXT[order.estado] && (
        <div className="flex gap-2 pt-1">
          <button onClick={() => advanceStatus(order)}
            className="flex-1 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition">
            {STATUS_NEXT[order.estado] === 'en_camino' ? '🚀 Salir a entregar' : '✅ Marcar entregado'}
          </button>
          {order.estado === 'pendiente' && (
            <button onClick={() => cancelOrder(order.id)}
              className="px-3 py-2 border border-red-300 text-red-500 rounded-lg text-sm hover:bg-red-50 transition">
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div>
      {/* Tabs móvil */}
      <div className="flex gap-2 mb-4 md:hidden">
        <button
          onClick={() => setTab('activos')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${tab === 'activos' ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
          Activos ({active.length})
        </button>
        <button
          onClick={() => setTab('historial')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${tab === 'historial' ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
          Historial ({finished.length})
        </button>
      </div>

      {/* Vista escritorio — 3 columnas */}
      <div className="hidden md:grid grid-cols-3 gap-6">
        <div>
          <h2 className="font-semibold text-yellow-600 mb-3">🟡 Pendientes ({orders.filter(o => o.estado === 'pendiente').length})</h2>
          <div className="flex flex-col gap-3">
            {orders.filter(o => o.estado === 'pendiente').map(o => <OrderCard key={o.id} order={o} />)}
            {orders.filter(o => o.estado === 'pendiente').length === 0 && <p className="text-sm text-gray-400">Sin pedidos pendientes</p>}
          </div>
        </div>
        <div>
          <h2 className="font-semibold text-blue-600 mb-3">🚀 En camino ({orders.filter(o => o.estado === 'en_camino').length})</h2>
          <div className="flex flex-col gap-3">
            {orders.filter(o => o.estado === 'en_camino').map(o => <OrderCard key={o.id} order={o} />)}
            {orders.filter(o => o.estado === 'en_camino').length === 0 && <p className="text-sm text-gray-400">Ninguno en camino</p>}
          </div>
        </div>
        <div>
          <h2 className="font-semibold text-gray-500 mb-3">Historial ({finished.length})</h2>
          <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
            {finished.map(o => <OrderCard key={o.id} order={o} />)}
            {finished.length === 0 && <p className="text-sm text-gray-400">Sin historial</p>}
          </div>
        </div>
      </div>

      {/* Vista móvil — tabs */}
      <div className="md:hidden flex flex-col gap-3">
        {tab === 'activos' && (
          active.length > 0
            ? active.map(o => <OrderCard key={o.id} order={o} />)
            : <p className="text-center text-gray-400 py-8">Sin pedidos activos</p>
        )}
        {tab === 'historial' && (
          finished.length > 0
            ? finished.map(o => <OrderCard key={o.id} order={o} />)
            : <p className="text-center text-gray-400 py-8">Sin historial aún</p>
        )}
      </div>
    </div>
  )
}

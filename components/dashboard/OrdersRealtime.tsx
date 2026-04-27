'use client'

import { useEffect, useState, useRef } from 'react'
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

interface Props {
  businessId: string
  initialOrders: Order[]
}

export default function OrdersRealtime({ businessId, initialOrders }: Props) {
  const supabase = createClient()
  const [orders, setOrders] = useState(initialOrders)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAA...')
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('pedidos-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `business_id=eq.${businessId}`,
      }, async (payload) => {
        // Cargar items del nuevo pedido
        const { data: items } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', payload.new.id)

        const newOrder = { ...payload.new, order_items: items ?? [] } as Order
        setOrders(prev => [newOrder, ...prev])

        // Notificación del navegador
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

    // Pedir permiso para notificaciones
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }

    return () => { supabase.removeChannel(channel) }
  }, [businessId])

  async function advanceStatus(order: Order) {
    const next = STATUS_NEXT[order.estado]
    if (!next) return
    await supabase.from('orders').update({ estado: next }).eq('id', order.id)
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, estado: next } : o))
  }

  async function cancelOrder(id: string) {
    if (!confirm('¿Cancelar este pedido?')) return
    await supabase.from('orders').update({ estado: 'cancelado' }).eq('id', id)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, estado: 'cancelado' } : o))
  }

  const pending  = orders.filter(o => o.estado === 'pendiente')
  const active   = orders.filter(o => o.estado === 'en_camino')
  const finished = orders.filter(o => o.estado === 'entregado' || o.estado === 'cancelado')

  const OrderCard = ({ order }: { order: Order }) => (
    <div className={`bg-white rounded-xl shadow p-4 flex flex-col gap-2 border-l-4 ${
      order.estado === 'pendiente' ? 'border-yellow-400' :
      order.estado === 'en_camino' ? 'border-blue-500' :
      order.estado === 'entregado' ? 'border-green-500' : 'border-gray-300'
    }`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold">{order.cliente_nombre}</p>
          <p className="text-sm text-gray-500">📍 {order.ubicacion}</p>
          {order.cliente_tel && <p className="text-xs text-gray-400">{order.cliente_tel}</p>}
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold text-gray-500">{STATUS_LABELS[order.estado]}</span>
          <p className="text-sm font-bold text-brand-700 mt-1">${order.total}</p>
        </div>
      </div>

      {order.order_items && order.order_items.length > 0 && (
        <ul className="text-sm text-gray-600 border-t border-gray-100 pt-2 flex flex-col gap-0.5">
          {order.order_items.map(item => (
            <li key={item.id} className="flex justify-between">
              <span>{item.cantidad}x {item.nombre_snapshot}</span>
              <span>${item.precio_snapshot * item.cantidad}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-gray-400">
        {new Date(order.created_at).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
      </p>

      {STATUS_NEXT[order.estado] && (
        <div className="flex gap-2 pt-1">
          <button onClick={() => advanceStatus(order)}
            className="flex-1 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition">
            {STATUS_NEXT[order.estado] === 'en_camino' ? '🚀 Salir a entregar' : '✅ Marcar entregado'}
          </button>
          {order.estado === 'pendiente' && (
            <button onClick={() => cancelOrder(order.id)}
              className="px-3 py-1.5 border border-red-300 text-red-500 rounded-lg text-sm hover:bg-red-50 transition">
              Cancelar
            </button>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="grid grid-cols-3 gap-6">
      <div>
        <h2 className="font-semibold text-yellow-600 mb-3">
          🟡 Pendientes ({pending.length})
        </h2>
        <div className="flex flex-col gap-3">
          {pending.map(o => <OrderCard key={o.id} order={o} />)}
          {pending.length === 0 && <p className="text-sm text-gray-400">Sin pedidos pendientes</p>}
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-blue-600 mb-3">
          🚀 En camino ({active.length})
        </h2>
        <div className="flex flex-col gap-3">
          {active.map(o => <OrderCard key={o.id} order={o} />)}
          {active.length === 0 && <p className="text-sm text-gray-400">Ninguno en camino</p>}
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-gray-500 mb-3">
          Historial ({finished.length})
        </h2>
        <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
          {finished.map(o => <OrderCard key={o.id} order={o} />)}
          {finished.length === 0 && <p className="text-sm text-gray-400">Sin historial aún</p>}
        </div>
      </div>
    </div>
  )
}

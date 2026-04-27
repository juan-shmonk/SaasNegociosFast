'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  businessId: string
  initialAbierta: boolean
}

export default function TiendaToggle({ businessId, initialAbierta }: Props) {
  const supabase = createClient()
  const [abierta, setAbierta] = useState(initialAbierta)
  const [saving, setSaving] = useState(false)

  async function toggle() {
    setSaving(true)
    const next = !abierta
    await supabase.from('businesses').update({ tienda_abierta: next }).eq('id', businessId)
    setAbierta(next)
    setSaving(false)
  }

  return (
    <div className={`rounded-2xl shadow p-4 md:p-6 border-2 transition-colors ${
      abierta ? 'bg-white border-green-200' : 'bg-red-50 border-red-300'
    }`}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-gray-800">
            {abierta ? '🟢 Tienda abierta' : '🔴 Productos agotados'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {abierta
              ? 'Tus clientes pueden ver el menú y hacer pedidos'
              : 'Los clientes ven que no hay productos disponibles'}
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={saving}
          className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-50 ${
            abierta
              ? 'bg-red-100 text-red-600 hover:bg-red-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          {saving ? '...' : abierta ? 'Marcar agotado' : 'Volver a abrir'}
        </button>
      </div>
    </div>
  )
}

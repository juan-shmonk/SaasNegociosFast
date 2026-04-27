'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Business } from '@/lib/types'

interface Props { businesses: Business[] }

export default function AdminBusinessTable({ businesses: initial }: Props) {
  const supabase = createClient()
  const [businesses, setBusinesses] = useState(initial)

  async function toggleActivo(id: string, activo: boolean) {
    await supabase.from('businesses').update({ activo: !activo }).eq('id', id)
    setBusinesses(prev => prev.map(b => b.id === id ? { ...b, activo: !activo } : b))
  }

  return (
    <div className="bg-white rounded-2xl shadow overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
          <tr>
            <th className="px-4 py-3 text-left">Negocio</th>
            <th className="px-4 py-3 text-left">Slug</th>
            <th className="px-4 py-3 text-left">Owner</th>
            <th className="px-4 py-3 text-left">Plan</th>
            <th className="px-4 py-3 text-left">Estado</th>
            <th className="px-4 py-3 text-left">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {businesses.map(b => (
            <tr key={b.id} className="hover:bg-gray-50 transition">
              <td className="px-4 py-3 font-medium">{b.nombre}</td>
              <td className="px-4 py-3 font-mono text-gray-500">/{b.slug}</td>
              <td className="px-4 py-3 text-gray-500">{b.profiles?.email ?? '—'}</td>
              <td className="px-4 py-3">
                <span className="px-2 py-0.5 bg-brand-100 text-brand-700 rounded-full text-xs font-semibold">
                  {b.plans?.nombre ?? 'Sin plan'}
                </span>
              </td>
              <td className="px-4 py-3">
                {b.activo
                  ? <span className="text-green-600 font-semibold">Activo</span>
                  : <span className="text-red-500 font-semibold">Suspendido</span>}
              </td>
              <td className="px-4 py-3 flex gap-2">
                <a
                  href={`/${b.slug}`}
                  target="_blank"
                  className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 transition"
                >
                  Ver tienda
                </a>
                <button
                  onClick={() => toggleActivo(b.id, b.activo)}
                  className={`text-xs px-2 py-1 rounded transition ${
                    b.activo
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {b.activo ? 'Suspender' : 'Activar'}
                </button>
              </td>
            </tr>
          ))}
          {businesses.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                No hay negocios aún. Crea el primero.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

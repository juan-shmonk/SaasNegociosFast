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
    <div>
      {/* ── Vista móvil: tarjetas ─────────────────────────── */}
      <div className="flex flex-col gap-3 md:hidden">
        {businesses.map(b => (
          <div key={b.id} className="bg-white rounded-xl shadow-sm p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold truncate">{b.nombre}</p>
                <p className="text-xs font-mono text-gray-400 truncate">/{b.slug}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{b.profiles?.email ?? '—'}</p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="px-2 py-0.5 bg-brand-100 text-brand-700 rounded-full text-xs font-semibold whitespace-nowrap">
                  {b.plans?.nombre ?? 'Sin plan'}
                </span>
                {b.activo
                  ? <span className="text-xs text-green-600 font-semibold">Activo</span>
                  : <span className="text-xs text-red-500 font-semibold">Suspendido</span>}
              </div>
            </div>
            <div className="flex gap-2 border-t border-gray-100 pt-2">
              <a href={`/${b.slug}`} target="_blank"
                className="flex-1 text-center text-xs py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                Ver tienda
              </a>
              <button onClick={() => toggleActivo(b.id, b.activo)}
                className={`flex-1 text-xs py-1.5 rounded-lg transition ${
                  b.activo ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}>
                {b.activo ? 'Suspender' : 'Activar'}
              </button>
            </div>
          </div>
        ))}
        {businesses.length === 0 && (
          <p className="text-center text-gray-400 py-8">No hay negocios aún. Crea el primero.</p>
        )}
      </div>

      {/* ── Vista escritorio: tabla ───────────────────────── */}
      <div className="hidden md:block bg-white rounded-2xl shadow overflow-hidden">
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
                  <a href={`/${b.slug}`} target="_blank"
                    className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 transition">
                    Ver tienda
                  </a>
                  <button onClick={() => toggleActivo(b.id, b.activo)}
                    className={`text-xs px-2 py-1 rounded transition ${
                      b.activo ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}>
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
    </div>
  )
}

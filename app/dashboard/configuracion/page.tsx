'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Business } from '@/lib/types'

export default function ConfiguracionPage() {
  const supabase = createClient()
  const [business, setBusiness] = useState<Business | null>(null)
  const [form, setForm] = useState({ nombre: '', descripcion: '', horario: '', color_primario: '#a855f7' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('businesses').select('*').eq('owner_id', user.id).single()
      if (data) {
        setBusiness(data)
        setForm({
          nombre: data.nombre ?? '',
          descripcion: data.descripcion ?? '',
          horario: data.horario ?? '',
          color_primario: data.color_primario ?? '#a855f7',
        })
      }
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!business) return
    setSaving(true)
    await supabase.from('businesses').update(form).eq('id', business.id)
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  if (!business) return <p className="text-gray-400">Cargando...</p>

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Configuración de tu tienda</h1>

      <form onSubmit={handleSave} className="bg-white rounded-2xl shadow p-6 flex flex-col gap-5">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Nombre del negocio
          <input name="nombre" value={form.nombre} onChange={handleChange} required
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Descripción
          <textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows={3}
            placeholder="Cuéntale a tus clientes de qué se trata tu negocio..."
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Horario de atención
          <input name="horario" value={form.horario} onChange={handleChange}
            placeholder="Ej: Lun–Vie 9am–8pm, Sáb 10am–5pm"
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Color de marca
          <div className="flex items-center gap-3">
            <input type="color" name="color_primario" value={form.color_primario} onChange={handleChange}
              className="w-10 h-10 cursor-pointer rounded border border-gray-200" />
            <span className="text-gray-500 text-xs font-mono">{form.color_primario}</span>
            <div className="w-8 h-8 rounded-full" style={{ backgroundColor: form.color_primario }} />
          </div>
        </label>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm text-gray-400 mb-1">URL pública de tu tienda</p>
          <a href={`/${business.slug}`} target="_blank"
            className="text-brand-600 font-mono text-sm hover:underline">
            tudominio.com/{business.slug}
          </a>
        </div>

        <button type="submit" disabled={saving}
          className="bg-brand-600 text-white py-2.5 rounded-lg font-semibold hover:bg-brand-700 transition disabled:opacity-50">
          {saved ? '✅ Guardado' : saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  )
}

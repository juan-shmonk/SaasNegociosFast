'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function NuevoNegocioPage() {
  const supabase = createClient()
  const router = useRouter()

  const [form, setForm] = useState({
    nombre: '',
    slug: '',
    descripcion: '',
    color_primario: '#a855f7',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm(prev => ({
      ...prev,
      [name]: name === 'slug' ? value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: bizErr } = await supabase.from('businesses').insert({
      nombre: form.nombre,
      slug: form.slug,
      descripcion: form.descripcion,
      color_primario: form.color_primario,
      activo: true,
    })

    if (bizErr) {
      setError(bizErr.message)
      setLoading(false)
      return
    }

    setOk(true)
    setLoading(false)
  }

  if (ok) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow p-8 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold mb-2">Negocio creado</h2>
        <p className="text-gray-500 mb-2">
          Storefront disponible en:{' '}
          <a href={`/${form.slug}`} className="text-brand-600 underline" target="_blank">
            /{form.slug}
          </a>
        </p>
        <p className="text-gray-400 text-sm mb-6">
          Envía una invitación de Supabase Auth al owner para que active su cuenta.
        </p>
        <button
          onClick={() => router.push('/admin')}
          className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition"
        >
          Volver al admin
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Nuevo negocio</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4">

        <label className="flex flex-col gap-1 text-sm font-medium">
          Nombre del negocio
          <input name="nombre" value={form.nombre} onChange={handleChange} required
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Slug (URL pública: /tu-negocio)
          <input name="slug" value={form.slug} onChange={handleChange} required
            placeholder="mi-panaderia"
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono" />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Descripción (opcional)
          <textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows={2}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Color de marca
          <div className="flex items-center gap-3">
            <input type="color" name="color_primario" value={form.color_primario} onChange={handleChange}
              className="w-10 h-10 cursor-pointer rounded" />
            <span className="text-gray-500 text-xs font-mono">{form.color_primario}</span>
          </div>
        </label>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button type="submit" disabled={loading}
          className="bg-brand-600 text-white py-2.5 rounded-lg font-semibold hover:bg-brand-700 transition disabled:opacity-50">
          {loading ? 'Creando...' : 'Crear negocio'}
        </button>
      </form>
    </div>
  )
}

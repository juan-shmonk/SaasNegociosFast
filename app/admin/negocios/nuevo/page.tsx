'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NuevoNegocioPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    nombre: '',
    slug: '',
    descripcion: '',
    color_primario: '#a855f7',
    email_owner: '',
    password_owner: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm(prev => ({
      ...prev,
      [name]: name === 'slug'
        ? value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        : value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/crear-negocio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Error desconocido')
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
        <p className="text-gray-500 mb-1">
          Storefront:{' '}
          <a href={`/${form.slug}`} className="text-brand-600 underline" target="_blank">
            /{form.slug}
          </a>
        </p>
        <p className="text-gray-400 text-sm mb-6">
          El owner puede entrar con <strong>{form.email_owner}</strong> y la contraseña que asignaste.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { setOk(false); setForm({ nombre:'', slug:'', descripcion:'', color_primario:'#a855f7', email_owner:'', password_owner:'' }) }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition"
          >
            Crear otro
          </button>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 transition"
          >
            Ver todos los negocios
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Nuevo negocio</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-6 flex flex-col gap-4">

        <div className="pb-2 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Datos del negocio</p>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Nombre del negocio *
          <input name="nombre" value={form.nombre} onChange={handleChange} required
            placeholder="Panadería El Buen Pan"
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Slug — URL pública *
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">tuapp.com/</span>
            <input name="slug" value={form.slug} onChange={handleChange} required
              placeholder="panaderia-el-buen-pan"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono text-sm" />
          </div>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Descripción
          <textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows={2}
            placeholder="Descripción breve del negocio..."
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Color de marca
          <div className="flex items-center gap-3">
            <input type="color" name="color_primario" value={form.color_primario} onChange={handleChange}
              className="w-10 h-10 cursor-pointer rounded border border-gray-200" />
            <div className="w-8 h-8 rounded-full border border-gray-200" style={{ backgroundColor: form.color_primario }} />
            <span className="text-gray-400 text-xs font-mono">{form.color_primario}</span>
          </div>
        </label>

        <div className="pt-2 pb-2 border-b border-t border-gray-100 mt-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cuenta del owner</p>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Correo del cliente *
          <input name="email_owner" type="email" value={form.email_owner} onChange={handleChange} required
            placeholder="cliente@email.com"
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Contraseña temporal *
          <input name="password_owner" type="text" value={form.password_owner} onChange={handleChange} required
            minLength={6}
            placeholder="Mínimo 6 caracteres"
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <span className="text-xs text-gray-400">El owner podrá cambiarla desde su perfil después.</span>
        </label>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <button type="submit" disabled={loading}
          className="bg-brand-600 text-white py-2.5 rounded-lg font-semibold hover:bg-brand-700 transition disabled:opacity-50 mt-2">
          {loading ? 'Creando negocio...' : 'Crear negocio y cuenta'}
        </button>
      </form>
    </div>
  )
}

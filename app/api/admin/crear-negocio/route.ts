import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // Verificar que quien llama es super_admin
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json()
  const { nombre, slug, descripcion, color_primario, email_owner, password_owner } = body

  if (!nombre || !slug || !email_owner || !password_owner) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  // Cliente con service_role — puede crear usuarios
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 1. Crear el usuario owner en Supabase Auth
  const { data: newUser, error: userError } = await admin.auth.admin.createUser({
    email: email_owner,
    password: password_owner,
    email_confirm: true,
  })

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 400 })
  }

  // 2. Crear el negocio enlazado al owner
  const { data: business, error: bizError } = await admin
    .from('businesses')
    .insert({
      owner_id: newUser.user.id,
      nombre,
      slug,
      descripcion: descripcion || null,
      color_primario: color_primario || '#a855f7',
      activo: true,
    })
    .select()
    .single()

  if (bizError) {
    // Si falla el negocio, eliminar el usuario creado para no dejar huérfanos
    await admin.auth.admin.deleteUser(newUser.user.id)
    return NextResponse.json({ error: bizError.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, business, user: newUser.user })
}

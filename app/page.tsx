import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-brand-700 mb-3">SaasNegociosFast</h1>
        <p className="text-xl text-gray-500 max-w-md">
          Tu tienda en línea lista en minutos. Sin apps, sin complicaciones.
        </p>
      </div>

      <div className="flex gap-4">
        <Link
          href="/auth/login"
          className="px-6 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition"
        >
          Iniciar sesión
        </Link>
      </div>

      <p className="text-sm text-gray-400">
        ¿Eres administrador?{' '}
        <Link href="/admin" className="text-brand-600 hover:underline">
          Panel admin
        </Link>
      </p>
    </main>
  )
}

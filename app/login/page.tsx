'use client'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Cookies from 'js-cookie'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('alex@example.com')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      Cookies.set('token', data.token, { expires: 7 })
      localStorage.setItem('user', JSON.stringify(data.user))
      router.push('/feed')
    } catch {
      setError('Erreur réseau, réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top image band */}
      <div className="relative h-56 bg-primary-900 overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700" />
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative flex flex-col items-center justify-center h-full gap-3">
          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-lg">
            <svg viewBox="0 0 32 32" className="w-10 h-10" fill="none">
              <path d="M6 26 C6 26 8 14 16 10 C24 6 28 10 26 18 C24 24 18 28 12 26 C10 25 8 22 10 18 C12 14 18 14 20 18" stroke="#1a4a3a" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Sportunity</h1>
            <p className="text-white/60 text-sm mt-0.5">Le sport plus proche de toi</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 pt-8 pb-8">
        <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Connexion</h2>
        <p className="text-sm text-gray-400 mb-7">Bienvenue ! Entre tes identifiants.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton@email.com"
              required
              autoComplete="email"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700 transition-colors bg-gray-50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700 transition-colors bg-gray-50"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-primary-800 text-white font-bold text-sm mt-1 disabled:opacity-60 active:scale-[0.98] transition-transform"
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          Pas encore de compte ?{' '}
          <Link href="/register" className="text-primary-700 font-semibold">
            Créer un compte
          </Link>
        </p>

        <div className="mt-6 bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
          <p className="text-xs text-gray-500 font-medium">Compte de démo pré-rempli</p>
          <p className="text-xs text-gray-400 mt-0.5">alex@example.com / password123</p>
        </div>
      </div>
    </div>
  )
}

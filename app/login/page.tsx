'use client'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
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
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-500 to-emerald-400 flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
        <div className="mb-8 text-center">
          <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center text-4xl mx-auto mb-4 shadow-xl">
            ⚡
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">Sportunity</h1>
          <p className="text-white/80 mt-2 text-base">Trouve ton prochain match</p>
        </div>

        {/* Card */}
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-5">Connexion</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="ton@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              label="Mot de passe"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-2xl px-4 py-3">
                {error}
              </div>
            )}

            <Button type="submit" fullWidth size="lg" loading={loading} className="mt-1">
              Se connecter
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Pas encore de compte ?{' '}
            <Link href="/register" className="text-primary-600 font-semibold hover:underline">
              Créer un compte
            </Link>
          </p>

          {/* Demo hint */}
          <div className="mt-4 bg-primary-50 rounded-2xl p-3 text-center">
            <p className="text-xs text-primary-600 font-medium">Compte de démo pré-rempli</p>
            <p className="text-xs text-gray-500 mt-0.5">alex@example.com / password123</p>
          </div>
        </div>
      </div>
    </div>
  )
}

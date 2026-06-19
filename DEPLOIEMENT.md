# 🚀 Guide de mise en production — Sportunity

## Stack
- **DB** : Supabase (PostgreSQL)
- **ORM** : Prisma 7
- **Auth** : Supabase Auth
- **Deploy** : Vercel

---

## Étape 1 — Créer le projet Supabase

1. Va sur [supabase.com](https://supabase.com) → **New project**
2. Choisis une région EU (ex: **West EU — Paris**)
3. Note le mot de passe de la base de données

---

## Étape 2 — Récupérer les clés

Dans **Settings → API** :
- `NEXT_PUBLIC_SUPABASE_URL` → Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → anon public
- `SUPABASE_SERVICE_ROLE_KEY` → service_role ⚠️ secret

Dans **Settings → Database → Connection string** :
- `DATABASE_URL` → **Transaction** (port 6543) — pour Prisma runtime
- `DIRECT_URL` → **Direct** (port 5432) — pour les migrations

---

## Étape 3 — Config locale

```bash
cp .env.local.example .env.local
# Remplis les 5 variables Supabase
# Mets USE_MOCK_DATA=false pour utiliser la vraie DB
```

---

## Étape 4 — Migrations

```bash
# Créer les tables en DB
npx prisma migrate dev --name init

# Ou si tu veux juste pousser sans historique de migration
npx prisma db push
```

---

## Étape 5 — Seed (données MEL)

```bash
npm run db:seed
```

Crée automatiquement :
- 10 utilisateurs Supabase Auth (email + `Sportunity2024!`)
- 10 profils (Lille, Roubaix, Tourcoing, Villeneuve-d'Ascq...)
- 6 coachs MEL
- 8 séances de coaching
- 6 matchs, 3 tournois, 4 compétitions
- 4 articles experts
- 10 infrastructures

---

## Étape 6 — Déploiement Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel

# Ajouter les variables d'environnement dans Vercel dashboard
# ou via CLI :
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add DATABASE_URL
vercel env add DIRECT_URL
vercel env add USE_MOCK_DATA   # → false

# Re-déployer en production
vercel --prod
```

---

## Activation de l'email auth Supabase

Dans **Supabase → Authentication → Providers** :
- ✅ Email/Password → activé
- Optionnel : désactiver "Confirm email" pour les tests

---

## Développement local sans Supabase

```bash
# .env.local
USE_MOCK_DATA=true

npm run dev
```

Les données mock en mémoire sont utilisées, aucune connexion DB requise.

---

## Scripts utiles

```bash
npm run db:migrate   # Nouvelle migration
npm run db:push      # Push schema sans migration
npm run db:seed      # Seed données MEL
npm run db:studio    # Prisma Studio (GUI DB)
npm run db:reset     # Reset complet + reseed
```

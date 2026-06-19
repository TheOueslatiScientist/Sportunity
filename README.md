# ⚡ Sportunity

Plateforme mobile-first pour trouver des terrains sportifs, rejoindre des événements et connecter avec des partenaires de sport.

## Stack technique

- **Frontend** : Next.js 14 (App Router) + Tailwind CSS
- **Backend** : Next.js API Routes (Node.js)
- **Base de données** : PostgreSQL (optionnel — mode mock inclus)
- **Auth** : JWT (jsonwebtoken + bcryptjs)
- **Carte** : Leaflet + OpenStreetMap (sans clé API)

---

## Lancer le projet en local

### 1. Installer les dépendances

```bash
npm install
```

### 2. Configurer l'environnement

```bash
cp .env.example .env.local
```

Le fichier `.env.local` est déjà créé avec `USE_MOCK_DATA=true` — **aucune base de données n'est nécessaire pour démarrer**.

### 3. Lancer le serveur de développement

```bash
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000)

---

## Mode Mock vs PostgreSQL

| Variable | Valeur | Comportement |
|---|---|---|
| `USE_MOCK_DATA` | `true` | Données en mémoire (défaut, aucun setup requis) |
| `USE_MOCK_DATA` | `false` | Connexion PostgreSQL via `DATABASE_URL` |

### Setup PostgreSQL (optionnel)

```bash
# Créer la base
psql -U postgres -c "CREATE DATABASE sportunity;"

# Créer les tables
psql -U postgres -d sportunity -f database/schema.sql

# Insérer les données de test
psql -U postgres -d sportunity -f database/seed.sql
```

Puis dans `.env.local` :
```
USE_MOCK_DATA=false
DATABASE_URL=postgresql://postgres:password@localhost:5432/sportunity
```

---

## Comptes de démo

| Email | Mot de passe | Rôle |
|---|---|---|
| alex@example.com | password123 | Utilisateur |
| sarah@example.com | password123 | Coach Fitness |
| marc@example.com | password123 | Coach Natation |

---

## Structure du projet

```
sportunity/
├── app/
│   ├── api/                   # Routes API REST
│   │   ├── auth/login/        # POST /api/auth/login
│   │   ├── auth/register/     # POST /api/auth/register
│   │   ├── users/             # GET /api/users, PATCH /api/users/:id
│   │   ├── infrastructures/   # GET /api/infrastructures, /nearby
│   │   ├── events/            # GET/POST /api/events, POST /join
│   │   ├── messages/          # POST /api/messages, GET /:userId
│   │   ├── coaches/           # GET /api/coaches
│   │   └── sports/            # GET /api/sports
│   ├── home/                  # Carte interactive (page principale)
│   ├── events/                # Liste + création d'événements
│   ├── coaches/               # Liste des coachs
│   ├── chat/                  # Messagerie 1-to-1
│   ├── profile/               # Profil utilisateur
│   ├── login/                 # Connexion
│   └── register/              # Inscription
├── components/
│   ├── BottomNav.tsx           # Navigation mobile
│   ├── Map/                    # Carte Leaflet + filtres
│   ├── cards/                  # EventCard, CoachCard, UserCard, InfrastructureSheet
│   └── ui/                     # Button, Input, Badge
├── lib/
│   ├── auth.ts                 # JWT helpers
│   ├── db.ts                   # Pool PostgreSQL
│   ├── mock-data.ts            # Données de démo
│   └── utils.ts                # Helpers (distance, formatters…)
├── types/index.ts              # TypeScript types
└── database/
    ├── schema.sql              # Schéma PostgreSQL complet
    └── seed.sql                # Données initiales
```

---

## API REST

### Auth
```
POST /api/auth/register   { email, password, name }
POST /api/auth/login      { email, password }
```

### Utilisateurs
```
GET  /api/users           ?sport=Football&city=Paris
GET  /api/users/:id
PATCH /api/users/:id      { name, bio, level, city }  (auth required)
```

### Infrastructures
```
GET /api/infrastructures  ?type=football&status=available&public=true
GET /api/infrastructures/nearby  ?lat=48.8&lng=2.3&radius=5&type=football
```

### Événements
```
GET  /api/events          ?sport=Football&level=intermediate  (auth required)
POST /api/events          { title, sport_id, date, max_participants, level }  (auth required)
POST /api/events/:id/join  (auth required)
```

### Messages
```
POST /api/messages        { receiver_id, content }  (auth required)
GET  /api/messages/:userId  (auth required)
```

### Coachs
```
GET /api/coaches          ?sport=Tennis
```

---

## Fonctionnalités MVP

- [x] Authentification JWT (inscription / connexion)
- [x] Carte interactive plein écran (Leaflet + OpenStreetMap)
- [x] Géolocalisation utilisateur
- [x] Marqueurs personnalisés par type de sport
- [x] Statut en temps réel (disponible / occupé / travaux)
- [x] Filtres carte (sport + statut)
- [x] Fiche infrastructure (sheet bottom)
- [x] Événements (liste, création, rejoindre)
- [x] Coachs (liste, contact)
- [x] Messagerie 1-to-1
- [x] Profil utilisateur (éditable)
- [x] Navigation mobile bottom bar
- [x] Design mobile-first (inspiré Strava/Airbnb)

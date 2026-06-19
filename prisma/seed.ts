/**
 * Prisma Seed — Métropole Européenne de Lille
 * npx prisma db seed
 */
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Charger .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const pool = new Pool({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Supabase admin client (needs SUPABASE_SERVICE_ROLE_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function createAuthUser(email: string, name: string): Promise<string> {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: 'Sportunity2024!',
    email_confirm: true,
    user_metadata: { name },
  })
  if (error) {
    // User might already exist — try to find them
    const { data: listData } = await supabase.auth.admin.listUsers()
    const existing = listData?.users.find((u) => u.email === email)
    if (existing) return existing.id
    throw new Error(`Cannot create user ${email}: ${error.message}`)
  }
  return data.user.id
}

async function main() {
  console.log('🌱 Seeding Sportunity — MEL data...')

  // ── 1. Sports ──────────────────────────────────────────────────────────────
  const sports = await Promise.all([
    prisma.sport.upsert({ where: { name: 'Football' },    update: {}, create: { name: 'Football',       icon: '⚽', color: '#22c55e' } }),
    prisma.sport.upsert({ where: { name: 'Basketball' },  update: {}, create: { name: 'Basketball',     icon: '🏀', color: '#f97316' } }),
    prisma.sport.upsert({ where: { name: 'Tennis' },      update: {}, create: { name: 'Tennis',         icon: '🎾', color: '#eab308' } }),
    prisma.sport.upsert({ where: { name: 'Running' },     update: {}, create: { name: 'Running',        icon: '🏃', color: '#3b82f6' } }),
    prisma.sport.upsert({ where: { name: 'Natation' },    update: {}, create: { name: 'Natation',       icon: '🏊', color: '#06b6d4' } }),
    prisma.sport.upsert({ where: { name: 'Volleyball' },  update: {}, create: { name: 'Volleyball',     icon: '🏐', color: '#8b5cf6' } }),
    prisma.sport.upsert({ where: { name: 'Padel' },       update: {}, create: { name: 'Padel',          icon: '🏓', color: '#ec4899' } }),
    prisma.sport.upsert({ where: { name: 'Gym / Fitness' }, update: {}, create: { name: 'Gym / Fitness', icon: '💪', color: '#ef4444' } }),
    prisma.sport.upsert({ where: { name: 'Boxe' },        update: {}, create: { name: 'Boxe',           icon: '🥊', color: '#dc2626' } }),
    prisma.sport.upsert({ where: { name: 'Cyclisme' },    update: {}, create: { name: 'Cyclisme',       icon: '🚴', color: '#7c3aed' } }),
  ])
  console.log(`✅ ${sports.length} sports créés`)

  const [football, basketball, tennis, running, natation, volleyball, padel, gym, boxe, cyclisme] = sports

  // ── 2. Profiles (with Supabase Auth users) ─────────────────────────────────
  const usersData = [
    { email: 'alex@sportunity.fr',      name: 'Alex Moreau',        city: 'Lille',               lat: 50.6292, lng: 3.0573, level: 'INTERMEDIATE', isCoach: false, role: 'USER',   bio: 'Passionné de football et de running. Toujours partant pour un match à Lille !' },
    { email: 'sarah@sportunity.fr',     name: 'Sarah Maes',         city: 'Roubaix',             lat: 50.6942, lng: 3.1746, level: 'PRO',          isCoach: true,  role: 'COACH',  bio: 'Coach fitness certifiée à Roubaix. Spécialiste remise en forme et préparation physique.' },
    { email: 'thomas@sportunity.fr',    name: 'Thomas Leroy',       city: "Villeneuve-d'Ascq",   lat: 50.6278, lng: 3.1427, level: 'ADVANCED',     isCoach: false, role: 'USER',   bio: "Basketteur amateur à Villeneuve-d'Ascq. 1m92, poste d'ailier." },
    { email: 'julie@sportunity.fr',     name: 'Julie Vandenberghe', city: 'Tourcoing',           lat: 50.7239, lng: 3.1612, level: 'ADVANCED',     isCoach: true,  role: 'COACH',  bio: 'Joueuse de tennis classée 15/1 à Tourcoing. Monitrice FFT.' },
    { email: 'marc@sportunity.fr',      name: 'Marc Fontaine',      city: "Villeneuve-d'Ascq",   lat: 50.6278, lng: 3.1427, level: 'PRO',          isCoach: true,  role: 'COACH',  bio: 'Coach natation professionnel. Ancien nageur de compétition niveau national.' },
    { email: 'karim@sportunity.fr',     name: 'Karim Benzara',      city: 'Lille',               lat: 50.6292, lng: 3.0573, level: 'PRO',          isCoach: true,  role: 'COACH',  bio: 'Coach football UEFA B à Lille. Ex-joueur R1 USLF. Spécialiste jeunes et technique.' },
    { email: 'baptiste@sportunity.fr',  name: 'Baptiste Morel',     city: "Villeneuve-d'Ascq",   lat: 50.6278, lng: 3.1427, level: 'PRO',          isCoach: true,  role: 'COACH',  bio: "Coach running et trail à Villeneuve-d'Ascq. Finisher UTMB 2023." },
    { email: 'laurie@sportunity.fr',    name: 'Laurie Maes',        city: 'Lambersart',          lat: 50.6442, lng: 3.0239, level: 'PRO',          isCoach: true,  role: 'COACH',  bio: 'Coach boxe à Lille. Championne régionale amateur. Cours tous niveaux.' },
    { email: 'romain@sportunity.fr',    name: 'Romain Vasseur',     city: 'Marcq-en-Barœul',    lat: 50.6694, lng: 3.0931, level: 'INTERMEDIATE', isCoach: false, role: 'USER',   bio: 'Footballer passionné à Marcq-en-Barœul. Organisateur de matchs amicaux.' },
    { email: 'camille@sportunity.fr',   name: 'Camille Deschamps',  city: 'Wasquehal',           lat: 50.6831, lng: 3.1517, level: 'ADVANCED',     isCoach: false, role: 'EXPERT', bio: 'Running addict et triathlète à Wasquehal. Toujours à la recherche de partenaires !' },
  ]

  const profiles: any[] = []
  for (const u of usersData) {
    console.log(`  Creating user ${u.email}...`)
    const supabaseId = await createAuthUser(u.email, u.name)
    const existing = await prisma.profile.findUnique({ where: { userId: supabaseId } })
    if (existing) {
      profiles.push(existing)
      continue
    }
    const profile = await prisma.profile.create({
      data: {
        userId: supabaseId,
        name: u.name,
        email: u.email,
        avatarUrl: `https://api.dicebear.com/8.x/avataaars/svg?seed=${u.name.split(' ')[0].toLowerCase()}`,
        bio: u.bio,
        level: u.level as any,
        lat: u.lat,
        lng: u.lng,
        city: u.city,
        isCoach: u.isCoach,
        role: u.role as any,
      },
    })
    profiles.push(profile)
  }
  console.log(`✅ ${profiles.length} profils créés`)

  const [alex, sarah, thomas, julie, marc, karim, baptiste, laurie, romain, camille] = profiles

  // ── 3. Coaches ─────────────────────────────────────────────────────────────
  const coachesData = [
    {
      profile: sarah, sport: gym,
      data: { hourlyRate: 55, experienceYears: 8, rating: 4.9, reviewsCount: 127, isCertified: true, isPopular: true, isAvailableNow: true, city: 'Roubaix', lat: 50.6942, lng: 3.1746, certifications: ['BPJEPS AF', 'Nutrition sportive'], specialties: ['Remise en forme', 'Perte de poids', 'Prépa physique'], languages: ['Français', 'Anglais'], availabilityText: 'Lun-Sam 7h-20h', description: 'Coach fitness certifiée avec 8 ans d\'expérience. Spécialisée remise en forme, perte de poids et préparation physique. Cours individuels et petits groupes.', clientsCount: 85, sessionsCount: 420 },
    },
    {
      profile: julie, sport: tennis,
      data: { hourlyRate: 45, experienceYears: 6, rating: 4.8, reviewsCount: 89, isCertified: true, isPopular: false, isAvailableNow: true, city: 'Tourcoing', lat: 50.7239, lng: 3.1612, certifications: ['Moniteur FFT', 'BPJEPS Tennis'], specialties: ['Technique', 'Classement', 'Jeunes'], languages: ['Français'], availabilityText: 'Mar-Dim 9h-18h', description: 'Monitrice FFT classée 15/1. Cours tous niveaux, de débutant à compétiteur.', clientsCount: 62, sessionsCount: 285 },
    },
    {
      profile: marc, sport: natation,
      data: { hourlyRate: 50, experienceYears: 12, rating: 4.95, reviewsCount: 203, isCertified: true, isPopular: true, isAvailableNow: false, city: "Villeneuve-d'Ascq", lat: 50.6278, lng: 3.1427, certifications: ['BEESAN', 'MNS', 'Prépa physique'], specialties: ['Natation compétition', 'Triathlon', 'Adultes débutants'], languages: ['Français', 'Anglais'], availabilityText: 'Lun-Ven 6h-12h et 17h-20h', description: 'Coach natation professionnel, ancien nageur de compétition niveau national. Prépare les nageurs de tous niveaux.', clientsCount: 142, sessionsCount: 890 },
    },
    {
      profile: karim, sport: football,
      data: { hourlyRate: 60, experienceYears: 10, rating: 4.7, reviewsCount: 56, isCertified: true, isPopular: false, isAvailableNow: true, city: 'Lille', lat: 50.6292, lng: 3.0573, certifications: ['UEFA B', 'BEPF'], specialties: ['Technique individuelle', 'Jeunes 8-18 ans', 'Prépa physique foot'], languages: ['Français', 'Arabe'], availabilityText: 'Mer-Dim 14h-20h', description: 'Coach football UEFA B, ex-joueur R1 USLF. Spécialisé dans le développement des jeunes joueurs.', clientsCount: 38, sessionsCount: 195 },
    },
    {
      profile: baptiste, sport: running,
      data: { hourlyRate: 40, experienceYears: 7, rating: 4.85, reviewsCount: 74, isCertified: true, isPopular: false, isAvailableNow: true, city: "Villeneuve-d'Ascq", lat: 50.6278, lng: 3.1427, certifications: ['BPJEPS APT', 'Trail certifié'], specialties: ['Marathon', 'Trail', 'Triathlon running'], languages: ['Français'], availabilityText: 'Lun-Sam 6h-9h et 17h-19h', description: 'Coach running & trail, finisher UTMB 2023. Plans d\'entraînement personnalisés pour tous objectifs.', clientsCount: 51, sessionsCount: 312 },
    },
    {
      profile: laurie, sport: boxe,
      data: { hourlyRate: 35, experienceYears: 5, rating: 4.6, reviewsCount: 41, isCertified: true, isPopular: false, isAvailableNow: false, city: 'Lambersart', lat: 50.6442, lng: 3.0239, certifications: ['BE Boxe française', 'Premiers secours'], specialties: ['Boxe anglaise', 'Boxe fitness', 'Self-défense'], languages: ['Français'], availabilityText: 'Lun-Ven 18h-21h, Sam 10h-13h', description: 'Championne régionale amateur, coach boxe tous niveaux. Cours de boxe fitness, boxe anglaise et self-défense.', clientsCount: 29, sessionsCount: 148 },
    },
  ]

  const coaches: any[] = []
  for (const { profile, sport, data } of coachesData) {
    const existing = await prisma.coach.findUnique({ where: { profileId: profile.id } })
    if (existing) { coaches.push(existing); continue }
    const coach = await prisma.coach.create({
      data: { profileId: profile.id, sportId: sport.id, ...data },
    })
    coaches.push(coach)
  }
  console.log(`✅ ${coaches.length} coachs créés`)

  const [coachSarah, coachJulie, coachMarc, coachKarim, coachBaptiste, coachLaurie] = coaches

  // ── 4. Coach Sessions ──────────────────────────────────────────────────────
  const now = new Date()
  const sessionsData = [
    { coach: coachSarah,   client: alex,    date: new Date(now.getTime() + 2 * 86400000), duration: 60, location: 'Salle fitness Roubaix Centre', city: 'Roubaix',            status: 'SCHEDULED', price: 55 },
    { coach: coachSarah,   client: romain,  date: new Date(now.getTime() + 5 * 86400000), duration: 90, location: 'Parc Barbieux, Roubaix',       city: 'Roubaix',            status: 'SCHEDULED', price: 75 },
    { coach: coachMarc,    client: camille, date: new Date(now.getTime() - 3 * 86400000), duration: 60, location: 'Piscine Camus, Roubaix',         city: 'Roubaix',            status: 'COMPLETED', price: 50 },
    { coach: coachJulie,   client: alex,    date: new Date(now.getTime() - 7 * 86400000), duration: 60, location: 'TC Tourcoing, Tourcoing',        city: 'Tourcoing',          status: 'COMPLETED', price: 45 },
    { coach: coachKarim,   client: thomas,  date: new Date(now.getTime() + 1 * 86400000), duration: 90, location: 'Stade Lille-Métropole, Villeneuve', city: "Villeneuve-d'Ascq", status: 'SCHEDULED', price: 90 },
    { coach: coachBaptiste, client: camille, date: new Date(now.getTime() + 3 * 86400000), duration: 60, location: 'Parc Citadelle, Lille',          city: 'Lille',              status: 'SCHEDULED', price: 40 },
    { coach: coachSarah,   client: julie,   date: new Date(now.getTime() - 14 * 86400000), duration: 60, location: 'Salle Barbieux, Roubaix',       city: 'Roubaix',            status: 'COMPLETED', price: 55 },
    { coach: coachLaurie,  client: thomas,  date: new Date(now.getTime() - 5 * 86400000), duration: 60, location: 'Gym Boxing Lambersart',           city: 'Lambersart',         status: 'CANCELLED', price: 35 },
  ]

  for (const s of sessionsData) {
    await prisma.coachSession.create({
      data: {
        coachId: s.coach.id,
        clientId: s.client.id,
        date: s.date,
        durationMinutes: s.duration,
        location: s.location,
        city: s.city,
        status: s.status as any,
        price: s.price,
      },
    })
  }
  console.log(`✅ ${sessionsData.length} séances créées`)

  // ── 5. Matches ─────────────────────────────────────────────────────────────
  const matchesData = [
    { title: 'Foot 5v5 Citadelle', sportId: football.id, creatorId: alex.id, date: new Date(now.getTime() + 2 * 86400000), location: 'Parc de la Citadelle', city: 'Lille', lat: 50.6406, lng: 3.0488, maxPlayers: 10, status: 'OPEN', level: 'all', hasTeams: true, teamAName: 'Équipe A', teamBName: 'Équipe B', participants: [alex.id, romain.id, thomas.id] },
    { title: 'Basket 3x3 Villeneuve', sportId: basketball.id, creatorId: thomas.id, date: new Date(now.getTime() + 3 * 86400000), location: 'Gymnase du Pont de Bois', city: "Villeneuve-d'Ascq", lat: 50.6157, lng: 3.1373, maxPlayers: 6, status: 'OPEN', level: 'intermediate', hasTeams: false, participants: [thomas.id] },
    { title: 'Running Citadelle 10km', sportId: running.id, creatorId: camille.id, date: new Date(now.getTime() + 4 * 86400000), location: 'Parc de la Citadelle', city: 'Lille', lat: 50.6406, lng: 3.0488, maxPlayers: 15, status: 'OPEN', level: 'advanced', hasTeams: false, participants: [camille.id, alex.id] },
    { title: 'Tennis double Roubaix', sportId: tennis.id, creatorId: julie.id, date: new Date(now.getTime() + 1 * 86400000), location: 'Tennis Club Roubaix', city: 'Roubaix', lat: 50.6942, lng: 3.1746, maxPlayers: 4, status: 'FULL', level: 'advanced', hasTeams: true, teamAName: 'Paire A', teamBName: 'Paire B', participants: [julie.id, karim.id, sarah.id, marc.id] },
    { title: 'Padel fun Tourcoing', sportId: padel.id, creatorId: romain.id, date: new Date(now.getTime() + 6 * 86400000), location: 'Padel Academy Tourcoing', city: 'Tourcoing', lat: 50.7239, lng: 3.1612, maxPlayers: 4, status: 'OPEN', level: 'beginner', hasTeams: false, participants: [romain.id] },
    { title: 'Volley Marcq plage', sportId: volleyball.id, creatorId: romain.id, date: new Date(now.getTime() + 7 * 86400000), location: 'Terrain de beach, Marcq-en-Barœul', city: 'Marcq-en-Barœul', lat: 50.6694, lng: 3.0931, maxPlayers: 12, status: 'OPEN', level: 'beginner', hasTeams: false, participants: [romain.id, camille.id] },
  ]

  for (const m of matchesData) {
    const { participants, ...matchData } = m
    const createdMatch = await prisma.match.create({ data: matchData as any })
    for (const profileId of participants) {
      await prisma.matchParticipant.create({ data: { matchId: createdMatch.id, profileId } })
    }
  }
  console.log(`✅ ${matchesData.length} matchs créés`)

  // ── 6. Tournaments ─────────────────────────────────────────────────────────
  await prisma.tournament.createMany({
    data: [
      { title: 'Coupe MEL Football', sportId: football.id, creatorId: karim.id, startDate: new Date(now.getTime() + 14 * 86400000), endDate: new Date(now.getTime() + 28 * 86400000), location: 'Stade Pierre-Mauroy', city: 'Villeneuve-d\'Ascq', lat: 50.6113, lng: 3.1302, maxTeams: 16, teamsCount: 7, description: 'Tournoi de football à 7 ouvert aux clubs et équipes amateures de la MEL.', prize: '500€ + Trophée', status: 'OPEN' },
      { title: 'Open Basket Lille', sportId: basketball.id, creatorId: thomas.id, startDate: new Date(now.getTime() + 21 * 86400000), endDate: new Date(now.getTime() + 22 * 86400000), location: 'Palais des Sports Lille', city: 'Lille', lat: 50.6333, lng: 3.0589, maxTeams: 8, teamsCount: 3, description: 'Tournoi de basket 3x3 et 5v5. Toutes catégories.', status: 'OPEN' },
      { title: 'Padel Tourcoing Cup', sportId: padel.id, creatorId: julie.id, startDate: new Date(now.getTime() + 30 * 86400000), endDate: new Date(now.getTime() + 31 * 86400000), location: 'Padel Academy Tourcoing', city: 'Tourcoing', lat: 50.7239, lng: 3.1612, maxTeams: 12, teamsCount: 5, description: 'Coupe de padel en double. Niveaux débutant et intermédiaire.', prize: '200€ de matériel', status: 'OPEN' },
    ],
  })
  console.log('✅ 3 tournois créés')

  // ── 7. Competitions ────────────────────────────────────────────────────────
  const comps = await prisma.competition.createMany({
    data: [
      { title: 'Lille City Run 10km', sportId: running.id, creatorId: camille.id, date: new Date(now.getTime() + 30 * 86400000), location: 'Parc de la Citadelle', city: 'Lille', lat: 50.6406, lng: 3.0488, maxParticipants: 500, description: 'Course urbaine 10km à travers Lille. Chronométrée. Tous niveaux bienvenus.', type: 'RACE', status: 'OPEN', distanceKm: 10, priceEntry: 15 },
      { title: 'Triathlon MEL Roubaix', sportId: natation.id, creatorId: marc.id, date: new Date(now.getTime() + 45 * 86400000), location: 'Piscine Camus & Parc Barbieux', city: 'Roubaix', lat: 50.6942, lng: 3.1746, maxParticipants: 200, description: 'Triathlon sprint : 400m natation, 20km vélo, 5km course. Classement par catégorie d\'âge.', type: 'RACE', status: 'OPEN', distanceKm: 25.4, priceEntry: 45 },
      { title: 'Tennis Open Tourcoing', sportId: tennis.id, creatorId: julie.id, date: new Date(now.getTime() + 20 * 86400000), location: 'TC Tourcoing', city: 'Tourcoing', lat: 50.7239, lng: 3.1612, maxParticipants: 64, description: 'Tournoi de tennis open, classement 30 à 15/1. Simple messieurs et dames.', type: 'TOURNAMENT', status: 'OPEN', priceEntry: 20 },
      { title: 'Cross Université Lille', sportId: running.id, creatorId: baptiste.id, date: new Date(now.getTime() + 10 * 86400000), location: 'Campus Cité Scientifique', city: "Villeneuve-d'Ascq", lat: 50.6076, lng: 3.1363, maxParticipants: 300, description: 'Cross annuel sur le campus. 5km et 8km. Ouvert aux étudiants et personnels.', type: 'RACE', status: 'OPEN', distanceKm: 8, priceEntry: 5 },
    ],
  })
  console.log('✅ 4 compétitions créées')

  // ── 8. Expert Posts ────────────────────────────────────────────────────────
  const expertPostsData = [
    {
      authorId: karim.id, sportId: football.id, title: 'Les 5 exercices clés pour progresser en football', category: 'TRAINING' as const,
      content: `**La maîtrise technique est la base de tout footballeur.**\n\nVoici les 5 exercices incontournables pour progresser rapidement :\n\n**1. Le jonglage quotidien**\nCommencez par 5 minutes de jonglage chaque jour. Alternez pied droit, pied gauche, et tête.\n\n**2. La conduite de balle en slalom**\nPlacez des cônes tous les 50cm et slalomez à vitesse progressive. Travaillez les deux pieds.\n\n**3. Les passes contre un mur**\nContrôle-frappe contre un mur, 15 minutes par session. L'automatisme vient avec la répétition.\n\n**4. La frappe longue distance**\nTravaillez la technique de frappe : appui, frappe avec le coup de pied et suivi du mouvement.\n\n**5. Le jeu de tête**\nAvec un partenaire ou un mur, travaillez les repises de tête en puissance et en précision.`,
      readTime: 3,
    },
    {
      authorId: marc.id, sportId: natation.id, title: 'Nutrition post-effort : que manger après une séance intense ?', category: 'NUTRITION' as const,
      content: `**La fenêtre anabolique des 30 minutes post-effort est cruciale.**\n\nAprès une séance intense de natation ou de sport cardio, votre corps a besoin de reconstituer ses réserves rapidement.\n\n**Les glucides d'abord**\nConsuming 1g de glucides par kg de poids corporel dans les 30 minutes post-effort. Banane, pain complet, riz.\n\n**Les protéines ensuite**\n20-30g de protéines complètes : whey, yaourt grec, œufs ou viande maigre.\n\n**L'hydratation avant tout**\nRehydratez-vous avec de l'eau et des électrolytes. Pesez-vous avant/après pour calculer les pertes.\n\n**Exemple de repas post-entraînement**\n- Shake protéiné + 1 banane (immédiat)\n- Riz + poulet + légumes (1h après)\n- Eau + boisson isotonique`,
      readTime: 4,
    },
    {
      authorId: baptiste.id, sportId: running.id, title: 'Prévenir les blessures en running : le guide complet', category: 'RECOVERY' as const,
      content: `**80% des blessures du coureur sont évitables.**\n\nEn tant que coach running et finisher UTMB, j'ai compilé les erreurs les plus fréquentes et comment les éviter.\n\n**L'erreur #1 : Trop vite, trop tôt**\nLa règle des 10% : n'augmentez jamais votre volume hebdomadaire de plus de 10% par semaine.\n\n**L'échauffement dynamique**\nJamais de stretching statique avant de courir. Préférez les rotations articulaires, montées de genoux et talons-fesses.\n\n**Le renforcement musculaire**\n2 séances de gainage et de renforcement des jambes par semaine réduisent les blessures de 50%.\n\n**La récupération active**\nAprès une course difficile : marche 20min, bain froid (jambes), rouleau de massage.\n\n**Les chaussures**\nChangez vos chaussures tous les 700-800km, même si elles paraissent en bon état.`,
      readTime: 5,
    },
    {
      authorId: julie.id, sportId: tennis.id, title: 'Améliorer son service : les secrets des pros', category: 'TECHNIQUE' as const,
      content: `**Le service est l'arme la plus importante au tennis.**\n\nEn tant que monitrice FFT classée 15/1, voici les points clés pour un service efficace.\n\n**Le lancer de balle**\nLancez toujours la balle légèrement devant vous et vers la droite (droitier). La constance du lancer est 70% du service.\n\n**La pronation**\nLe mouvement de pronation (rotation de l'avant-bras) génère la puissance et l'effet. Exercez-vous avec une raquette verticale.\n\n**Le genou fléchi**\nPliez les genoux et utilisez la poussée des jambes pour générer de la puissance ascendante.\n\n**La variété**\nTravaillez 3 services : slice (côté), kick (lifté) et plat. La variété déstabilise l'adversaire.\n\n**L'entraînement**\n50 services par séance, répartis équitablement entre les 3 types.`,
      readTime: 4,
    },
  ]

  for (const post of expertPostsData) {
    const wordCount = post.content.trim().split(/\s+/).length
    const excerpt = post.content.trim().split('\n')[0].replace(/\*\*/g, '').slice(0, 120) + '…'
    await prisma.expertPost.create({
      data: {
        authorId: post.authorId,
        sportId: post.sportId,
        title: post.title,
        content: post.content,
        excerpt,
        category: post.category,
        readTime: post.readTime,
        likes: Math.floor(Math.random() * 50) + 5,
      },
    })
  }
  console.log(`✅ ${expertPostsData.length} articles experts créés`)

  // ── 9. Infrastructures ─────────────────────────────────────────────────────
  await prisma.infrastructure.createMany({
    data: [
      { name: 'Stade Pierre-Mauroy',           type: 'FOOTBALL',    address: '261 Bd de Tournai, Villeneuve-d\'Ascq', lat: 50.6113, lng: 3.1302, isPublic: false, status: 'AVAILABLE',   sportId: football.id },
      { name: 'Palais des Sports de Lille',    type: 'BASKETBALL',  address: '4 Bd des Cités Unies, Lille',          lat: 50.6333, lng: 3.0589, isPublic: false, status: 'AVAILABLE',   sportId: basketball.id },
      { name: 'Piscine Municipale A. Camus',   type: 'SWIMMING',    address: 'Rue Jules Guesde, Roubaix',            lat: 50.6891, lng: 3.1651, isPublic: true,  status: 'AVAILABLE',   sportId: natation.id },
      { name: 'Parc de la Citadelle',          type: 'RUNNING',     address: 'Avenue du 43e Régiment, Lille',        lat: 50.6406, lng: 3.0488, isPublic: true,  status: 'AVAILABLE' },
      { name: 'Tennis Club Tourcoing',         type: 'TENNIS',      address: 'Rue de la Marlière, Tourcoing',        lat: 50.7239, lng: 3.1612, isPublic: false, status: 'AVAILABLE',   sportId: tennis.id },
      { name: 'Gymnase du Pont de Bois',       type: 'BASKETBALL',  address: 'Av. Paul Langevin, Villeneuve-d\'Ascq',lat: 50.6157, lng: 3.1373, isPublic: false, status: 'AVAILABLE',   sportId: basketball.id },
      { name: 'Padel Academy Tourcoing',       type: 'PADEL',       address: 'ZA du Ravelin, Tourcoing',            lat: 50.7195, lng: 3.1585, isPublic: false, status: 'AVAILABLE',   sportId: padel.id },
      { name: 'Complexe Sportif Marcq',        type: 'GYM',         address: 'Rue du Maréchal Foch, Marcq-en-Barœul',lat: 50.6694, lng: 3.0931, isPublic: false, status: 'AVAILABLE',   sportId: gym.id },
      { name: 'Stade Villeneuve-d\'Ascq',      type: 'FOOTBALL',    address: 'Rue de Tournai, Villeneuve-d\'Ascq',   lat: 50.6278, lng: 3.1427, isPublic: true,  status: 'AVAILABLE',   sportId: football.id },
      { name: 'Gymnase Lambersart',            type: 'GYM',         address: 'Rue du Général de Gaulle, Lambersart', lat: 50.6442, lng: 3.0239, isPublic: false, status: 'AVAILABLE',   sportId: boxe.id },
    ],
  })
  console.log('✅ 10 infrastructures créées')

  console.log('\n🎉 Seed terminé ! Toutes les données MEL sont en place.')
  console.log('   Mot de passe de tous les utilisateurs: Sportunity2024!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

import { prisma } from '@/lib/prisma'

export const TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'searchInfrastructures',
      description: 'Rechercher des terrains et infrastructures sportives par ville et/ou type de sport',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'Ville dans la MEL (ex: Lille, Roubaix, Tourcoing)' },
          sport: { type: 'string', description: 'Type de sport: football, basketball, tennis, running, gym, swimming, volleyball, padel, other' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getOpenMatches',
      description: 'Trouver les matchs ouverts aux inscriptions (status=open uniquement)',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'Ville dans la MEL' },
          sport: { type: 'string', description: 'Nom du sport (ex: Football, Basketball, Tennis)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'searchCoaches',
      description: 'Trouver des coachs sportifs avec leur tarif et disponibilités',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'Ville dans la MEL' },
          sport: { type: 'string', description: 'Nom du sport' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getUpcomingEvents',
      description: 'Trouver les événements sportifs et sorties à venir (date future uniquement)',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'Ville dans la MEL' },
          sport: { type: 'string', description: 'Nom du sport (optionnel)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'getOpenTournaments',
      description: 'Trouver les tournois ouverts aux inscriptions',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'Ville dans la MEL' },
          sport: { type: 'string', description: 'Nom du sport' },
        },
        required: [],
      },
    },
  },
]

export async function executeTool(name: string, args: Record<string, string>): Promise<string> {
  try {
    switch (name) {
      case 'searchInfrastructures': {
        const infras = await prisma.infrastructure.findMany({
          where: {
            ...(args.city ? { address: { contains: args.city, mode: 'insensitive' } } : {}),
            ...(args.sport ? { type: args.sport.toUpperCase() as never } : {}),
          },
          include: { sport: true },
          take: 5,
        })
        if (!infras.length) return `Aucun terrain trouvé${args.city ? ` à ${args.city}` : ''}${args.sport ? ` pour ${args.sport}` : ''}.`
        return infras.map(i =>
          `- ${i.name} (${i.type.toLowerCase()}) — ${i.address} — statut: ${i.status.toLowerCase()}`
        ).join('\n')
      }

      case 'getOpenMatches': {
        const matches = await prisma.match.findMany({
          where: {
            status: 'OPEN',
            date: { gte: new Date() },
            ...(args.city ? { city: { contains: args.city, mode: 'insensitive' } } : {}),
            ...(args.sport ? { sport: { name: { contains: args.sport, mode: 'insensitive' } } } : {}),
          },
          include: { sport: true, participants: true },
          orderBy: { date: 'asc' },
          take: 5,
        })
        if (!matches.length) return `Aucun match ouvert trouvé${args.city ? ` à ${args.city}` : ''}.`
        return matches.map(m => {
          const places = m.maxPlayers - m.participants.length
          const urgence = places === 1 ? ' ⚠️ DERNIÈRE PLACE !' : ''
          return `- ${m.title} (${m.sport.name}) — ${m.city} — ${new Date(m.date).toLocaleDateString('fr-FR')} — ${places} place(s) dispo${urgence}`
        }).join('\n')
      }

      case 'searchCoaches': {
        const coaches = await prisma.coach.findMany({
          where: {
            ...(args.city ? { city: { contains: args.city, mode: 'insensitive' } } : {}),
            ...(args.sport ? { sport: { name: { contains: args.sport, mode: 'insensitive' } } } : {}),
            lat: { not: null },
            lng: { not: null },
          },
          include: { sport: true, profile: true },
          orderBy: { rating: 'desc' },
          take: 5,
        })
        if (!coaches.length) return `Aucun coach trouvé${args.city ? ` à ${args.city}` : ''}${args.sport ? ` pour ${args.sport}` : ''}.`
        return coaches.map(c => {
          const tarif = c.hourlyRate ? `${c.hourlyRate}€/h` : 'tarif à confirmer directement avec le coach'
          const dispo = c.availabilityText ?? 'disponibilités non renseignées, contacte le coach directement'
          return `- ${c.profile.name} (${c.sport.name}) — ${c.city ?? 'ville non renseignée'} — ${tarif} — note: ${c.rating}/5 — ${dispo}`
        }).join('\n')
      }

      case 'getUpcomingEvents': {
        const events = await prisma.sportEvent.findMany({
          where: {
            date: { gte: new Date() },
            ...(args.sport ? { sport: { name: { contains: args.sport, mode: 'insensitive' } } } : {}),
          },
          include: { sport: true, infrastructure: true },
          orderBy: { date: 'asc' },
          take: 5,
        })
        if (!events.length) return `Aucun événement à venir${args.city ? ` à ${args.city}` : ''}.`
        return events.map(e =>
          `- ${e.title} (${e.sport.name}) — ${new Date(e.date).toLocaleDateString('fr-FR')} — ${e.infrastructure?.address ?? 'lieu non précisé'}`
        ).join('\n')
      }

      case 'getOpenTournaments': {
        const tournaments = await prisma.tournament.findMany({
          where: {
            status: 'OPEN',
            startDate: { gte: new Date() },
            ...(args.city ? { city: { contains: args.city, mode: 'insensitive' } } : {}),
            ...(args.sport ? { sport: { name: { contains: args.sport, mode: 'insensitive' } } } : {}),
          },
          include: { sport: true },
          orderBy: { startDate: 'asc' },
          take: 5,
        })
        if (!tournaments.length) return `Aucun tournoi ouvert${args.city ? ` à ${args.city}` : ''}${args.sport ? ` pour ${args.sport}` : ''}.`
        return tournaments.map(t =>
          `- ${t.title} (${t.sport.name}) — ${t.city} — début: ${new Date(t.startDate).toLocaleDateString('fr-FR')} — ${t.maxTeams - t.teamsCount} équipe(s) restante(s)`
        ).join('\n')
      }

      default:
        return 'Outil inconnu.'
    }
  } catch {
    return 'Erreur lors de la recherche, réessaie.'
  }
}

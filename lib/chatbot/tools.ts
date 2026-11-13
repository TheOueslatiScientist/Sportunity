import { InfraType } from '@prisma/client'

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
        const { supabaseAdmin } = await import('@/lib/supabase-admin')
        let query = supabaseAdmin
          .from('infrastructures')
          .select('name,type,address,status,"isPublic"')
          .limit(8)
        if (args.city) query = query.ilike('address', `%${args.city}%`)
        if (args.sport) query = query.eq('type', args.sport.toUpperCase() as InfraType)
        const { data: infras, error } = await query
        if (error) throw new Error(error.message)
        if (!infras?.length) return `Aucun terrain trouvé${args.city ? ` à ${args.city}` : ''}${args.sport ? ` pour ${args.sport}` : ''}.`
        return infras.map((i: any) =>
          `- ${i.name} (${i.type.toLowerCase()}) — ${i.address} — statut: ${i.status.toLowerCase()} — ${i.isPublic ? 'public' : 'privé'}`
        ).join('\n')
      }

      case 'getOpenMatches':
        return `Aucun match ouvert trouvé${args.city ? ` à ${args.city}` : ''} pour le moment.`

      case 'searchCoaches':
        return `Aucun coach disponible${args.city ? ` à ${args.city}` : ''}${args.sport ? ` pour ${args.sport}` : ''} pour le moment.`

      case 'getUpcomingEvents':
        return `Aucun événement à venir${args.city ? ` à ${args.city}` : ''} pour le moment.`

      case 'getOpenTournaments':
        return `Aucun tournoi ouvert${args.city ? ` à ${args.city}` : ''}${args.sport ? ` pour ${args.sport}` : ''} pour le moment.`

      default:
        return 'Outil inconnu.'
    }
  } catch {
    return 'Erreur lors de la recherche, réessaie.'
  }
}

import { Profile } from '@/types'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { levelLabel } from '@/lib/utils'

interface UserCardProps {
  user: Profile
}

export default function UserCard({ user }: UserCardProps) {
  return (
    <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-4 hover:shadow-card-hover transition-all duration-300">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl font-bold text-gray-400">
              {user.name[0]}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900 text-sm">{user.name}</h3>
            {user.is_coach && <Badge variant="purple">Coach</Badge>}
          </div>
          {user.city && <p className="text-xs text-gray-400">{user.city}</p>}
          {user.level && (
            <p className="text-xs text-primary-600 font-medium mt-0.5">{levelLabel(user.level)}</p>
          )}
        </div>
        <Link href={`/chat?userId=${user.user_id}`}>
          <Button size="sm" variant="secondary">
            Message
          </Button>
        </Link>
      </div>

      {user.bio && (
        <p className="text-xs text-gray-500 mt-3 line-clamp-2">{user.bio}</p>
      )}

      {user.sports && user.sports.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {user.sports.map((sport) => (
            <span
              key={sport.id}
              className="text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ backgroundColor: sport.color + '20', color: sport.color }}
            >
              {sport.icon} {sport.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  password: string
  name: string
}

export interface JwtPayload {
  userId: number
  email: string
  iat?: number
  exp?: number
}

// ─── User & Profile ──────────────────────────────────────────────────────────
export interface User {
  id: number
  email: string
  created_at: string
}

export interface Profile {
  id: number
  user_id: number
  name: string
  avatar_url?: string
  bio?: string
  level?: 'beginner' | 'intermediate' | 'advanced' | 'pro'
  location_lat?: number
  location_lng?: number
  city?: string
  is_coach: boolean
  sports?: Sport[]
  email?: string
  role?: 'user' | 'coach' | 'expert'
}

// ─── Sport ───────────────────────────────────────────────────────────────────
export interface Sport {
  id: number
  name: string
  icon: string
  color: string
}

// ─── Infrastructure ──────────────────────────────────────────────────────────
export type InfrastructureType =
  | 'football'
  | 'basketball'
  | 'tennis'
  | 'running'
  | 'gym'
  | 'swimming'
  | 'volleyball'
  | 'padel'
  | 'other'

export type InfrastructureStatus = 'available' | 'occupied' | 'maintenance'

export interface Infrastructure {
  id: number
  name: string
  type: InfrastructureType
  address: string
  lat: number
  lng: number
  is_public: boolean
  status: InfrastructureStatus
  image_url?: string
  distance?: number
  events_count?: number
}

// ─── Event ───────────────────────────────────────────────────────────────────
export interface SportEvent {
  id: number
  title: string
  sport_id: number
  sport?: Sport
  infrastructure_id?: number
  infrastructure?: Infrastructure
  creator_id: number
  creator?: Profile
  date: string
  max_participants: number
  description?: string
  level?: 'beginner' | 'intermediate' | 'advanced' | 'all'
  participants?: Profile[]
  participants_count: number
  distance?: number
}

// ─── Match ───────────────────────────────────────────────────────────────────
export type MatchStatus = 'open' | 'full' | 'cancelled' | 'completed'

export interface Match {
  id: number
  title: string
  sport_id: number
  sport?: Sport
  creator_id: number
  creator?: Profile
  date: string
  location: string
  address?: string
  city: string
  lat?: number
  lng?: number
  max_players: number
  players_count: number
  participants?: Profile[]
  status: MatchStatus
  level?: 'beginner' | 'intermediate' | 'advanced' | 'all'
  description?: string
  has_teams: boolean
  team_a?: Profile[]
  team_b?: Profile[]
  team_a_name?: string
  team_b_name?: string
  created_at: string
}

// ─── Tournament ───────────────────────────────────────────────────────────────
export type TournamentStatus = 'open' | 'in_progress' | 'completed' | 'cancelled'

export interface Tournament {
  id: number
  title: string
  sport_id: number
  sport?: Sport
  creator_id: number
  creator?: Profile
  start_date: string
  end_date?: string
  location: string
  address?: string
  city: string
  lat?: number
  lng?: number
  max_teams: number
  teams_count: number
  description?: string
  prize?: string
  status: TournamentStatus
  created_at: string
}

// ─── Competition ──────────────────────────────────────────────────────────────
export type CompetitionType = 'race' | 'tournament' | 'championship' | 'other'
export type CompetitionStatus = 'open' | 'full' | 'completed' | 'cancelled'

export interface Competition {
  id: number
  title: string
  sport_id: number
  sport?: Sport
  creator_id: number
  creator?: Profile
  date: string
  location: string
  address?: string
  city: string
  lat?: number
  lng?: number
  max_participants: number
  participants_count: number
  participants?: Profile[]
  description?: string
  type: CompetitionType
  status: CompetitionStatus
  distance_km?: number
  price_entry?: number
  created_at: string
}

// ─── Coach Session ────────────────────────────────────────────────────────────
export type SessionStatus = 'scheduled' | 'completed' | 'cancelled'

export interface CoachSession {
  id: number
  coach_id: number
  coach?: Coach
  client_id: number
  client?: Profile
  date: string
  duration_minutes: number
  location: string
  city?: string
  status: SessionStatus
  notes?: string
  price?: number
  created_at: string
}

// ─── Message ─────────────────────────────────────────────────────────────────
export interface Message {
  id: number
  sender_id: number
  receiver_id: number
  content: string
  read: boolean
  created_at: string
  sender?: Profile
}

export interface Conversation {
  user: Profile
  last_message: Message
  unread_count: number
}

// ─── Coach ───────────────────────────────────────────────────────────────────
export interface Coach {
  id: number
  user_id: number
  profile?: Profile
  sport_id: number
  sport?: Sport
  hourly_rate: number
  description?: string
  experience_years: number
  rating: number
  reviews_count: number
  certifications?: string[]
  specialties?: string[]
  city?: string
  lat?: number
  lng?: number
  languages?: string[]
  availability?: AvailabilitySlot[]
  availability_text?: string
  is_available_now: boolean
  is_certified: boolean
  is_popular: boolean
  gallery?: string[]
  intro_video_url?: string
  clients_count?: number
  sessions_count?: number
  distance?: number
}

export interface AvailabilitySlot {
  day: 'lun' | 'mar' | 'mer' | 'jeu' | 'ven' | 'sam' | 'dim'
  slots: string[]
}

// ─── Expert Post ──────────────────────────────────────────────────────────────
export type ExpertCategory = 'training' | 'recovery' | 'nutrition' | 'technique'

export interface ExpertPost {
  id: number
  author_id: number
  author?: Profile
  title: string
  content: string
  excerpt?: string
  category: ExpertCategory
  sport_id?: number
  sport?: Sport
  media?: PostMedia[]
  likes: number
  liked?: boolean
  comments_count: number
  saved?: boolean
  read_time?: number
  created_at: string
}

export interface ExpertComment {
  id: number
  expert_post_id: number
  author_id: number
  author?: Profile
  content: string
  created_at: string
}

// ─── Feed / Posts ─────────────────────────────────────────────────────────────
export type FeedItemType = 'activity' | 'event' | 'post' | 'achievement' | 'recommendation'

export interface FeedItem {
  id: number
  type: FeedItemType
  author: Profile
  created_at: string
  content?: string
  image_url?: string
  sport?: Sport
  activity_distance?: number
  activity_duration?: number
  activity_calories?: number
  event?: SportEvent
  likes: number
  liked?: boolean
  comments: number
}

// ─── Posts & Comments ────────────────────────────────────────────────────────
export interface Post {
  id: number
  author_id: number
  author?: Profile
  content: string
  image_url?: string
  media?: PostMedia[]
  sport_id?: number
  sport?: Sport
  type: FeedItemType
  likes: number
  liked?: boolean
  comments_count: number
  comments?: Comment[]
  created_at: string
}

export interface PostMedia {
  url: string
  type: 'image' | 'video'
  name?: string
}

export interface Comment {
  id: number
  post_id: number
  author_id: number
  author?: Profile
  content: string
  created_at: string
}

// ─── Friendships ──────────────────────────────────────────────────────────────
export type FriendshipStatus = 'pending' | 'accepted' | 'rejected'

export interface Friendship {
  id: number
  requester_id: number
  addressee_id: number
  status: FriendshipStatus
  created_at: string
  requester?: Profile
  addressee?: Profile
}

// ─── Bookings ────────────────────────────────────────────────────────────────
export interface Booking {
  id: number
  coach_id: number
  client_id: number
  date: string
  duration_minutes: number
  status: 'pending' | 'confirmed' | 'cancelled'
  created_at: string
}

// ─── API responses ────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

import { redirect } from 'next/navigation'

// /home now redirects to /feed (the new social feed main page)
export default function HomePage() {
  redirect('/feed')
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/ServerSideDbConnector'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/app')
  else redirect('/login')
}

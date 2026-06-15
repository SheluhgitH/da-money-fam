type SupabaseErrorLike = { message?: string; code?: string } | null | undefined

/** True when Supabase env is set but tables haven't been created yet. */
export function isMissingSupabaseTable(error: SupabaseErrorLike): boolean {
  if (!error) return false
  const msg = (error.message ?? '').toLowerCase()
  return (
    error.code === 'PGRST205' ||
    msg.includes('schema cache') ||
    msg.includes('could not find the table') ||
    (msg.includes('relation') && msg.includes('does not exist'))
  )
}

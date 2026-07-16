export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { logProductionEnvIssues } = await import('./lib/validate-env')
    logProductionEnvIssues()
  }
}

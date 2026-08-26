const PRIVACY_RE =
  /PrivacyInformation|InputImageSensitiveContentDetected|real person/i

export function mapSeedanceUserError(raw: unknown): string {
  const text = typeof raw === 'string' ? raw : raw ? JSON.stringify(raw) : ''
  if (PRIVACY_RE.test(text)) {
    return 'Seedance still flagged this still as a photoreal face. Switch to Lite, or recreate the character as Anime / Comic / Clay in Characters, then retry.'
  }
  const cleaned = text
    .replace(/\s*Request id:[\s\S]*$/i, '')
    .replace(/^The request failed because\s*/i, '')
    .trim()
  return cleaned || 'Seedance rejected the request'
}

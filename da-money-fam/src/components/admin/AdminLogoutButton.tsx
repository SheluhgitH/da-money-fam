'use client'

export default function AdminLogoutButton() {
  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    window.location.href = '/admin/login'
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="text-sm text-gray-400 hover:text-white transition-colors"
    >
      Logout
    </button>
  )
}

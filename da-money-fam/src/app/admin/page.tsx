import Link from 'next/link'
import { isAdminAuthenticated } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminDashboard from '@/components/admin/AdminDashboard'
import AdminLogoutButton from '@/components/admin/AdminLogoutButton'

export default function AdminPage() {
  if (!isAdminAuthenticated()) {
    redirect('/admin/login')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="font-serif text-4xl gold-gradient">Store Admin</h1>
          <p className="text-gray-400 text-sm mt-2">Manage songs, orders, and payment settings</p>
        </div>
        <div className="flex gap-3">
          <Link href="/" className="text-sm text-gold hover:text-white transition-colors">
            View Site
          </Link>
          <AdminLogoutButton />
        </div>
      </div>

      <AdminDashboard />
    </div>
  )
}

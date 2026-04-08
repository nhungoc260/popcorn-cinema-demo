// AdminUsers.tsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowLeft, Eye } from 'lucide-react'
import { adminApi } from '../../api'
import toast from 'react-hot-toast'
import UserDetailModal from '../../components/admin/UserDetailModal'

const ROLES = [
  { value: 'customer', label: '👤 Khách hàng', color: '#60A5FA' },
  { value: 'staff',    label: '🧑‍💼 Nhân viên',  color: '#34D399' },
  { value: 'admin',    label: '⚙️ Admin',       color: '#F43F5E' },
]

export default function AdminUsers() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [roleFilter, setRoleFilter] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, roleFilter],
    queryFn: () => adminApi.getUsers({ page, limit: 20, role: roleFilter || undefined }),
    select: d => d.data,
  })
  const result = data as any

  const { mutate: changeRole } = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminApi.updateUserRole(id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('Đã cập nhật vai trò')
    },
  })

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div
        className="border-b px-6 py-4 flex items-center justify-between"
        style={{
          background: 'var(--color-bg-2)',
          backdropFilter: 'blur(12px)',
          borderColor: 'rgba(168,85,247,0.1)',
        }}
      >
        <div className="flex items-center gap-3">
          <Link to="/admin">
            <ArrowLeft className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} />
          </Link>
          <h1 className="font-display font-bold" style={{ color: 'var(--color-text)' }}>
            👥 Người Dùng
          </h1>
        </div>
        <div className="flex gap-2">
          {['', 'customer', 'staff', 'admin'].map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: roleFilter === r ? 'rgba(168,85,247,0.15)' : 'var(--color-bg-2)',
                border: `1px solid ${roleFilter === r ? 'var(--color-primary)' : 'var(--color-glass-border)'}`,
                color: roleFilter === r ? 'var(--color-primary)' : 'var(--color-text-muted)',
              }}
            >
              {r || 'Tất cả'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => <div key={i} className="h-16 rounded-2xl skeleton" />)}
          </div>
        ) : (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-glass-border)' }}
          >
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-glass-border)' }}>
                  {['Người dùng', 'Email', 'Vai trò', 'Hành động'].map(h => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-xs font-semibold"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(result?.data || []).map((u: any, i: number) => (
                  <motion.tr
                    key={u._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    style={{ borderBottom: '1px solid var(--color-glass-border)' }}
                  >
                    {/* Tên */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden"
                          style={{
                            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                            color: 'white',
                          }}
                        >
                          {u.avatar
                            ? <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                            : u.name.charAt(0).toUpperCase()
                          }
                        </div>
                        <div>
                          <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                            {u.name}
                          </span>
                          {/* Badge khoá */}
                          {u.isActive === false && (
                            <span
                              className="ml-2 text-xs px-1.5 py-0.5 rounded"
                              style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)' }}
                            >
                              Đã khoá
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-5 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {u.email}
                    </td>

                    {/* Vai trò */}
                    <td className="px-5 py-3">
                      <span
                        className="text-xs px-2 py-1 rounded-full"
                        style={{
                          background: 'rgba(168,85,247,0.1)',
                          color: ROLES.find(r => r.value === u.role)?.color || 'var(--color-primary)',
                          border: '1px solid rgba(168,85,247,0.2)',
                        }}
                      >
                        {ROLES.find(r => r.value === u.role)?.label || u.role}
                      </span>
                    </td>

                    {/* Hành động */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {/* [MỚI] Nút xem chi tiết */}
                        <button
                          onClick={() => setSelectedUserId(u._id)}
                          className="p-1.5 rounded-lg transition-all"
                          title="Xem chi tiết"
                          style={{ color: 'var(--color-text-muted)', background: 'transparent' }}
                          onMouseEnter={e => {
                            e.currentTarget.style.color = 'var(--color-primary)'
                            e.currentTarget.style.background = 'rgba(168,85,247,0.1)'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.color = 'var(--color-text-muted)'
                            e.currentTarget.style.background = 'transparent'
                          }}
                        >
                          <Eye size={15} />
                        </button>

                        {/* Select vai trò — giữ nguyên */}
                        <select
                          value={u.role}
                          onChange={e => changeRole({ id: u._id, role: e.target.value })}
                          className="text-xs px-2 py-1 rounded-lg outline-none"
                          style={{
                            background: 'var(--color-bg-3)',
                            border: '1px solid var(--color-glass-border)',
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          <option value="customer">customer</option>
                          <option value="staff">staff</option>
                          <option value="admin">admin</option>
                        </select>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* [MỚI] Modal chi tiết user */}
      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  )
}
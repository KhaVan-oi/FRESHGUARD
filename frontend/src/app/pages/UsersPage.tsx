import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useUser } from '../hooks/useUser';
import { useArea } from '../hooks/useArea';
import { createUser, updateUserProfile, deleteUser, updateUserManagedAreas } from '../api/userApi';
import type { User, UserRole } from '../types';

export function UsersPage() {
  const { users, loading, error, refetch } = useUser();
  const { areas } = useArea();
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    role: 'Operator' as UserRole,
    managedAreaIds: [] as number[]
  });

  const handleAdd = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      fullName: '',
      role: 'Operator',
      managedAreaIds: []
    });
    setShowModal(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '', // Không hiển thị mật khẩu hiện tại
      fullName: user.fullName,
      role: user.role,
      managedAreaIds: []
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
      try {
        await deleteUser(Number(id));
        await refetch();
      } catch (err) {
        alert("Lỗi khi xóa: " + (err instanceof Error ? err.message : "Unknown error"));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingUser) {
        // Update existing user - gửi cả role
        await updateUserProfile(Number(editingUser.id), {
          full_name: formData.fullName,
          role: formData.role === 'Admin' ? 'ADMIN' : 'OPERATOR',
        });
        
        // Update managed areas nếu là OPERATOR
        if (formData.role === 'Operator') {
          await updateUserManagedAreas(Number(editingUser.id), formData.managedAreaIds);
        }
      } else {
        // Create new user
        await createUser({
          username: formData.username,
          password: formData.password,
          full_name: formData.fullName,
          role: formData.role === 'Admin' ? 'ADMIN' : 'OPERATOR',
        });
      }
      await refetch();
      setShowModal(false);
    } catch (err) {
      alert("Lỗi: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Quản lý người dùng</h1>
          <p className="text-gray-500">Quản lý tài khoản và phân quyền</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-[#2ECC71] text-white px-4 py-2 rounded-lg hover:bg-[#27AE60] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Thêm người dùng
        </button>
      </div>

      {loading && (
        <div className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-gray-100">
          <p className="text-gray-400 font-medium">Đang tải dữ liệu...</p>
        </div>
      )}

      {error && (
        <div className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-red-100">
          <p className="text-red-400 font-medium">Lỗi: {error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Tên đăng nhập</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Họ tên</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Vai trò</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Ngày tạo</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900 font-medium">{user.username}</td>
                  <td className="px-6 py-4 text-gray-900">{user.fullName}</td>
                  <td className="px-6 py-4 text-gray-600">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingUser ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tên đăng nhập</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ECC71] disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={!!editingUser}
                  required={!editingUser}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mật khẩu
                  {editingUser && <span className="text-gray-400 text-xs ml-2">(Để trống nếu không đổi)</span>}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ECC71] disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={!!editingUser}
                  required={!editingUser}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Họ tên</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ECC71]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vai trò</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ECC71] disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="Admin">Admin</option>
                  <option value="Operator">Operator</option>
                </select>
              </div>

              {formData.role === 'Operator' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Khu vực quản lý</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {areas.length === 0 ? (
                      <p className="text-gray-400 text-sm">Không có khu vực nào</p>
                    ) : (
                      areas.map(area => (
                        <div key={area.id} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`area-${area.id}`}
                            checked={formData.managedAreaIds.includes(area.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  managedAreaIds: [...formData.managedAreaIds, area.id]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  managedAreaIds: formData.managedAreaIds.filter(id => id !== area.id)
                                });
                              }
                            }}
                            className="w-4 h-4 text-[#2ECC71] rounded focus:ring-2 focus:ring-[#2ECC71]"
                          />
                          <label htmlFor={`area-${area.id}`} className="ml-3 text-sm text-gray-700 cursor-pointer">
                            {area.area_name}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#2ECC71] text-white rounded-lg hover:bg-[#27AE60] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Đang xử lý...' : editingUser ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

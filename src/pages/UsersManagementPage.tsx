import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'manager' | 'user';
  created_at: string;
  last_login: string;
};

export function UsersManagementPage() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setUsers(data ?? []);
    setLoading(false);
  }

  async function updateRole(userId: string, newRole: 'admin' | 'manager' | 'user') {
    await supabase
      .from('user_profiles')
      .update({ role: newRole })
      .eq('id', userId);
    fetchUsers();
  }

  if (!isAdmin) {
    return <div className="p-8 text-center text-red-600">غير مصرح لك بالوصول.</div>;
  }

  const roleLabel = { admin: 'أدمن', manager: 'مدير', user: 'مستخدم' };
  const roleColor = {
    admin: 'bg-purple-100 text-purple-800',
    manager: 'bg-blue-100 text-blue-800',
    user: 'bg-gray-100 text-gray-600'
  };

  return (
    <div className="p-6" dir="rtl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">إدارة المستخدمين</h2>

      {loading ? (
        <p className="text-gray-500">جارٍ التحميل...</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">الاسم</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">البريد</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">الدور</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">تاريخ التسجيل</th>
                {isAdmin && <th className="text-right px-4 py-3 font-semibold text-gray-700">الإجراء</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{user.full_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600" dir="ltr">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColor[user.role]}`}>
                      {roleLabel[user.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(user.created_at).toLocaleDateString('ar-SA')}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        onChange={e => updateRole(user.id, e.target.value as any)}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="user">مستخدم</option>
                        <option value="manager">مدير</option>
                        <option value="admin">أدمن</option>
                      </select>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

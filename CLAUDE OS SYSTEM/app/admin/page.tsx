"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { UserMenu } from "@/components/User/UserMenu";
import { listUsers, createUser, updateUserRole } from "@/lib/auth";
import { Users, Plus, Edit2, Check, X } from "lucide-react";
import { AuthUser } from "@/lib/auth";

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<"admin" | "user">("user");

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    role: "user" as "admin" | "user",
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const data = await listUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUser(formData.email, formData.username, formData.role as "admin" | "user");
      setFormData({ email: "", username: "", role: "user" });
      setShowCreateForm(false);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    }
  };

  const handleUpdateRole = async (userId: string, newRole: "admin" | "user") => {
    try {
      await updateUserRole(userId, newRole);
      setEditingUserId(null);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    }
  };

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Header */}
        <div className="border-b border-slate-700/50 bg-slate-800/50 backdrop-blur sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-400" />
              <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
            </div>
            <UserMenu />
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg flex items-start gap-3">
              <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-200 font-medium">Error</p>
                <p className="text-red-200/80 text-sm">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Create User Form */}
          {showCreateForm && (
            <div className="mb-8 p-6 bg-slate-800/50 border border-slate-700/50 rounded-lg">
              <h2 className="text-xl font-bold text-white mb-4">Create New User</h2>
              <form onSubmit={handleCreateUser} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        role: e.target.value as "admin" | "user",
                      })
                    }
                    className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                  >
                    Create User
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {!showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="mb-8 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition"
            >
              <Plus className="w-5 h-5" />
              Create New User
            </button>
          )}

          {/* Users Table */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden">
            <div className="p-6 border-b border-slate-700/50">
              <h2 className="text-xl font-bold text-white">
                Users ({users.length})
              </h2>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-slate-400">
                <div className="inline-block w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No users found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-t border-slate-700/50 bg-slate-700/20">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">
                        Username
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr
                        key={u.id}
                        className="border-t border-slate-700/50 hover:bg-slate-700/20 transition"
                      >
                        <td className="px-6 py-3 text-slate-300">{u.username}</td>
                        <td className="px-6 py-3 text-slate-400">{u.email}</td>
                        <td className="px-6 py-3">
                          {editingUserId === u.id ? (
                            <select
                              value={editingRole}
                              onChange={(e) =>
                                setEditingRole(e.target.value as "admin" | "user")
                              }
                              className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                          ) : (
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-medium ${
                                u.role === "admin"
                                  ? "bg-purple-500/20 text-purple-200"
                                  : "bg-blue-500/20 text-blue-200"
                              }`}
                            >
                              {u.role}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`text-sm ${
                              u.is_online
                                ? "text-green-400"
                                : "text-slate-500"
                            }`}
                          >
                            {u.is_online ? "🟢 Online" : "⚪ Offline"}
                          </span>
                        </td>
                        <td className="px-6 py-3 flex items-center gap-2">
                          {editingUserId === u.id ? (
                            <>
                              <button
                                onClick={() =>
                                  handleUpdateRole(u.id, editingRole)
                                }
                                className="p-1 text-green-400 hover:bg-green-500/20 rounded transition"
                                title="Save"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingUserId(null)}
                                className="p-1 text-red-400 hover:bg-red-500/20 rounded transition"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingUserId(u.id);
                                setEditingRole(u.role);
                              }}
                              className="p-1 text-blue-400 hover:bg-blue-500/20 rounded transition"
                              title="Edit role"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="mt-8 p-6 bg-slate-700/30 border border-slate-700 rounded-lg">
            <h3 className="font-semibold text-white mb-3">Admin Features</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>✓ Create and manage users</li>
              <li>✓ Change user roles between Admin and User</li>
              <li>✓ View all user activity logs</li>
              <li>✓ See real-time online status</li>
              <li>✓ Manage permissions and access control</li>
            </ul>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

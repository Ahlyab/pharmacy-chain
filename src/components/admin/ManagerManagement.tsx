import React, { useState, useEffect } from 'react';
import { VITE_BASE_URL } from '../../data';
import { Plus, Edit, Trash2, Mail, Phone, Building2 } from 'lucide-react';

interface Manager {
  id: string;
  name: string;
  email: string;
  phone: string;
  branch: string;
  status: 'Active' | 'Inactive';
}

const ManagerManagement: React.FC = () => {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

  // Fetch managers and branches from backend on mount
  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const response = await fetch(`${VITE_BASE_URL}/manager`);
        if (!response.ok) throw new Error('Failed to fetch managers');
        const data = await response.json();
        setManagers(data.map((m: any) => ({
          id: m._id,
          name: m.name,
          email: m.email,
          phone: m.phone,
          branch: m.branch,
          status: m.status
        })));
      } catch (err) {
        // Optionally show error
      }
    };
    const fetchBranches = async () => {
      try {
        const response = await fetch(`${VITE_BASE_URL}/branch`);
        if (!response.ok) throw new Error('Failed to fetch branches');
        const data = await response.json();
        setBranches(data.map((b: any) => ({ id: b._id, name: b.name })));
      } catch (err) {
        // Optionally show error
      }
    };
    fetchManagers();
    fetchBranches();
  }, []);

  const [showModal, setShowModal] = useState(false);
  const [editingManager, setEditingManager] = useState<Manager | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    branch: '',
    status: 'Active' as 'Active' | 'Inactive'
  });
  const [managerSearch, setManagerSearch] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingManager) {
        // ...existing code...
      } else {
        // Find selected branch object
        const selectedBranch = branches.find(b => b.id === formData.branch);
        if (!selectedBranch) throw new Error('Invalid branch selected');
        // Prepare payload: branch name for Manager, branch id for User
        const payload = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          branch: selectedBranch.name,
          branchId: selectedBranch.id,
          status: formData.status
        };
        // Add manager to /manager endpoint
        const response = await fetch(`${VITE_BASE_URL}/manager`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add manager');
        }
        const newManager = await response.json();
        setManagers([...managers, {
          id: newManager._id,
          name: newManager.name,
          email: newManager.email,
          phone: newManager.phone,
          branch: newManager.branch,
          status: newManager.status
        }]);

        // Register credentials for login (add to /user endpoint)
        const userPayload = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          branchId: selectedBranch.id,
          role: 'manager'
        };
        const userResponse = await fetch(`${VITE_BASE_URL}/user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userPayload)
        });
        if (!userResponse.ok) {
          const errorData = await userResponse.json();
          throw new Error(errorData.error || 'Failed to register manager credentials');
        }

        // Show SweetAlert with credentials
        const Swal = (await import('sweetalert2')).default;
        await Swal.fire({
          title: 'Manager Added!',
          html: `<b>Email:</b> ${formData.email}<br/><b>Password:</b> ${formData.password}`,
          icon: 'success',
          confirmButtonText: 'OK'
        });
      }
      setShowModal(false);
      setEditingManager(null);
      setFormData({ name: '', email: '', password: '', phone: '', branch: '', status: 'Active' });
    } catch (err) {
      const message = (err instanceof Error) ? err.message : String(err);
      alert('Error adding/updating manager: ' + message);
    }
  };

  const handleEdit = (manager: Manager) => {
    setEditingManager(manager);
    setFormData({
      name: manager.name,
      email: manager.email,
      password: '', // Do not prefill password for security
      phone: manager.phone,
      branch: manager.branch,
      status: manager.status
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const Swal = (await import('sweetalert2')).default;
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to delete this manager?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });
    if (result.isConfirmed) {
      try {
        const response = await fetch(`${VITE_BASE_URL}/manager/${id}`, {
          method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete manager');
        setManagers(managers.filter(manager => manager.id !== id));
        Swal.fire('Deleted!', 'Manager has been deleted.', 'success');
      } catch (err) {
        Swal.fire('Error', 'Could not delete manager.', 'error');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manager Management</h2>
          <p className="text-gray-600">Manage branch managers</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Manager
        </button>
      </div>

      {/* Manager Search Filter */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search manager by name, email, branch..."
          value={managerSearch}
          onChange={e => setManagerSearch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Managers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Manager
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {managers
                .filter(manager => {
                  const q = managerSearch.toLowerCase();
                  return (
                    manager.name.toLowerCase().includes(q) ||
                    manager.email.toLowerCase().includes(q) ||
                    manager.branch.toLowerCase().includes(q)
                  );
                })
                .map((manager) => (
                  <tr key={manager.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{manager.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <Mail className="h-4 w-4 mr-1" />
                        {manager.email}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <Phone className="h-4 w-4 mr-1" />
                        {manager.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <Building2 className="h-4 w-4 mr-1" />
                        {manager.branch}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        manager.status === 'Active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {manager.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(manager)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(manager.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingManager ? 'Edit Manager' : 'Add New Manager'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {/* Password field only for adding new manager */}
              {!editingManager && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch
                </label>
                <select
                  required
                  value={formData.branch}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingManager(null);
                    setFormData({ name: '', email: '', password: '', phone: '', branch: '', status: 'Active' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingManager ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerManagement;
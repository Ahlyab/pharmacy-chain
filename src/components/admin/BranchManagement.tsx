import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { Plus, Edit, Trash2, MapPin, Phone, User } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  manager: string;
  status: 'Active' | 'Inactive';
}


import { VITE_BASE_URL } from '../../data';

const BranchManagement: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);

  // Fetch branches from backend on mount
  React.useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await fetch(`${VITE_BASE_URL}/branch`);
        if (!response.ok) throw new Error('Failed to fetch branches');
        const data = await response.json();
        setBranches(data.map((b: any) => ({
          id: b._id,
          name: b.name,
          address: b.address,
          phone: b.phone,
          manager: b.manager,
          status: b.status
        })));
      } catch (err) {
        // Optionally show error
      }
    };
    fetchBranches();
  }, []);

  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    manager: '',
    status: 'Active' as 'Active' | 'Inactive'
  });
  const [branchSearch, setBranchSearch] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBranch) {
        // Update branch in backend
        const response = await fetch(`${VITE_BASE_URL}/branch/${editingBranch.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!response.ok) throw new Error('Failed to update branch');
        const updatedBranch = await response.json();
        setBranches(branches.map(branch => 
          branch.id === editingBranch.id 
            ? {
                id: updatedBranch._id,
                name: updatedBranch.name,
                address: updatedBranch.address,
                phone: updatedBranch.phone,
                manager: updatedBranch.manager,
                status: updatedBranch.status
              }
            : branch
        ));
      } else {
        // Add branch to backend
        const response = await fetch(`${VITE_BASE_URL}/branch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!response.ok) throw new Error('Failed to add branch');
        const newBranch = await response.json();
        setBranches([...branches, {
          id: newBranch._id,
          name: newBranch.name,
          address: newBranch.address,
          phone: newBranch.phone,
          manager: newBranch.manager,
          status: newBranch.status
        }]);
      }
      setShowModal(false);
      setEditingBranch(null);
      setFormData({ name: '', address: '', phone: '', manager: '', status: 'Active' });
    } catch (err) {
      alert('Error adding/updating branch: ' + (err as Error).message);
    }
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      manager: branch.manager,
      status: branch.status
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to delete this branch?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });
    if (result.isConfirmed) {
      try {
        const response = await fetch(`${VITE_BASE_URL}/branch/${id}`, {
          method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete branch');
        setBranches(branches.filter(branch => branch.id !== id));
        Swal.fire('Deleted!', 'Branch has been deleted.', 'success');
      } catch (err) {
        Swal.fire('Error', 'Could not delete branch.', 'error');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Branch Management</h2>
          <p className="text-gray-600">Manage your pharmacy branches</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Branch
        </button>
      </div>

      {/* Branch Search Filter */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search branch by name, address, manager..."
          value={branchSearch}
          onChange={e => setBranchSearch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches
          .filter(branch => {
            const q = branchSearch.toLowerCase();
            return (
              branch.name.toLowerCase().includes(q) ||
              branch.address.toLowerCase().includes(q) ||
              branch.manager.toLowerCase().includes(q)
            );
          })
          .map((branch) => (
            <div key={branch.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{branch.name}</h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  branch.status === 'Active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {branch.status}
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mr-2" />
                  {branch.address}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  {branch.phone}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <User className="h-4 w-4 mr-2" />
                  {branch.manager}
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(branch)}
                  className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-md hover:bg-blue-100 flex items-center justify-center"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(branch.id)}
                  className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded-md hover:bg-red-100 flex items-center justify-center"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingBranch ? 'Edit Branch' : 'Add New Branch'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch Name
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
                  Address
                </label>
                <textarea
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              
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
                  Manager
                </label>
                <input
                  type="text"
                  required
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                    setEditingBranch(null);
                    setFormData({ name: '', address: '', phone: '', manager: '', status: 'Active' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingBranch ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchManagement;
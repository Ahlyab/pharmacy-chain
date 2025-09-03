import React, { useState, useEffect } from "react";
import { apiEndpoints } from "../../utils/api";
import Swal from "sweetalert2";
import { Plus, Edit, Trash2, Mail, Phone, Building2, Shield, UserCheck } from "lucide-react";

interface Manager {
  id: string;
  name: string;
  email: string;
  phone: string;
  branch: string; // display name
  status: "Active" | "Inactive";
  role: "Manager" | "Sale Assistant";
}

const ManagerManagement: React.FC = () => {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingManager, setEditingManager] = useState<Manager | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    branch: "",
    status: "Active" as "Active" | "Inactive",
    role: "Manager" as "Manager" | "Sale Assistant",
  });
  const [managerSearch, setManagerSearch] = useState("");
  const [sortColumn, setSortColumn] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Sorting handler
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Function to generate a random password
  const generatePassword = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password });
  };

  // Function to copy credentials to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      return true;
    }
  };

  // Function to check password strength
  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, label: "", color: "" };

    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const labels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
    const colors = [
      "text-red-500",
      "text-orange-500",
      "text-yellow-500",
      "text-blue-500",
      "text-green-500",
    ];

    return {
      score: Math.min(score, 4),
      label: labels[Math.min(score, 4)],
      color: colors[Math.min(score, 4)],
    };
  };

  // Function to show current password info
  const showCurrentPasswordInfo = async () => {
    const Swal = (await import("sweetalert2")).default;
    Swal.fire({
      title: "Current Password",
      text: "The current password is stored securely and cannot be retrieved. Enter a new password above to change it.",
      icon: "info",
      confirmButtonText: "OK",
    });
  };

  // Function to check for unsaved changes
  const hasUnsavedChanges = () => {
    if (editingManager) {
      const selectedBranchName =
        branches.find((b) => b.id === formData.branch)?.name || "";
      return (
        formData.name !== editingManager.name ||
        formData.email !== editingManager.email ||
        formData.phone !== editingManager.phone ||
        selectedBranchName !== editingManager.branch ||
        formData.status !== editingManager.status ||
        formData.password !== ""
      );
    }
    return (
      formData.name !== "" ||
      formData.email !== "" ||
      formData.password !== "" ||
      formData.phone !== "" ||
      formData.branch !== "" ||
      formData.status !== "Active"
    );
  };

  // Function to close modal with confirmation if there are unsaved changes
  const closeModal = async () => {
    if (hasUnsavedChanges()) {
      const Swal = (await import("sweetalert2")).default;
      const result = await Swal.fire({
        title: "Unsaved Changes",
        text: "You have unsaved changes. Are you sure you want to close?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, close",
        cancelButtonText: "Cancel",
      });

      if (!result.isConfirmed) {
        return;
      }
    }

    setShowModal(false);
    setEditingManager(null);
    setShowPassword(false);
    setFormData({
      name: "",
      email: "",
      password: "",
      phone: "",
      branch: "",
      status: "Active",
      role: "Manager",
    });
  };

  // Fetch managers and branches from backend on mount
  useEffect(() => {
    const fetchManagers = async () => {
      try {
        console.log("Fetching managers using apiEndpoints");
        const data = await apiEndpoints.getManagers();
        console.log("Raw manager data:", data);
        
        if (!Array.isArray(data)) {
          console.error("Manager data is not an array:", typeof data, data);
          setError("Manager data is not in expected format");
          return;
        }
        
        const mappedManagers = data.map((m: any) => ({
          id: m._id || m.id,
          name: m.name || "Unknown",
          email: m.email || "No email",
          phone: m.phone || "No phone",
          branch: m.branch?.name || m.branch || "No branch",
          status: m.status || "Active",
          role: m.role || "Manager",
        }));
        
        console.log("Mapped managers:", mappedManagers);
        setManagers(mappedManagers);
        setError(null);
      } catch (err) {
        console.error("Error fetching managers:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch managers";
        setError(errorMessage);
      }
    };
    
    const fetchBranches = async () => {
      try {
        console.log("Fetching branches using apiEndpoints");
        const data = await apiEndpoints.getBranches();
        console.log("Raw branch data:", data);
        
        if (!Array.isArray(data)) {
          console.error("Branch data is not an array:", typeof data, data);
          setError("Branch data is not in expected format");
          return;
        }
        
        const mappedBranches = data.map((b: any) => ({ 
          id: b._id || b.id, 
          name: b.name || "Unknown" 
        }));
        
        console.log("Mapped branches:", mappedBranches);
        setBranches(mappedBranches);
      } catch (err) {
        console.error("Error fetching branches:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch branches";
        setError(errorMessage);
      }
    };
    
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await Promise.all([fetchManagers(), fetchBranches()]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showModal) {
        closeModal();
      }
    };

    if (showModal) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [showModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password for new managers
    if (!editingManager && formData.password) {
      const Swal = (await import("sweetalert2")).default;
      const strength = getPasswordStrength(formData.password);
      if (strength.score < 3) {
        await Swal.fire({
          title: "Weak Password",
          text: "Please choose a stronger password. It should be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.",
          icon: "warning",
          confirmButtonText: "OK",
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Import Swal once for the entire function
      const Swal = (await import("sweetalert2")).default;

      if (editingManager) {
        // Update existing manager
        const selectedBranch = branches.find((b) => b.id === formData.branch);
        if (!selectedBranch) throw new Error("Invalid branch selected");

        const updatePayload: any = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          branchId: selectedBranch.id,
          status: formData.status,
          role: formData.role,
        };

        // Show confirmation dialog with changes summary
        const changes = [] as string[];
        if (formData.name !== editingManager.name)
          changes.push(`Name: ${editingManager.name} → ${formData.name}`);
        if (formData.email !== editingManager.email)
          changes.push(`Email: ${editingManager.email} → ${formData.email}`);
        if (formData.phone !== editingManager.phone)
          changes.push(`Phone: ${editingManager.phone} → ${formData.phone}`);
        if (selectedBranch.name !== editingManager.branch)
          changes.push(
            `Branch: ${editingManager.branch} → ${selectedBranch.name}`
          );
        if (formData.status !== editingManager.status)
          changes.push(`Status: ${editingManager.status} → ${formData.status}`);
        if (formData.role !== editingManager.role)
          changes.push(`Role: ${editingManager.role} → ${formData.role}`);
        if (formData.password) changes.push("Password: Will be updated");

        const result = await Swal.fire({
          title: "Confirm Changes",
          html: `
            <div class="text-left">
              <p class="mb-3"><strong>Are you sure you want to update this user?</strong></p>
              ${
                changes.length > 0
                  ? `
                <div class="bg-gray-100 p-3 rounded mb-3">
                  <p class="font-medium mb-2">Changes to be made:</p>
                  <ul class="text-sm space-y-1">
                    ${changes.map((change) => `<li>• ${change}</li>`).join("")}
                  </ul>
                </div>
              `
                  : '<p class="text-gray-600">No changes detected.</p>'
              }
            </div>
          `,
          icon: "question",
          showCancelButton: true,
          confirmButtonColor: "#3085d6",
          cancelButtonColor: "#d33",
          confirmButtonText: "Yes, update user!",
          cancelButtonText: "Cancel",
        });

        if (!result.isConfirmed) {
          return;
        }

        // Only include password if it's provided (for updates)
        if (formData.password) {
          // Ask for confirmation before updating password
          const passwordResult = await Swal.fire({
            title: "Update Password?",
            text: "Are you sure you want to update the user's password?",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, update password!",
            cancelButtonText: "Cancel",
          });

          if (passwordResult.isConfirmed) {
            updatePayload.password = formData.password;
          }
        }

        const updatedManager = await apiEndpoints.updateManager(editingManager.id, updatePayload);
        setManagers(
          managers.map((m) =>
            m.id === editingManager.id
                              ? {
                  id: updatedManager._id,
                  name: updatedManager.name,
                  email: updatedManager.email,
                  phone: updatedManager.phone,
                  branch: updatedManager.branch?.name || updatedManager.branch,
                  status: updatedManager.status,
                  role: updatedManager.role || formData.role,
                }
              : m
          )
        );

        // Show success message
        if (formData.password) {
          // Show new credentials if password was updated
          await Swal.fire({
            title: "User Updated!",
            html: `
              <div class="text-left">
                <p class="mb-3"><strong>User and password updated successfully!</strong></p>
                <p class="mb-2"><strong>New login credentials:</strong></p>
                <div class="bg-gray-100 p-3 rounded mb-3">
                  <div class="flex items-center justify-between mb-2">
                    <span><strong>Email:</strong> ${formData.email}</span>
                    <button id="copyEmail" class="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">Copy</button>
                  </div>
                  <div class="flex items-center justify-between mb-2">
                    <span><strong>New Password:</strong> ${formData.password}</span>
                    <button id="copyPassword" class="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">Copy</button>
                  </div>
                </div>
                <p class="text-sm text-gray-600">Please provide the new password to the user.</p>
              </div>
            `,
            icon: "success",
            confirmButtonText: "OK",
            width: "500px",
            didOpen: () => {
              // Add click handlers for copy buttons
              document
                .getElementById("copyEmail")
                ?.addEventListener("click", () => {
                  copyToClipboard(formData.email);
                  const btn = document.getElementById("copyEmail");
                  if (btn) {
                    btn.textContent = "Copied!";
                    btn.classList.add("bg-green-500");
                    setTimeout(() => {
                      btn.textContent = "Copy";
                      btn.classList.remove("bg-green-500");
                    }, 2000);
                  }
                });

              document
                .getElementById("copyPassword")
                ?.addEventListener("click", () => {
                  copyToClipboard(formData.password);
                  const btn = document.getElementById("copyPassword");
                  if (btn) {
                    btn.textContent = "Copied!";
                    btn.classList.add("bg-green-500");
                    setTimeout(() => {
                      btn.textContent = "Copy";
                      btn.classList.remove("bg-green-500");
                    }, 2000);
                  }
                });
            },
          });
        } else {
          // Show simple success message if no password change
          await Swal.fire({
            title: "User Updated!",
            text: "User updated successfully!",
            icon: "success",
            confirmButtonText: "OK",
          });
        }
      } else {
        // Find selected branch object
        const selectedBranch = branches.find((b) => b.id === formData.branch);
        if (!selectedBranch) throw new Error("Invalid branch selected");
        // Prepare payload: branch name for Manager, branch id for User
        const payload = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          branchId: selectedBranch.id,
          status: formData.status,
          role: formData.role,
        };
        // Add manager to /manager endpoint
        const newManager = await apiEndpoints.createManager(payload);
        setManagers([
          ...managers,
          {
            id: newManager._id,
            name: newManager.name,
            email: newManager.email,
            phone: newManager.phone,
            branch: newManager.branch?.name || newManager.branch,
            status: newManager.status,
            role: newManager.role || formData.role,
          },
        ]);

        // Register credentials for login (add to /user endpoint)
        // const userPayload = {
        //   name: formData.name,
        //   email: formData.email,
        //   password: formData.password,
        //   branchId: selectedBranch.id,
        //   role: "manager",
        // };
        // const userResponse = await fetch(`${VITE_BASE_URL}/user`, {
        //   method: "POST",
        //   headers: { "Content-Type": "application/json" },
        //   body: JSON.stringify(userPayload),
        // });
        // if (!userResponse.ok) {
        //   const errorData = await userResponse.json();
        //   throw new Error(
        //     errorData.error || "Failed to register manager credentials"
        //   );
        // }

        // Show SweetAlert with credentials
        await Swal.fire({
          title: "User Added Successfully!",
          html: `
            <div class="text-left">
              <p class="mb-3"><strong>User has been created and can now login with:</strong></p>
              <div class="bg-gray-100 p-3 rounded mb-3">
                <div class="flex items-center justify-between mb-2">
                  <span><strong>Email:</strong> ${formData.email}</span>
                  <button id="copyEmail" class="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">Copy</button>
                </div>
                <div class="flex items-center justify-between">
                  <span><strong>Password:</strong> ${formData.password}</span>
                  <button id="copyPassword" class="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">Copy</button>
                </div>
              </div>
                <p class="text-sm text-gray-600">Please provide these credentials to the user.</p>
            </div>
          `,
          icon: "success",
          confirmButtonText: "OK",
          width: "500px",
          didOpen: () => {
            // Add click handlers for copy buttons
            document
              .getElementById("copyEmail")
              ?.addEventListener("click", () => {
                copyToClipboard(formData.email);
                const btn = document.getElementById("copyEmail");
                if (btn) {
                  btn.textContent = "Copied!";
                  btn.classList.add("bg-green-500");
                  setTimeout(() => {
                    btn.textContent = "Copy";
                    btn.classList.remove("bg-green-500");
                  }, 2000);
                }
              });

            document
              .getElementById("copyPassword")
              ?.addEventListener("click", () => {
                copyToClipboard(formData.password);
                const btn = document.getElementById("copyPassword");
                if (btn) {
                  btn.textContent = "Copied!";
                  btn.classList.add("bg-green-500");
                  setTimeout(() => {
                    btn.textContent = "Copy";
                    btn.classList.remove("bg-green-500");
                  }, 2000);
                }
              });
          },
        });
      }
      setShowModal(false);
      setEditingManager(null);
      setShowPassword(false);
      setFormData({
        name: "",
        email: "",
        password: "",
        phone: "",
        branch: "",
        status: "Active",
        role: "Manager",
      });

      // Show success toast
      Swal.fire({
        title: "Success!",
        text: editingManager
          ? "User updated successfully!"
          : "User created successfully!",
        icon: "success",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Swal.fire({
        title: 'Error',
        text: 'Error adding/updating user: ' + message,
        icon: 'error',
        confirmButtonText: 'OK'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (manager: Manager) => {
    setEditingManager(manager);
    setFormData({
      name: manager.name,
      email: manager.email,
      password: "", // Do not prefill password for security
      phone: manager.phone,
      // set branch to the matching branch id so select shows correct option
      branch: branches.find((b) => b.name === manager.branch)?.id || "",
      status: manager.status,
      role: manager.role,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const Swal = (await import("sweetalert2")).default;
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Do you want to delete this user?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });
    if (result.isConfirmed) {
      try {
        await apiEndpoints.deleteManager(id);
        setManagers(managers.filter((manager) => manager.id !== id));
        Swal.fire("Deleted!", "User has been deleted.", "success");
      } catch (err) {
        Swal.fire("Error", "Could not delete user.", "error");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            User Management & Permissions
          </h2>
          <p className="text-gray-600">Manage users and their permissions</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </button>
      </div>

      {/* Loading and Error States */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading users and permissions...</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 text-red-800 underline hover:text-red-900"
                >
                  Click here to retry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      

      {/* Manager Search Filter */}
      {!isLoading && !error && (
        <>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search user by name, email, branch..."
              value={managerSearch}
              onChange={(e) => setManagerSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Managers Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("name")}
                >
                  User {sortColumn === "name" && (sortDirection === "asc" ? "▲" : "▼")}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("email")}
                >
                  Contact {sortColumn === "email" && (sortDirection === "asc" ? "▲" : "▼")}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("branch")}
                >
                  Branch {sortColumn === "branch" && (sortDirection === "asc" ? "▲" : "▼")}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("status")}
                >
                  Status {sortColumn === "status" && (sortDirection === "asc" ? "▲" : "▼")}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("role")}
                >
                  Role {sortColumn === "role" && (sortDirection === "asc" ? "▲" : "▼")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {managers
                .filter((manager) => {
                  const q = managerSearch.toLowerCase();
                  return (
                    manager.name.toLowerCase().includes(q) ||
                    manager.email.toLowerCase().includes(q) ||
                    manager.branch.toLowerCase().includes(q) ||
                    manager.role.toLowerCase().includes(q)
                  );
                })
                .sort((a, b) => {
                  let valA: any, valB: any;
                  
                  switch (sortColumn) {
                    case "name":
                      valA = a.name.toLowerCase();
                      valB = b.name.toLowerCase();
                      break;
                    case "email":
                      valA = a.email.toLowerCase();
                      valB = b.email.toLowerCase();
                      break;
                    case "branch":
                      valA = a.branch.toLowerCase();
                      valB = b.branch.toLowerCase();
                      break;
                    case "status":
                      valA = a.status;
                      valB = b.status;
                      break;
                    case "role":
                      valA = a.role;
                      valB = b.role;
                      break;
                    default:
                      valA = a.name.toLowerCase();
                      valB = b.name.toLowerCase();
                  }
                  
                  if (valA < valB) return sortDirection === "asc" ? -1 : 1;
                  if (valA > valB) return sortDirection === "asc" ? 1 : -1;
                  return 0;
                })
                .map((manager) => (
                  <tr key={manager.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {manager.name}
                      </div>
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
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          manager.status === "Active"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {manager.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          manager.role === "Manager"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {manager.role === "Manager" ? (
                          <Shield className="inline h-3 w-3 mr-1" />
                        ) : (
                          <UserCheck className="inline h-3 w-3 mr-1" />
                        )}
                        {manager.role}
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
          
          {/* No managers message */}
                        {managers.filter((manager) => {
                const q = managerSearch.toLowerCase();
                return (
                  manager.name.toLowerCase().includes(q) ||
                  manager.email.toLowerCase().includes(q) ||
                  manager.branch.toLowerCase().includes(q) ||
                  manager.role.toLowerCase().includes(q)
                );
              }).length === 0 && (
            <div className="text-center py-8">
              {managers.length === 0 ? (
                <div>
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating a new user.</p>
                </div>
              ) : (
                <div>
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No users match your search</h3>
                  <p className="mt-1 text-sm text-gray-500">Try adjusting your search terms.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
        </>
      )}

             {/* Modal */}
       {showModal && (
         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingManager ? "Edit User" : "Add New User"}
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
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
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
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {/* Password field for adding new manager or updating existing one */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editingManager ? "Password (Optional)" : "Password"}
                </label>
                <div className="flex items-center">
                  <input
                    type={showPassword ? "text" : "password"}
                    required={!editingManager}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {!editingManager && (
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="ml-2 px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                      Generate
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="ml-2 px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {editingManager && (
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to keep current password.
                  </p>
                )}
                {editingManager && (
                  <button
                    type="button"
                    onClick={showCurrentPasswordInfo}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Current Password Info
                  </button>
                )}
                {/* Password strength indicator */}
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-600">Strength:</span>
                      <span
                        className={`text-xs font-medium ${
                          getPasswordStrength(formData.password).color
                        }`}
                      >
                        {getPasswordStrength(formData.password).label}
                      </span>
                    </div>
                    <div className="flex space-x-1 mt-1">
                      {[0, 1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1 w-8 rounded ${
                            level <=
                            getPasswordStrength(formData.password).score
                              ? getPasswordStrength(
                                  formData.password
                                ).color.replace("text-", "bg-")
                              : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    {editingManager &&
                      getPasswordStrength(formData.password).score < 3 &&
                      formData.password && (
                        <p className="text-xs text-orange-600 mt-1">
                          ⚠️ Weak password. Consider using a stronger one.
                        </p>
                      )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
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
                  onChange={(e) =>
                    setFormData({ ...formData, branch: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as "Active" | "Inactive",
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as "Manager" | "Sale Assistant",
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Manager">Manager</option>
                  <option value="Sale Assistant">Sale Assistant</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  <Shield className="inline h-3 w-3 mr-1" />
                  Manager: Full access to all features
                  <br />
                  <UserCheck className="inline h-3 w-3 mr-1" />
                  Sale Assistant: Access to all features except inventory management
                </p>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Processing..."
                    : editingManager
                    ? "Update"
                    : "Create"}
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

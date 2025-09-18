import React, { useState, useEffect } from "react";
import { apiEndpoints } from "../../utils/api";
import { Package, AlertTriangle, TrendingUp, Search } from "lucide-react";

interface Branch {
  id: string;
  name: string;
}

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  manufacturer?: string;
  branch: Branch;
  stock: number;
  minStock: number;
  price: number;
  status: "In Stock" | "Low Stock" | "Out of Stock";
}

const InventoryOverview: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [sortColumn, setSortColumn] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sorting handler
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  useEffect(() => {
    const fetchInventory = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiEndpoints.getInventory();
        // Ensure each item has a status property
        const inventoryWithStatus = (data.inventory || data).map(
          (item: any) => ({
            ...item,
            branch: item.branchId,
            manufacturer: item.manufacturer,
            status:
              item.stock === 0
                ? "Out of Stock"
                : item.stock <= item.minStock
                ? "Low Stock"
                : "In Stock",
          })
        );
        setInventory(inventoryWithStatus);
      } catch (err: any) {
        setError(err.message || "Error fetching inventory");
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  // Dynamically get branches from inventory
  const branches = [
    "All",
    ...Array.from(
      new Set(
        inventory.map((item) =>
          item.branch && typeof item.branch === "object" && item.branch.name
            ? item.branch.name
            : typeof item.branch === "string"
            ? item.branch
            : "Unknown"
        )
      )
    ),
  ];
  const statuses = ["All", "In Stock", "Low Stock", "Out of Stock"];

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.manufacturer && item.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()));
    const branchName = item.branch && typeof item.branch === "object" && item.branch.name
      ? item.branch.name
      : typeof item.branch === "string"
      ? item.branch
      : "Unknown";
    const matchesBranch = selectedBranch === "All" || branchName === selectedBranch;
    const matchesStatus =
      selectedStatus === "All" || item.status === selectedStatus;

    return matchesSearch && matchesBranch && matchesStatus;
  });

  // Sort filtered inventory
  const sortedInventory = React.useMemo(() => {
    const sorted = [...filteredInventory];
    sorted.sort((a, b) => {
      let valA: any, valB: any;
      
      switch (sortColumn) {
        case "name":
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case "branch":
          valA = (a.branch && typeof a.branch === "object" && a.branch.name ? a.branch.name : "").toLowerCase();
          valB = (b.branch && typeof b.branch === "object" && b.branch.name ? b.branch.name : "").toLowerCase();
          break;
        case "stock":
          valA = a.stock;
          valB = b.stock;
          break;
        case "price":
          valA = a.price;
          valB = b.price;
          break;
        case "status":
          valA = a.status;
          valB = b.status;
          break;
        default:
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
      }
      
      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredInventory, sortColumn, sortDirection]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "In Stock":
        return "bg-green-100 text-green-800";
      case "Low Stock":
        return "bg-yellow-100 text-yellow-800";
      case "Out of Stock":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const stats = [
    {
      name: "Total Products",
      value: inventory.length.toString(),
      icon: Package,
      color: "bg-blue-500",
    },
    {
      name: "Low Stock Items",
      value: inventory
        .filter((item) => item.status === "Low Stock")
        .length.toString(),
      icon: AlertTriangle,
      color: "bg-yellow-500",
    },
    {
      name: "Out of Stock",
      value: inventory
        .filter((item) => item.status === "Out of Stock")
        .length.toString(),
      icon: TrendingUp,
      color: "bg-red-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Inventory Overview</h2>
        <p className="text-gray-600">Monitor inventory across all branches</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    {stat.name}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {branches.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 text-center text-gray-500">
              Loading inventory...
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-500">{error}</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("name")}
                  >
                    Product | Manufacturer {sortColumn === "name" && (sortDirection === "asc" ? "▲" : "▼")}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("branch")}
                  >
                    Branch {sortColumn === "branch" && (sortDirection === "asc" ? "▲" : "▼")}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("stock")}
                  >
                    Stock {sortColumn === "stock" && (sortDirection === "asc" ? "▲" : "▼")}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("price")}
                  >
                    Price {sortColumn === "price" && (sortDirection === "asc" ? "▲" : "▼")}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort("status")}
                  >
                    Status {sortColumn === "status" && (sortDirection === "asc" ? "▲" : "▼")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {item.name}
                        </div>
                        {item.manufacturer && (
                          <div className="text-sm text-gray-600">
                            {item.manufacturer}
                          </div>
                        )}
                        <div className="text-sm text-gray-500">
                          {item.category}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.branch && typeof item.branch === "object" && item.branch.name
                        ? item.branch.name
                        : typeof item.branch === "string"
                        ? item.branch
                        : "Unknown"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {item.stock} units
                      </div>
                      <div className="text-sm text-gray-500">
                        Min: {item.minStock}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      #{item.price}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryOverview;

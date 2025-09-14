import GreenProgressBar from "../GreenProgressBar";
import React, { useState, useEffect } from "react";
import { VITE_BASE_URL } from "../../data";
import { useAuth } from "../../contexts/AuthContext";
import { apiEndpoints } from "../../utils/api";
import {
  Search,
  Calendar,
  DollarSign,
  Receipt,
  TrendingUp,
  FileSpreadsheet,
} from "lucide-react";
import {
  generateExcelReport,
  downloadExcel,
  generateReportFilename,
  ExportData,
  ExportFilters,
} from "../../utils/exportUtils";

interface Transaction {
  id: string;
  date: string;
  customer: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  paymentMethod: string;
  status: "Completed" | "Pending" | "Refunded";
}

const Transactions: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [dateRange, setDateRange] = useState("7");
  const [customDateRange, setCustomDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  // Helper function to format date and time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes.toString().padStart(2, "0");
    const formattedDate = date.toLocaleDateString();

    return `${formattedDate} ${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  // Helper function to format date for input (YYYY-MM-DD)
  const formatDateForInput = (date: Date) => {
    return date.toISOString().slice(0, 10);
  };

  // Set default custom date range to last 7 days
  useEffect(() => {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    setCustomDateRange({
      startDate: formatDateForInput(sevenDaysAgo),
      endDate: formatDateForInput(today),
    });
  }, []);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);
      try {
        // Use authenticated API endpoint
        const data = await apiEndpoints.getTransactions(user?.branchId);
        setTransactions(data.transactions || data); // adjust if API returns differently
      } catch (err: any) {
        setError(err.message || "Error fetching transactions");
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, [user?.branchId]);

  const statuses = ["All", "Completed", "Pending", "Refunded"];

  // Filter by search, status, and date range
  const now = new Date();
  const filteredTransactions = transactions.filter((transaction) => {
    if (!transaction || !transaction.id) return false;
    const matchesSearch =
      transaction.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.customer &&
        transaction.customer.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus =
      selectedStatus === "All" || transaction.status === selectedStatus;

    // Date filter
    const txnDate = new Date(transaction.date);
    let matchesDate = true;

    if (dateRange === "custom") {
      // Custom date range filtering
      if (customDateRange.startDate && customDateRange.endDate) {
        const startDate = new Date(customDateRange.startDate);
        const endDate = new Date(customDateRange.endDate);
        // Set end date to end of day
        endDate.setHours(23, 59, 59, 999);
        matchesDate = txnDate >= startDate && txnDate <= endDate;
      } else {
        matchesDate = true; // If no custom dates set, show all
      }
    } else if (dateRange === "today") {
      const todayStr = now.toISOString().slice(0, 10);
      matchesDate = transaction.date.slice(0, 10) === todayStr;
    } else {
      const days = parseInt(dateRange, 10);
      const dateLimit = new Date(now);
      dateLimit.setDate(now.getDate() - days);
      matchesDate = txnDate >= dateLimit;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Sorting
  const sortedTransactions = React.useMemo(() => {
    if (!sortConfig) return filteredTransactions;
    const sorted = [...filteredTransactions];
    sorted.sort((a, b) => {
      let aValue = a[sortConfig.key as keyof Transaction];
      let bValue = b[sortConfig.key as keyof Transaction];
      if (sortConfig.key === "date") {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }
      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredTransactions, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev && prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Refunded":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Payment method badge color
  const getPaymentColor = (method: string) => {
    switch (method.toLowerCase()) {
      case "cash":
        return "bg-blue-100 text-blue-800";
      case "card":
      case "credit card":
        return "bg-purple-100 text-purple-800";
      case "upi":
        return "bg-green-100 text-green-800";
      case "wallet":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const totalRevenue = filteredTransactions
    .filter((t) => t.status === "Completed")
    .reduce((sum, t) => sum + t.total, 0);

  const completedCount = filteredTransactions.filter(
    (t) => t.status === "Completed"
  ).length;
  const avgTransaction = totalRevenue / Math.max(completedCount, 1);

  // Completed today
  const todayStr = now.toISOString().slice(0, 10); // 'YYYY-MM-DD'
  const completedToday = filteredTransactions.filter(
    (t) => t.status === "Completed" && t.date.slice(0, 10) === todayStr
  ).length;

  // Export functions
  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      const exportData: ExportData[] = sortedTransactions.map(transaction => ({
        id: transaction.id,
        date: transaction.date,
        customer: transaction.customer,
        items: transaction.items,
        total: transaction.total,
        paymentMethod: transaction.paymentMethod,
        status: transaction.status,
      }));

      const filters: ExportFilters = {
        dateRange,
        customDateRange,
        selectedStatus,
        searchTerm,
      };

      const csvContent = generateExcelReport(exportData, "Transaction Report", filters, false);
      const filename = generateReportFilename("transaction_report", filters, "xlsx");
      downloadExcel(csvContent, filename);

      // Show success message
      alert('Excel report has been downloaded successfully!');
    } catch (error: any) {
      alert(`Error generating Excel: ${error.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  const stats = [
    {
      name: "Total Transactions",
      value: filteredTransactions.length.toString(),
      icon: Receipt,
      color: "bg-blue-500",
    },
    {
      name: "Total Revenue",
      value: `#${totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: "bg-green-500",
    },
    {
      name: "Avg Transaction",
      value: `#${avgTransaction.toFixed(2)}`,
      icon: TrendingUp,
      color: "bg-purple-500",
    },
    {
      name: "Completed Today",
      value: completedToday.toString(),
      icon: Calendar,
      color: "bg-orange-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Transaction History
          </h2>
          <p className="text-gray-600">View and manage all transactions</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            disabled={exportLoading || sortedTransactions.length === 0}
            className="w-full sm:w-auto bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center sm:justify-start space-x-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>{exportLoading ? "Exporting..." : "Export Excel"}</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
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
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="today">Today</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 3 months</option>
            <option value="365">Last year</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {/* Custom Date Range Inputs - Only show when custom is selected */}
        {dateRange === "custom" && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customDateRange.startDate}
                  onChange={(e) =>
                    setCustomDateRange((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={customDateRange.endDate}
                  onChange={(e) =>
                    setCustomDateRange((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            {customDateRange.startDate && customDateRange.endDate && (
              <div className="mt-2 text-sm text-gray-600">
                Showing transactions from{" "}
                {new Date(customDateRange.startDate).toLocaleDateString()} to{" "}
                {new Date(customDateRange.endDate).toLocaleDateString()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading and Error States */}
      <GreenProgressBar loading={loading}>
        {error ? (
          <div className="text-center py-10 text-red-500">{error}</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => handleSort("id")}
                    >
                      Transaction ID
                      {sortConfig?.key === "id" && (
                        <span className="ml-1">
                          {sortConfig.direction === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => handleSort("date")}
                    >
                      Date & Time
                      {sortConfig?.key === "date" && (
                        <span className="ml-1">
                          {sortConfig.direction === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => handleSort("customer")}
                    >
                      Customer
                      {sortConfig?.key === "customer" && (
                        <span className="ml-1">
                          {sortConfig.direction === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => handleSort("total")}
                    >
                      Total
                      {sortConfig?.key === "total" && (
                        <span className="ml-1">
                          {sortConfig.direction === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => handleSort("status")}
                    >
                      Status
                      {sortConfig?.key === "status" && (
                        <span className="ml-1">
                          {sortConfig.direction === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {transaction.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDateTime(transaction.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.customer}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {transaction.items.length} items
                        </div>
                        <div className="text-sm text-gray-500">
                          {transaction.items
                            .map((item) => item.name)
                            .join(", ")
                            .substring(0, 50)}
                          {transaction.items.map((item) => item.name).join(", ")
                            .length > 50 && "..."}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{transaction.total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentColor(
                            transaction.paymentMethod
                          )}`}
                        >
                          {transaction.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                            transaction.status
                          )}`}
                        >
                          {transaction.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </GreenProgressBar>
    </div>
  );
};

export default Transactions;

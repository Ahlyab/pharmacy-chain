import React, { useState, useEffect } from "react";
import { Calendar, Receipt, Search, FileSpreadsheet } from "lucide-react";
import GreenProgressBar from "../GreenProgressBar";
import { apiEndpoints } from "../../utils/api";
import { useAuth } from "../../contexts/AuthContext";
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
  branch: string;
  customer: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  paymentMethod: string;
  status: "Completed" | "Pending" | "Refunded";
  branchName: string;
}

const TransactionHistory: React.FC = () => {
  const { user } = useAuth();

  // Format date to 'YYYY-MM-DD h:mmAM/PM'
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? "0" + minutes : minutes;
    return `${year}-${month}-${day} ${hours}:${minutesStr}${ampm}`;
  };

  // Helper function to format date for input (YYYY-MM-DD)
  const formatDateForInput = (date: Date) => {
    return date.toISOString().slice(0, 10);
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("Completed");
  const [dateRange, setDateRange] = useState("7");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [customDateRange, setCustomDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [exportLoading, setExportLoading] = useState(false);

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

  // Sorting handler
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Date handling functions
  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setDateRange(""); // Clear date range when specific date is selected
    setCustomDateRange({ startDate: "", endDate: "" }); // Clear custom range
    setShowCalendar(false);
  };

  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    setSelectedDate(""); // Clear specific date when date range is selected
    if (range !== "custom") {
      setCustomDateRange({ startDate: "", endDate: "" }); // Clear custom range
    }
  };

  const clearDateFilters = () => {
    setSelectedDate("");
    setDateRange("7");
    setCustomDateRange({ startDate: "", endDate: "" });
    setShowCalendar(false);
  };

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiEndpoints.getTransactions(user?.branchId);
        // Handle both array response and wrapped response
        const transactionsData = Array.isArray(data)
          ? data
          : data.transactions || [];
        console.log("Fetched transactions:", transactionsData);
        setTransactions(transactionsData);
      } catch (err: any) {
        setError(err.message || "Error fetching transactions");
      } finally {
        setLoading(false);
      }
    };
    const fetchBranches = async () => {
      try {
        const data = await apiEndpoints.getBranches();
        // If data is an array of branch objects, extract names
        const branchNames = Array.isArray(data)
          ? data.map((b: any) => b.name || b.branchName || b._id || b.id)
          : [];
        setBranches(branchNames);
      } catch {
        setBranches([]);
      }
    };
    fetchTransactions();
    fetchBranches();
  }, []);

  // Branches for dropdown ("All" + fetched branches)
  const branchOptions = ["All", ...branches.filter(Boolean)];
  const statuses = ["All", "Completed", "Pending", "Refunded"];

  // Filter by search, branch, status, and date range
  const now = new Date();
  const filteredTransactions = transactions.filter((transaction) => {
    if (!transaction || !transaction.id) return false;
    const matchesSearch =
      transaction.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.customer &&
        transaction.customer.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesBranch =
      selectedBranch === "All" || transaction.branchName === selectedBranch;
    const matchesStatus =
      selectedStatus === "All" || transaction.status === selectedStatus;

    // Date filter - prioritize specific date over date range
    const txnDate = new Date(transaction.date);
    let matchesDate = true;

    if (selectedDate) {
      // Specific date filter
      const selectedDateObj = new Date(selectedDate);
      const selectedStart = new Date(
        selectedDateObj.getFullYear(),
        selectedDateObj.getMonth(),
        selectedDateObj.getDate()
      );
      const selectedEnd = new Date(
        selectedStart.getTime() + 24 * 60 * 60 * 1000
      );
      matchesDate = txnDate >= selectedStart && txnDate < selectedEnd;
    } else if (dateRange === "custom") {
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
      const txnDateStr = txnDate.toISOString().slice(0, 10);
      const todayStr = now.toISOString().slice(0, 10);
      matchesDate = txnDateStr === todayStr;
    } else {
      const days = parseInt(dateRange, 10);
      const dateLimit = new Date(now);
      dateLimit.setDate(now.getDate() - days);
      matchesDate = txnDate >= dateLimit;
    }

    const result =
      matchesSearch && matchesBranch && matchesStatus && matchesDate;
    if (!result) {
      console.log("Transaction filtered out:", {
        id: transaction.id,
        customer: transaction.customer,
        branchName: transaction.branchName,
        status: transaction.status,
        date: transaction.date,
        matchesSearch,
        matchesBranch,
        matchesStatus,
        matchesDate,
      });
    }
    return result;
  });

  console.log("Filtered transactions:", filteredTransactions);

  const sortedTransactions = filteredTransactions.sort((a, b) => {
    let valA, valB;
    switch (sortColumn) {
      case "id":
        valA = a.id;
        valB = b.id;
        break;
      case "date":
        valA = new Date(a.date).getTime();
        valB = new Date(b.date).getTime();
        break;
      case "branch":
        valA = a.branchName;
        valB = b.branchName;
        break;
      case "customer":
        valA = a.customer || "";
        valB = b.customer || "";
        break;
      case "items":
        valA = a.items?.length || 0;
        valB = b.items?.length || 0;
        break;
      case "total":
        valA = a.total;
        valB = b.total;
        break;
      case "paymentMethod":
        valA = a.paymentMethod;
        valB = b.paymentMethod;
        break;
      case "status":
        valA = a.status;
        valB = b.status;
        break;
      default:
        valA = a.date;
        valB = b.date;
    }
    if (valA < valB) return sortDirection === "asc" ? -1 : 1;
    if (valA > valB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

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

  const completedTransactions = sortedTransactions.filter((t) => t.status === "Completed");
  const totalRevenue = completedTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
  const completedCount = completedTransactions.length;
  const avgTransaction = totalRevenue / Math.max(completedCount, 1);
  
  const todayStr = now.toISOString().slice(0, 10);
  const completedToday = sortedTransactions.filter(
    (t) => t.status === "Completed" && t.date.slice(0, 10) === todayStr
  ).length;

  // Export functions
  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      // Check if we have transactions to export
      if (!sortedTransactions || sortedTransactions.length === 0) {
        alert('No transactions to export');
        return;
      }

      const exportData: ExportData[] = sortedTransactions.map(transaction => ({
        'Transaction ID': transaction.id,
        'Date & Time': new Date(transaction.date).toLocaleString(),
        'Customer': transaction.customer || 'N/A',
        'Branch': transaction.branchName || 'N/A',
        'Items Count': transaction.items.length,
        'Items': transaction.items.map(item => `${item.name} (Qty: ${item.quantity})`).join(', '),
        'Total Amount': `#${transaction.total.toFixed(2)}`,
        'Payment Method': transaction.paymentMethod,
        'Status': transaction.status,
      }));

      const filename = `transaction_history_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Use the correct function signature
      generateExcelReport(exportData, filename);

      // Show success message
      alert('Excel report has been downloaded successfully!');
    } catch (error: any) {
      console.error('Export error:', error);
      alert(`Error generating Excel: ${error.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  const stats = [
    {
      name: "Total Transactions",
      value: sortedTransactions.length.toString(),
      icon: Receipt,
      color: "bg-blue-500",
    },
    {
      name: "Total Revenue",
      value: `#${totalRevenue.toFixed(2)}`,
      icon: Receipt,
      color: "bg-green-500",
    },
    {
      name: "Avg Transaction",
      value: `#${avgTransaction.toFixed(2)}`,
      icon: Calendar,
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
          <p className="text-gray-600">View all transactions across branches</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search Input - Full width on small screens */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-5 h-5 w-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Branch Filter */}
          <div className="w-full">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {branchOptions.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="w-full">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter with Calendar Option */}
          <div className="relative w-full">
            <div className="flex w-full">
              <select
                value={dateRange}
                onChange={(e) => handleDateRangeChange(e.target.value)}
                className={`flex-1 px-3 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  selectedDate
                    ? "border-gray-300 bg-gray-100"
                    : "border-gray-300"
                }`}
                disabled={!!selectedDate}
              >
                <option value="today">Today</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 3 months</option>
                <option value="365">Last year</option>
                <option value="custom">Custom Range</option>
              </select>
              <button
                type="button"
                onClick={() => setShowCalendar(!showCalendar)}
                className={`px-3 py-2 border border-l-0 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center ${
                  selectedDate
                    ? "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                }`}
                title="Select specific date"
              >
                <Calendar className="h-4 w-4" />
              </button>
            </div>

            {/* Active Filter Indicator */}
            {(selectedDate || dateRange) && (
              <div className="mt-1 text-xs">
                {selectedDate ? (
                  <span className="text-blue-600 font-medium">
                    📅 Filtering by date:{" "}
                    {new Date(selectedDate).toLocaleDateString()}
                  </span>
                ) : dateRange === "custom" ? (
                  <span className="text-blue-600 font-medium">
                    📅 Custom range:{" "}
                    {customDateRange.startDate && customDateRange.endDate
                      ? `${new Date(
                          customDateRange.startDate
                        ).toLocaleDateString()} - ${new Date(
                          customDateRange.endDate
                        ).toLocaleDateString()}`
                      : "Select dates"}
                  </span>
                ) : (
                  <span className="text-gray-600">
                    📅 Filtering by:{" "}
                    {dateRange === "today" ? "Today" : `Last ${dateRange} days`}
                  </span>
                )}
              </div>
            )}

            {/* Calendar Dropdown */}
            {showCalendar && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Select Date
                  </span>
                  <button
                    onClick={() => setShowCalendar(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {selectedDate && (
                  <div className="mt-2 flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      Selected: {new Date(selectedDate).toLocaleDateString()}
                    </span>
                    <button
                      onClick={clearDateFilters}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Clear Filters Button */}
          <button
            onClick={clearDateFilters}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Clear Filters
          </button>
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

      {/* Transactions Table with loading/error */}
      <GreenProgressBar loading={loading}>
        {error ? (
          <div className="text-center py-10 text-red-500">{error}</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => handleSort("id")}
                    >
                      <span className="hidden sm:inline">Transaction ID</span>
                      <span className="sm:hidden">ID</span>{" "}
                      {sortColumn === "id" &&
                        (sortDirection === "asc" ? "▲" : "▼")}
                    </th>
                    <th
                      className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => handleSort("date")}
                    >
                      <span className="hidden sm:inline">Date & Time</span>
                      <span className="sm:hidden">Date</span>{" "}
                      {sortColumn === "date" &&
                        (sortDirection === "asc" ? "▲" : "▼")}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => handleSort("branch")}
                    >
                      Branch{" "}
                      {sortColumn === "branch" &&
                        (sortDirection === "asc" ? "▲" : "▼")}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => handleSort("customer")}
                    >
                      Customer{" "}
                      {sortColumn === "customer" &&
                        (sortDirection === "asc" ? "▲" : "▼")}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => handleSort("items")}
                    >
                      Items{" "}
                      {sortColumn === "items" &&
                        (sortDirection === "asc" ? "▲" : "▼")}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => handleSort("total")}
                    >
                      Total{" "}
                      {sortColumn === "total" &&
                        (sortDirection === "asc" ? "▲" : "▼")}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => handleSort("paymentMethod")}
                    >
                      Payment{" "}
                      {sortColumn === "paymentMethod" &&
                        (sortDirection === "asc" ? "▲" : "▼")}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => handleSort("status")}
                    >
                      Status{" "}
                      {sortColumn === "status" &&
                        (sortDirection === "asc" ? "▲" : "▼")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                        <span className="hidden sm:inline">
                          {transaction.id}
                        </span>
                        <span className="sm:hidden">
                          {transaction.id.substring(0, 8)}...
                        </span>
                      </td>
                      <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                        <span className="hidden sm:inline">
                          {formatDateTime(transaction.date)}
                        </span>
                        <span className="sm:hidden">
                          {new Date(transaction.date).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.branchName}
                      </td>
                      <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                        <span className="hidden sm:inline">
                          {transaction.customer}
                        </span>
                        <span className="sm:hidden">
                          {transaction.customer.length > 15
                            ? transaction.customer.substring(0, 15) + "..."
                            : transaction.customer}
                        </span>
                      </td>
                      <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                        <div className="flex items-center space-x-2">
                          <span className="hidden sm:inline">
                            {transaction.items?.length || 0} items
                          </span>
                          <span className="sm:hidden">
                            {transaction.items?.length || 0}
                          </span>
                        </div>
                        <div className="hidden sm:block text-xs sm:text-sm text-gray-500">
                          {transaction.items
                            ?.map((item) => item.name)
                            .join(", ")
                            .substring(0, 50)}
                          {transaction.items
                            ?.map((item) => item.name)
                            .join(", ").length > 50 && "..."}
                        </div>
                      </td>
                      <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                        #{transaction.total.toFixed(2)}
                      </td>
                      <td className="px-2 sm:px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-1 sm:px-2 py-1 text-xs font-medium rounded-full ${getPaymentColor(
                            transaction.paymentMethod
                          )}`}
                        >
                          <span className="hidden sm:inline">
                            {transaction.paymentMethod}
                          </span>
                          <span className="sm:hidden">
                            {transaction.paymentMethod.charAt(0).toUpperCase()}
                          </span>
                        </span>
                      </td>
                      <td className="px-2 sm:px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-1 sm:px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
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

export default TransactionHistory;

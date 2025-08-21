import React, { useState, useEffect } from "react";
import { Calendar, DollarSign, Receipt, Search } from "lucide-react";
// ...existing code...
import GreenProgressBar from "../GreenProgressBar";
import config from "../../config/env";

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
}

const TransactionHistory: React.FC = () => {
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [dateRange, setDateRange] = useState("7");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

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
    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${config.apiUrl}/api/transaction`);
        if (!res.ok) throw new Error("Failed to fetch transactions");
        const data = await res.json();
        setTransactions(data.transactions || data);
      } catch (err: any) {
        setError(err.message || "Error fetching transactions");
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, []);

  // Branches from transactions
  const branches = [
    "All",
    ...Array.from(new Set(transactions.map((t) => t.branch).filter(Boolean))),
  ];
  const statuses = ["All", "Completed", "Pending", "Refunded"];

  // Filter by search, branch, status, and date range
  const now = new Date();
  const filteredTransactions = transactions
    .filter((transaction) => {
      if (!transaction || !transaction.id || !transaction.customer)
        return false;
      const matchesSearch =
        transaction.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.customer.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBranch =
        selectedBranch === "All" || transaction.branch === selectedBranch;
      const matchesStatus =
        selectedStatus === "All" || transaction.status === selectedStatus;
      // Date filter
      const txnDate = new Date(transaction.date);
      let matchesDate = true;
      if (dateRange === "today") {
        const txnDateStr = txnDate.toISOString().slice(0, 10);
        const todayStr = now.toISOString().slice(0, 10);
        matchesDate = txnDateStr === todayStr;
      } else {
        const days = parseInt(dateRange, 10);
        const dateLimit = new Date(now);
        dateLimit.setDate(now.getDate() - days);
        matchesDate = txnDate >= dateLimit;
      }
      return matchesSearch && matchesBranch && matchesStatus && matchesDate;
    })
    .sort((a, b) => {
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
          valA = a.branch;
          valB = b.branch;
          break;
        case "customer":
          valA = a.customer;
          valB = b.customer;
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

  const totalRevenue = filteredTransactions
    .filter((t) => t.status === "Completed")
    .reduce((sum, t) => sum + t.total, 0);
  const completedCount = filteredTransactions.filter(
    (t) => t.status === "Completed"
  ).length;
  const avgTransaction = totalRevenue / Math.max(completedCount, 1);
  const todayStr = now.toISOString().slice(0, 10);
  const completedToday = filteredTransactions.filter(
    (t) => t.status === "Completed" && t.date.slice(0, 10) === todayStr
  ).length;

  const stats = [
    {
      name: "Total Transactions",
      value: filteredTransactions.length.toString(),
      icon: Receipt,
      color: "bg-blue-500",
    },
    {
      name: "Total Revenue",
      value: `$${totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: "bg-green-500",
    },
    {
      name: "Avg Transaction",
      value: `$${avgTransaction.toFixed(2)}`,
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
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Transaction History
        </h2>
        <p className="text-gray-600">View all transactions across branches</p>
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
          </select>
        </div>
      </div>

      {/* Transactions Table with loading/error */}
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
                      Transaction ID{" "}
                      {sortColumn === "id" &&
                        (sortDirection === "asc" ? "▲" : "▼")}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => handleSort("date")}
                    >
                      Date & Time{" "}
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
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {transaction.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDateTime(transaction.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.branch}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.customer}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {transaction.items?.length || 0} items
                        </div>
                        <div className="text-sm text-gray-500">
                          {transaction.items
                            ?.map((item) => item.name)
                            .join(", ")
                            .substring(0, 50)}
                          {transaction.items
                            ?.map((item) => item.name)
                            .join(", ").length > 50 && "..."}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${transaction.total.toFixed(2)}
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

export default TransactionHistory;

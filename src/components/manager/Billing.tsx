import GreenProgressBar from "../GreenProgressBar";
import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import { Search, FileText, Download, Eye, RotateCcw, FileSpreadsheet } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { apiEndpoints } from "../../utils/api";
import Swal from "sweetalert2";
import {
  generateExcelReport,
  downloadExcel,
  generateReportFilename,
  ExportData,
  ExportFilters,
} from "../../utils/exportUtils";

interface Bill {
  id: string;
  date: string;
  customer: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    productId?: string; // Add productId for stock management
  }>;
  total: number;
  paymentMethod: string;
  status: "Paid" | "Pending" | "Refunded" | "Returned"; // Add Returned status
}

interface ReturnItem {
  productId: string;
  name: string;
  originalQuantity: number;
  returnQuantity: number;
  price: number;
}

const Billing: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [dateRange, setDateRange] = useState("7");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [showCalendar, setShowCalendar] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billToView, setBillToView] = useState<Bill | null>(null); // for view/print
  const [billToDownload, setBillToDownload] = useState<Bill | null>(null); // for download
  const [billToReturn, setBillToReturn] = useState<Bill | null>(null); // for return
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [returnReason, setReturnReason] = useState("");
  const [returnLoading, setReturnLoading] = useState(false);
  const [showReturnHistory, setShowReturnHistory] = useState(false);
  const [returnHistory, setReturnHistory] = useState<any[]>([]);
  const [returnHistoryLoading, setReturnHistoryLoading] = useState(false);
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
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedDate = date.toLocaleDateString();
    
    return `${formattedDate} ${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  useEffect(() => {
    const fetchBills = async () => {
      setLoading(true);
      setError(null);
      try {
        // Use authenticated API endpoint
        const data = await apiEndpoints.getTransactions(user?.branchId);
        // Map backend status to Bill status
        const mapped = (data.transactions || data).map((t: any) => ({
          id: t.id,
          date: t.date,
          customer: t.customer,
          items: t.items,
          total: t.total,
          paymentMethod: t.paymentMethod,
          status: t.status === "Completed" ? "Paid" : t.status || "Pending",
        }));
        setBills(mapped);
      } catch (err: any) {
        setError(err.message || "Error fetching bills");
      } finally {
        setLoading(false);
      }
    };
    fetchBills();
  }, [user?.branchId]);

  const statuses = ["All", "Paid", "Pending", "Refunded", "Returned"];

  // Filter by search, status, and date range
  const now = new Date();
  const filteredBills = bills.filter((bill) => {
    if (!bill || !bill.id) return false;
    const matchesSearch =
      bill.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bill.customer && bill.customer.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus =
      selectedStatus === "All" || bill.status === selectedStatus;
    
    // Date filter - prioritize specific date over date range
    const txnDate = new Date(bill.date);
    let matchesDate = true;
    
    if (selectedDate) {
      // Specific date filter
      const selectedDateObj = new Date(selectedDate);
      const selectedStart = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), selectedDateObj.getDate());
      const selectedEnd = new Date(selectedStart.getTime() + 24 * 60 * 60 * 1000);
      matchesDate = txnDate >= selectedStart && txnDate < selectedEnd;
    } else if (dateRange === "today") {
      // Today filter
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      matchesDate =
        txnDate >= today &&
        txnDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
    } else {
      // Date range filter
      const days = parseInt(dateRange, 10);
      const dateLimit = new Date(now);
      dateLimit.setDate(now.getDate() - days);
      matchesDate = txnDate >= dateLimit;
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Sorting
  const sortedBills = React.useMemo(() => {
    if (!sortConfig)
      return filteredBills
        .slice()
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    const sorted = [...filteredBills];
    sorted.sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof Bill];
      let bValue: any = b[sortConfig.key as keyof Bill];
      if (sortConfig.key === "items") {
        aValue = a.items.length;
        bValue = b.items.length;
      }
      if (sortConfig.key === "date") {
        aValue = new Date(a.date).getTime();
        bValue = new Date(b.date).getTime();
      }
      if (typeof aValue === "string" && typeof bValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredBills, sortConfig]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Refunded":
        return "bg-red-100 text-red-800";
      case "Returned":
        return "bg-orange-100 text-orange-800";
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

  const handleViewBill = (bill: Bill) => {
    setBillToView(bill);
  };

  const handleDownloadBill = (bill: Bill) => {
    setBillToDownload(bill);
  };

  const handleReturnBill = (bill: Bill) => {
    // Initialize return items with original quantities
    const initialReturnItems: ReturnItem[] = bill.items.map(item => ({
      productId: item.productId || `product_${Math.random()}`, // Fallback if no productId
      name: item.name,
      originalQuantity: item.quantity,
      returnQuantity: 0,
      price: item.price
    }));
    setReturnItems(initialReturnItems);
    setBillToReturn(bill);
  };

  const handleReturnQuantityChange = (index: number, value: number) => {
    const newReturnItems = [...returnItems];
    newReturnItems[index].returnQuantity = Math.max(0, Math.min(value, newReturnItems[index].originalQuantity));
    setReturnItems(newReturnItems);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setDateRange(""); // Clear date range when specific date is selected
    setShowCalendar(false);
  };

  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    setSelectedDate(""); // Clear specific date when date range is selected
  };

  const clearDateFilters = () => {
    setSelectedDate("");
    setDateRange("7");
    setShowCalendar(false);
  };

  const calculateReturnTotal = () => {
    return returnItems.reduce((total, item) => {
      return total + (item.returnQuantity * item.price);
    }, 0);
  };

  const handleProcessReturn = async () => {
    if (!billToReturn) return;

    const itemsToReturn = returnItems.filter(item => item.returnQuantity > 0);
    if (itemsToReturn.length === 0) {
      Swal.fire({
        title: 'No Items Selected',
        text: 'Please select items to return',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }

    if (!returnReason.trim()) {
      Swal.fire({
        title: 'Return Reason Required',
        text: 'Please provide a return reason',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
      return;
    }

    setReturnLoading(true);
    try {
      // Process return through API
      const returnData = {
        transactionId: billToReturn.id,
        branchId: user?.branchId,
        returnItems: itemsToReturn,
        returnReason: returnReason,
        returnAmount: calculateReturnTotal(),
        originalTotal: billToReturn.total,
        processedBy: user?.name || user?.email || "Unknown"
      };

      console.log("Sending return data:", returnData);

      await apiEndpoints.processReturn(returnData);

      // Update local state
      const updatedBills = bills.map(bill => 
        bill.id === billToReturn.id 
          ? { ...bill, status: "Returned" as const }
          : bill
      );
      setBills(updatedBills);

      // Close modal and reset
      setBillToReturn(null);
      setReturnItems([]);
      setReturnReason("");
      
      Swal.fire({
        title: 'Return Processed',
        text: 'Return processed successfully!',
        icon: 'success',
        confirmButtonText: 'OK'
      });
    } catch (error: any) {
      Swal.fire({
        title: 'Return Failed',
        text: `Error processing return: ${error.message}`,
        icon: 'error',
        confirmButtonText: 'OK'
      });
    } finally {
      setReturnLoading(false);
    }
  };

  const fetchReturnHistory = async () => {
    setReturnHistoryLoading(true);
    try {
      // Use authenticated API endpoint
      const data = await apiEndpoints.getReturnHistory(user?.branchId);
      setReturnHistory(data);
    } catch (error: any) {
      console.error("Error fetching return history:", error);
    } finally {
      setReturnHistoryLoading(false);
    }
  };

  const handleDownloadPDF = (bill: Bill) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Bill for ${bill.customer}`, 10, 15);
    doc.setFontSize(10);
    doc.text(`Bill ID: ${bill.id}`, 10, 25);
    doc.text(`Date: ${bill.date}`, 10, 32);
    doc.text(`Payment Method: ${bill.paymentMethod}`, 10, 39);
    doc.text(`Status: ${bill.status}`, 10, 46);

    let y = 55;
    doc.setFontSize(12);
    doc.text("Items:", 10, y);
    y += 7;
    doc.setFontSize(10);
    doc.text("Product", 10, y);
    doc.text("Price", 70, y);
    doc.text("Qty", 110, y);
    doc.text("Total", 140, y);
    y += 5;
    bill.items.forEach((item) => {
      doc.text(item.name, 10, y);
      doc.text(`#${item.price.toFixed(2)}`, 70, y);
      doc.text(`${item.quantity}`, 110, y);
      doc.text(`#${(item.price * item.quantity).toFixed(2)}`, 140, y);
      y += 6;
    });
    y += 4;
    doc.setFontSize(12);
    doc.text(`Total: #${bill.total.toFixed(2)}`, 10, y);
    doc.save(`Bill_${bill.id}.pdf`);
  };

  // Export functions
  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      // Check if we have bills to export
      if (!sortedBills || sortedBills.length === 0) {
        Swal.fire({
          title: 'No Data',
          text: 'No bills to export',
          icon: 'warning',
          confirmButtonText: 'OK'
        });
        return;
      }

      const exportData: ExportData[] = sortedBills.map(bill => ({
        'Bill ID': bill.id,
        'Date': new Date(bill.date).toLocaleDateString(),
        'Customer': bill.customer || 'N/A',
        'Items Count': bill.items.length,
        'Items': bill.items.map(item => `${item.name} (Qty: ${item.quantity})`).join(', '),
        'Total Amount': `#${bill.total.toFixed(2)}`,
        'Payment Method': bill.paymentMethod,
        'Status': bill.status,
      }));

      const filename = `billing_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Use the correct function signature
      generateExcelReport(exportData, filename);

      Swal.fire({
        title: 'Export Successful',
        text: 'Excel report has been downloaded successfully!',
        icon: 'success',
        confirmButtonText: 'OK'
      });
    } catch (error: any) {
      console.error('Export error:', error);
      Swal.fire({
        title: 'Export Failed',
        text: `Error generating Excel: ${error.message}`,
        icon: 'error',
        confirmButtonText: 'OK'
      });
    } finally {
      setExportLoading(false);
    }
  };

  const totalRevenue = filteredBills
    .filter((bill) => bill.status === "Paid")
    .reduce((sum, bill) => sum + bill.total, 0);

  return (
    <div className="space-y-6">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
         <div>
           <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Billing & Invoices</h2>
           <p className="text-sm sm:text-base text-gray-600">Manage customer bills and invoices</p>
         </div>
         <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
           <button
             onClick={() => {
               setShowReturnHistory(true);
               fetchReturnHistory();
             }}
             className="w-full sm:w-auto bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 flex items-center justify-center sm:justify-start space-x-2"
           >
             <RotateCcw className="h-4 w-4" />
             <span>Return History</span>
           </button>
           <div className="flex gap-2">
             <button
               onClick={handleExportExcel}
               disabled={exportLoading || sortedBills.length === 0}
               className="w-full sm:w-auto bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center sm:justify-start space-x-2"
             >
               <FileSpreadsheet className="h-4 w-4" />
               <span>{exportLoading ? "Exporting..." : "Export Excel"}</span>
             </button>
           </div>
         </div>
       </div>

             {/* Stats */}
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
         <div className="bg-white rounded-lg shadow p-4 lg:p-6">
           <div className="flex items-center">
             <div className="bg-blue-500 p-2 lg:p-3 rounded-lg">
               <FileText className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
             </div>
             <div className="ml-3 lg:ml-4">
               <p className="text-xs lg:text-sm font-medium text-gray-600">Total Bills</p>
               <p className="text-xl lg:text-2xl font-bold text-gray-900">
                 {sortedBills.length}
               </p>
             </div>
           </div>
         </div>

         <div className="bg-white rounded-lg shadow p-4 lg:p-6">
           <div className="flex items-center">
             <div className="bg-green-500 p-2 lg:p-3 rounded-lg">
               <FileText className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
             </div>
             <div className="ml-3 lg:ml-4">
               <p className="text-xs lg:text-sm font-medium text-gray-600">Paid Bills</p>
               <p className="text-xl lg:text-2xl font-bold text-gray-900">
                 {sortedBills.filter((b) => b.status === "Paid").length}
               </p>
             </div>
           </div>
         </div>

         <div className="bg-white rounded-lg shadow p-4 lg:p-6">
           <div className="flex items-center">
             <div className="bg-yellow-500 p-2 lg:p-3 rounded-lg">
               <FileText className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
             </div>
             <div className="ml-3 lg:ml-4">
               <p className="text-xs lg:text-sm font-medium text-gray-600">Pending Bills</p>
               <p className="text-xl lg:text-2xl font-bold text-gray-900">
                 {sortedBills.filter((b) => b.status === "Pending").length}
               </p>
             </div>
           </div>
         </div>

         <div className="bg-white rounded-lg shadow p-4 lg:p-6">
           <div className="flex items-center">
             <div className="bg-purple-500 p-2 lg:p-3 rounded-lg">
               <FileText className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
             </div>
             <div className="ml-3 lg:ml-4">
               <p className="text-xs lg:text-sm font-medium text-gray-600">Total Revenue</p>
               <p className="text-xl lg:text-2xl font-bold text-gray-900">
                 #{totalRevenue.toFixed(2)}
               </p>
             </div>
           </div>
         </div>
       </div>

                    {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Input - Full width on small screens */}
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search bills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
                    selectedDate ? 'border-gray-300 bg-gray-100' : 'border-gray-300'
                  }`}
                  disabled={!!selectedDate}
                >
                  <option value="today">Today</option>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 3 months</option>
                  <option value="365">Last year</option>
                </select>
                <button
                  type="button"
                  onClick={() => setShowCalendar(!showCalendar)}
                  className={`px-3 py-2 border border-l-0 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    selectedDate 
                      ? 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100' 
                      : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                  }`}
                  title="Select specific date"
                >
                  📅
                </button>
              </div>
              
              {/* Active Filter Indicator */}
              {(selectedDate || dateRange) && (
                <div className="mt-1 text-xs">
                  {selectedDate ? (
                    <span className="text-blue-600 font-medium">
                      📅 Filtering by date: {new Date(selectedDate).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-gray-600">
                      📅 Filtering by: {dateRange === "today" ? "Today" : `Last ${dateRange} days`}
                    </span>
                  )}
                </div>
              )}
              
              {/* Calendar Dropdown */}
              {showCalendar && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Select Date</span>
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
        </div>

             {/* Bills Table */}
       <div className="bg-white rounded-lg shadow overflow-hidden">
         <div className="overflow-x-auto">
           <GreenProgressBar loading={loading}>
             {error ? (
               <div className="text-center py-10 text-red-500">{error}</div>
             ) : (
               <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                <thead className="bg-gray-50">
                  <tr>
                                         <th
                       className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                       onClick={() =>
                         setSortConfig(
                           sortConfig?.key === "id"
                             ? {
                                 key: "id",
                                 direction:
                                   sortConfig.direction === "asc"
                                     ? "desc"
                                     : "asc",
                               }
                             : { key: "id", direction: "asc" }
                         )
                       }
                     >
                       <span className="hidden sm:inline">Bill ID</span>
                       <span className="sm:hidden">ID</span>{" "}
                       {sortConfig?.key === "id"
                         ? sortConfig.direction === "asc"
                           ? "▲"
                           : "▼"
                         : ""}
                     </th>
                                         <th
                       className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                       onClick={() =>
                         setSortConfig(
                           sortConfig?.key === "date"
                             ? {
                                 key: "date",
                                 direction:
                                   sortConfig.direction === "asc"
                                     ? "desc"
                                     : "asc",
                               }
                             : { key: "date", direction: "asc" }
                         )
                       }
                     >
                       <span className="hidden sm:inline">Date & Time</span>
                       <span className="sm:hidden">Date</span>{" "}
                       {sortConfig?.key === "date"
                         ? sortConfig.direction === "asc"
                           ? "▲"
                           : "▼"
                         : ""}
                     </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() =>
                        setSortConfig(
                          sortConfig?.key === "customer"
                            ? {
                                key: "customer",
                                direction:
                                  sortConfig.direction === "asc"
                                    ? "desc"
                                    : "asc",
                              }
                            : { key: "customer", direction: "asc" }
                        )
                      }
                    >
                      Customer{" "}
                      {sortConfig?.key === "customer"
                        ? sortConfig.direction === "asc"
                          ? "▲"
                          : "▼"
                        : ""}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() =>
                        setSortConfig(
                          sortConfig?.key === "items"
                            ? {
                                key: "items",
                                direction:
                                  sortConfig.direction === "asc"
                                    ? "desc"
                                    : "asc",
                              }
                            : { key: "items", direction: "asc" }
                        )
                      }
                    >
                      Items{" "}
                      {sortConfig?.key === "items"
                        ? sortConfig.direction === "asc"
                          ? "▲"
                          : "▼"
                        : ""}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() =>
                        setSortConfig(
                          sortConfig?.key === "total"
                            ? {
                                key: "total",
                                direction:
                                  sortConfig.direction === "asc"
                                    ? "desc"
                                    : "asc",
                              }
                            : { key: "total", direction: "asc" }
                        )
                      }
                    >
                      Total{" "}
                      {sortConfig?.key === "total"
                        ? sortConfig.direction === "asc"
                          ? "▲"
                          : "▼"
                        : ""}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment
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
                                     {sortedBills.map((bill) => (
                     <tr key={bill.id} className="hover:bg-gray-50">
                       <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                         <span className="hidden sm:inline">{bill.id}</span>
                         <span className="sm:hidden">{bill.id.substring(0, 8)}...</span>
                       </td>
                       <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                         <span className="hidden sm:inline">{formatDateTime(bill.date)}</span>
                         <span className="sm:hidden">{new Date(bill.date).toLocaleDateString()}</span>
                       </td>
                       <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                         <span className="hidden sm:inline">{bill.customer}</span>
                         <span className="sm:hidden">{bill.customer.length > 15 ? bill.customer.substring(0, 15) + '...' : bill.customer}</span>
                       </td>
                       <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                         <div className="flex items-center space-x-2">
                           <span className="hidden sm:inline">{bill.items.length} items</span>
                           <span className="sm:hidden">{bill.items.length}</span>
                           {bill.status === "Returned" && (
                             <span className="inline-flex items-center px-1 sm:px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                               <span className="hidden sm:inline">Returned</span>
                               <span className="sm:hidden">R</span>
                             </span>
                           )}
                         </div>
                       </td>
                       <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                         #{bill.total.toFixed(2)}
                       </td>
                       <td className="px-2 sm:px-6 py-4 whitespace-nowrap">
                         <span
                           className={`px-1 sm:px-2 py-1 text-xs font-medium rounded-full ${getPaymentColor(
                             bill.paymentMethod
                           )}`}
                         >
                           <span className="hidden sm:inline">{bill.paymentMethod}</span>
                           <span className="sm:hidden">{bill.paymentMethod.charAt(0).toUpperCase()}</span>
                         </span>
                       </td>
                       <td className="px-2 sm:px-6 py-4 whitespace-nowrap">
                         <span
                           className={`px-1 sm:px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                             bill.status
                           )}`}
                         >
                           {bill.status}
                         </span>
                       </td>
                       <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                         <div className="flex space-x-1 sm:space-x-2">
                           <button
                             onClick={() => handleViewBill(bill)}
                             className="text-blue-600 hover:text-blue-900 p-1"
                             title="View Bill"
                           >
                             <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                           </button>
                           <button
                             onClick={() => handleDownloadBill(bill)}
                             className="text-green-600 hover:text-green-900 p-1"
                             title="Download Bill"
                           >
                             <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                           </button>
                           {/* Return button - only show for Paid transactions */}
                           {bill.status === "Paid" && (
                             <button
                               onClick={() => handleReturnBill(bill)}
                               className="text-orange-600 hover:text-orange-900 p-1"
                               title="Return Transaction"
                             >
                               <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
                             </button>
                           )}
                         </div>
                       </td>
                     </tr>
                   ))}
                </tbody>
              </table>
            )}
          </GreenProgressBar>
        </div>
      </div>

      {/* Bill View Modal (with Print) */}
      {billToView && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative print:w-full print:max-w-full">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setBillToView(null)}
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-2 text-center">
              {billToView.customer}
            </h2>
            <div className="text-center text-xs text-gray-500 mb-2">
              Bill ID: {billToView.id}
            </div>
            <div className="mb-2 text-xs text-gray-500">
              Date: {formatDateTime(billToView.date)}
            </div>
            <table className="w-full text-xs mb-4">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1">Product</th>
                  <th className="text-right py-1">Price</th>
                  <th className="text-right py-1">Qty</th>
                  <th className="text-right py-1">Total</th>
                </tr>
              </thead>
              <tbody>
                {billToView.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.name}</td>
                    <td className="text-right">#{item.price.toFixed(2)}</td>
                    <td className="text-right">{item.quantity}</td>
                    <td className="text-right">
                      #{(item.price * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between font-bold text-base mb-2">
              <span>Total:</span>
              <span>#{billToView.total.toFixed(2)}</span>
            </div>
            <div className="mb-2 text-xs">
              Payment Method:{" "}
              <span className="font-semibold">{billToView.paymentMethod}</span>
            </div>
            <div className="text-center mt-4 flex gap-2 justify-center">
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 print:hidden"
                onClick={() => {
                  window.print();
                  setTimeout(() => setBillToView(null), 500);
                }}
              >
                Print
              </button>
              <button
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-600 print:hidden"
                onClick={() => setBillToView(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Download Modal (with Download PDF) */}
      {billToDownload && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative print:w-full print:max-w-full">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setBillToDownload(null)}
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-2 text-center">
              {billToDownload.customer}
            </h2>
            <div className="text-center text-xs text-gray-500 mb-2">
              Bill ID: {billToDownload.id}
            </div>
            <div className="mb-2 text-xs text-gray-500">
              Date: {formatDateTime(billToDownload.date)}
            </div>
            <table className="w-full text-xs mb-4">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1">Product</th>
                  <th className="text-right py-1">Price</th>
                  <th className="text-right py-1">Qty</th>
                  <th className="text-right py-1">Total</th>
                </tr>
              </thead>
              <tbody>
                {billToDownload.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.name}</td>
                    <td className="text-right">#{item.price.toFixed(2)}</td>
                    <td className="text-right">{item.quantity}</td>
                    <td className="text-right">
                      #{(item.price * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between font-bold text-base mb-2">
              <span>Total:</span>
              <span>#{billToDownload.total.toFixed(2)}</span>
            </div>
            <div className="mb-2 text-xs">
              Payment Method:{" "}
              <span className="font-semibold">
                {billToDownload.paymentMethod}
              </span>
            </div>
            <div className="text-center mt-4 flex gap-2 justify-center">
              <button
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 print:hidden"
                onClick={() => {
                  handleDownloadPDF(billToDownload);
                  setTimeout(() => setBillToDownload(null), 500);
                }}
              >
                Download PDF
              </button>
              <button
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-600 print:hidden"
                onClick={() => setBillToDownload(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Transaction Modal */}
      {billToReturn && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Return Transaction</h2>
              <button
                className="text-gray-400 hover:text-gray-600 text-2xl"
                onClick={() => {
                  setBillToReturn(null);
                  setReturnItems([]);
                  setReturnReason("");
                }}
              >
                &times;
              </button>
            </div>

                         <div className="mb-6">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                 <div>
                   <span className="font-semibold">Bill ID:</span> {billToReturn.id}
                 </div>
                 <div>
                   <span className="font-semibold">Customer:</span> {billToReturn.customer}
                 </div>
                 <div>
                   <span className="font-semibold">Date:</span> {formatDateTime(billToReturn.date)}
                 </div>
                 <div>
                   <span className="font-semibold">Original Total:</span> #{billToReturn.total.toFixed(2)}
                 </div>
               </div>
             </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Return Reason *
              </label>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                rows={3}
                placeholder="Enter reason for return..."
              />
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Select Products to Return</h3>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      const updatedItems = returnItems.map(item => ({
                        ...item,
                        returnQuantity: item.originalQuantity
                      }));
                      setReturnItems(updatedItems);
                    }}
                    className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 border border-blue-300"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updatedItems = returnItems.map(item => ({
                        ...item,
                        returnQuantity: 0
                      }));
                      setReturnItems(updatedItems);
                    }}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 border border-gray-300"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                {returnItems.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    {/* Product Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-lg">{item.name}</h4>
                        <p className="text-sm text-gray-600">Unit Price: #{item.price.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded-full border">
                          Product {index + 1}
                        </span>
                      </div>
                    </div>
                    
                                         {/* Quantity Selection */}
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-center">
                       {/* Original Quantity */}
                       <div className="text-center">
                         <label className="block text-sm font-medium text-gray-700 mb-1">
                           <span className="hidden sm:inline">Original Quantity</span>
                           <span className="sm:hidden">Original Qty</span>
                         </label>
                         <div className="bg-blue-100 text-blue-800 px-2 sm:px-3 py-2 rounded-lg font-semibold text-sm">
                           {item.originalQuantity}
                         </div>
                       </div>
                       
                       {/* Return Quantity Input */}
                       <div className="text-center">
                         <label className="block text-sm font-medium text-gray-700 mb-1">
                           <span className="hidden sm:inline">Return Quantity</span>
                           <span className="sm:hidden">Return Qty</span>
                         </label>
                         <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                           <button
                             type="button"
                             onClick={() => handleReturnQuantityChange(index, Math.max(0, item.returnQuantity - 1))}
                             className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 text-sm"
                             disabled={item.returnQuantity <= 0}
                           >
                             -
                           </button>
                           <input
                             type="number"
                             min="0"
                             max={item.originalQuantity}
                             value={item.returnQuantity}
                             onChange={(e) => handleReturnQuantityChange(index, parseInt(e.target.value) || 0)}
                             className="w-12 sm:w-16 px-2 py-2 border border-gray-300 rounded-lg text-center font-semibold text-gray-900 text-sm"
                           />
                           <button
                             type="button"
                             onClick={() => handleReturnQuantityChange(index, Math.min(item.originalQuantity, item.returnQuantity + 1))}
                             className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 text-sm"
                             disabled={item.returnQuantity >= item.originalQuantity}
                           >
                             +
                           </button>
                         </div>
                         <p className="text-xs text-gray-500 mt-1">
                           Max: {item.originalQuantity}
                         </p>
                       </div>
                       
                       {/* Return Amount */}
                       <div className="text-center sm:col-span-2 lg:col-span-1">
                         <label className="block text-sm font-medium text-gray-700 mb-1">
                           <span className="hidden sm:inline">Return Amount</span>
                           <span className="sm:hidden">Amount</span>
                         </label>
                         <div className={`px-2 sm:px-3 py-2 rounded-lg font-semibold text-sm ${
                           item.returnQuantity > 0 
                             ? 'bg-orange-100 text-orange-800' 
                             : 'bg-gray-100 text-gray-500'
                         }`}>
                           #{(item.returnQuantity * item.price).toFixed(2)}
                         </div>
                       </div>
                     </div>
                    
                    {/* Progress Bar */}
                    {item.originalQuantity > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Return Progress</span>
                          <span>{Math.round((item.returnQuantity / item.originalQuantity) * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-orange-500 h-2 rounded-full transition-all duration-200"
                            style={{ width: `${(item.returnQuantity / item.originalQuantity) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Summary */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-blue-800">Products to Return:</span>
                  <span className="font-semibold text-blue-900">
                    {returnItems.filter(item => item.returnQuantity > 0).length} of {returnItems.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-6 p-4 bg-orange-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-orange-800">Total Return Amount:</span>
                <span className="text-xl font-bold text-orange-800">
                  #{calculateReturnTotal().toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  setBillToReturn(null);
                  setReturnItems([]);
                  setReturnReason("");
                }}
                disabled={returnLoading}
              >
                Cancel
              </button>
              <button
                className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleProcessReturn}
                disabled={returnLoading || calculateReturnTotal() === 0}
              >
                {returnLoading ? "Processing..." : "Process Return"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return History Modal */}
      {showReturnHistory && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Return History</h2>
              <button
                className="text-gray-400 hover:text-gray-600 text-2xl"
                onClick={() => setShowReturnHistory(false)}
              >
                &times;
              </button>
            </div>

            <GreenProgressBar loading={returnHistoryLoading}>
              {returnHistory.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  No return history found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Return Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Original Transaction
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Return Reason
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Items Returned
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Return Amount
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Processed By
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {returnHistory.map((returnRecord) => (
                        <tr key={returnRecord._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDateTime(returnRecord.returnDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {returnRecord.originalTransactionId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {returnRecord.returnReason}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {returnRecord.returnItems.length} items
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            #{returnRecord.totalReturnAmount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {returnRecord.processedBy}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </GreenProgressBar>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;

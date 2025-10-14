import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import {
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  Building2,
  Package,
  BarChart3,
} from "lucide-react";
import { api } from "../../utils/api";
import {
  exportRevenueData,
  exportStockExpirationData,
  exportStockTurnoverData,
} from "../../utils/excelExportUtils";

interface Branch {
  _id: string;
  name: string;
}

interface KPIData {
  salesCount: {
    value: number;
    change: string;
    trend: "up" | "down";
  };
  packs: {
    value: number;
    change: string;
    trend: "up" | "down";
  };
  netSalesAmount: {
    value: number;
    change: string;
    trend: "up" | "down";
  };
  grossProfit: {
    value: number;
    change: string;
    trend: "up" | "down";
  };
  operatingProfit: {
    value: number;
    change: string;
    trend: "up" | "down";
  };
}

interface ChartData {
  period: string;
  netSalesAmount: number;
  grossProfit: number;
  operatingProfit: number;
  salesCount: number;
  packs: number;
}

interface StockExpirationChartData {
  day: number;
  quantity: number;
  cost: number;
  items: number;
  uniqueCompositions: number;
  uniqueSKUs: number;
}

interface StockExpirationKPIData {
  items: {
    value: number;
    label: string;
  };
  uniqueCompositions: {
    value: number;
    label: string;
  };
  uniqueSKUs: {
    value: number;
    label: string;
  };
  quantity: {
    value: number;
    label: string;
  };
  cost: {
    value: number;
    label: string;
  };
}

interface ReportData {
  chartData: ChartData[];
  kpiData: KPIData;
  filters: {
    branchId?: string;
    startDate?: string;
    endDate?: string;
    period: string;
    includeAllBranches: boolean;
  };
}

interface StockExpirationReportData {
  chartData: StockExpirationChartData[];
  kpiData: StockExpirationKPIData;
  filters: {
    branchId?: string;
    startDate?: string;
    endDate?: string;
    includeAllBranches: boolean;
  };
}

interface StockTurnoverTableData {
  productId: string;
  segment: string;
  product: string;
  manufacturer: string;
  composition: string;
  netSalesQuantity: number;
  stockQuantity: number;
  netSalesRetailAmount: number;
  stockRetailAmount: number;
  grossProfit: number;
  stockTurnoverRate: number;
}

interface StockTurnoverKPIData {
  netSalesQuantity: {
    value: number;
    label: string;
    change: string;
    trend: "up" | "down";
  };
  netSalesRetailAmount: {
    value: number;
    label: string;
    change: string;
    trend: "up" | "down";
  };
  grossProfit: {
    value: number;
    label: string;
    change: string;
    trend: "up" | "down";
  };
}

interface StockTurnoverReportData {
  tableData: StockTurnoverTableData[];
  totals: {
    netSalesQuantity: number;
    stockQuantity: number;
    netSalesRetailAmount: number;
    stockRetailAmount: number;
    grossProfit: number;
    stockTurnoverRate: number;
  };
  kpiData: StockTurnoverKPIData;
  filters: {
    branchId?: string;
    startDate?: string;
    endDate?: string;
    includeAllBranches: boolean;
    segment?: string;
    manufacturer?: string;
  };
}

const Report: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"revenue" | "stock" | "turnover">(
    "revenue"
  );
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [stockExpirationData, setStockExpirationData] =
    useState<StockExpirationReportData | null>(null);
  const [stockTurnoverData, setStockTurnoverData] =
    useState<StockTurnoverReportData | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    branchId: "",
    startDate: "",
    endDate: "",
    groupBy: "week",
    includeAllBranches: false,
    segment: "",
    manufacturer: "",
    rangePreset: "all" as "all" | "today" | "lastWeek" | "lastMonth",
  });
  const [dateWarning, setDateWarning] = useState("");

  // Quick range preset handler
  const applyRangePreset = (
    preset: "all" | "today" | "lastWeek" | "lastMonth"
  ) => {
    const now = new Date();

    if (preset === "all") {
      setFilters((prev) => ({
        ...prev,
        rangePreset: preset,
        startDate: "",
        endDate: "",
      }));
      return;
    }

    let start: Date;
    let end: Date;

    if (preset === "today") {
      start = new Date(now);
      end = new Date(now);
    } else if (preset === "lastWeek") {
      // Previous calendar week (Mon-Sun)
      const day = now.getDay(); // 0=Sun..6=Sat
      const mondayThisWeekOffset = (day + 6) % 7; // days since Monday
      const mondayThisWeek = new Date(now);
      mondayThisWeek.setDate(now.getDate() - mondayThisWeekOffset);
      mondayThisWeek.setHours(0, 0, 0, 0);
      start = new Date(mondayThisWeek);
      start.setDate(mondayThisWeek.getDate() - 7);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
    } else {
      // Last month: first to last day of previous calendar month
      const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      start = new Date(firstOfThisMonth);
      start.setMonth(firstOfThisMonth.getMonth() - 1);
      end = new Date(firstOfThisMonth);
      end.setDate(0); // last day of previous month
    }

    const yyyyMmDd = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    setFilters((prev) => ({
      ...prev,
      rangePreset: preset,
      startDate: yyyyMmDd(start),
      endDate: yyyyMmDd(end),
    }));
  };

  // Fetch branches for filter dropdown
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await api.get("/api/report/branches");
        console.log("Branches API Response:", response);
        if (response.success) {
          setBranches(response.data);
        } else {
          console.error("Branches API Error:", response);
        }
      } catch (error) {
        console.error("Error fetching branches:", error);
      }
    };

    fetchBranches();
  }, []);

  // No default date initialization. Fetch will run without dates as overall period grouping.

  // Fetch revenue report data
  const fetchRevenueReportData = async (
    overrides?: Partial<typeof filters>
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const effective = { ...filters, ...(overrides || {}) };
      if (effective.branchId) params.append("branchId", effective.branchId);
      if (effective.startDate) params.append("startDate", effective.startDate);
      if (effective.endDate) params.append("endDate", effective.endDate);
      params.append("period", effective.groupBy);
      params.append(
        "includeAllBranches",
        effective.includeAllBranches.toString()
      );

      const response = await api.get(
        `/api/report/revenue-profit?${params.toString()}`
      );
      console.log("Revenue Report API Response:", response);
      if (response.success) {
        setReportData(response.data);
      } else {
        console.error("Revenue Report API Error:", response);
      }
    } catch (error) {
      console.error("Error fetching revenue report data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch stock expiration report data
  const fetchStockExpirationData = async (
    overrides?: Partial<typeof filters>
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const effective = { ...filters, ...(overrides || {}) };
      if (effective.branchId) params.append("branchId", effective.branchId);
      if (effective.startDate) params.append("startDate", effective.startDate);
      if (effective.endDate) params.append("endDate", effective.endDate);
      params.append(
        "includeAllBranches",
        effective.includeAllBranches.toString()
      );
      params.append("period", effective.groupBy);

      const response = await api.get(
        `/api/report/stock-expiration?${params.toString()}`
      );
      console.log("Stock Expiration API Response:", response);
      if (response.success) {
        setStockExpirationData(response.data);
      } else {
        console.error("Stock Expiration API Error:", response);
      }
    } catch (error) {
      console.error("Error fetching stock expiration data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch stock turnover report data
  const fetchStockTurnoverData = async (
    overrides?: Partial<typeof filters>
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const effective = { ...filters, ...(overrides || {}) };
      if (effective.branchId) params.append("branchId", effective.branchId);
      if (effective.startDate) params.append("startDate", effective.startDate);
      if (effective.endDate) params.append("endDate", effective.endDate);
      if (effective.segment) params.append("segment", effective.segment);
      if (effective.manufacturer)
        params.append("manufacturer", effective.manufacturer);
      params.append(
        "includeAllBranches",
        effective.includeAllBranches.toString()
      );
      params.append("period", effective.groupBy);

      const response = await api.get(
        `/api/report/stock-turnover?${params.toString()}`
      );
      console.log("Stock Turnover API Response:", response);
      if (response.success) {
        setStockTurnoverData(response.data);
      } else {
        console.error("Stock Turnover API Error:", response);
      }
    } catch (error) {
      console.error("Error fetching stock turnover data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data based on active tab
  useEffect(() => {
    const bothDatesSet = !!filters.startDate && !!filters.endDate;
    const bothDatesEmpty = !filters.startDate && !filters.endDate;
    if (bothDatesSet || bothDatesEmpty) {
      setDateWarning("");
      if (activeTab === "revenue") {
        fetchRevenueReportData();
      } else if (activeTab === "stock") {
        fetchStockExpirationData();
      } else if (activeTab === "turnover") {
        fetchStockTurnoverData();
      }
    } else {
      setDateWarning(
        "Please select both start and end date to filter by date."
      );
    }
  }, [
    filters.startDate,
    filters.endDate,
    filters.groupBy,
    filters.branchId,
    filters.includeAllBranches,
    filters.segment,
    filters.manufacturer,
    activeTab,
  ]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));

    // Immediate fetch when grouping changes
    if (key === "groupBy") {
      const overrides = { groupBy: value } as Partial<typeof filters>;
      const bothDatesSet = !!filters.startDate && !!filters.endDate;
      const bothDatesEmpty = !filters.startDate && !filters.endDate;
      if (bothDatesSet || bothDatesEmpty) {
        if (activeTab === "revenue") {
          fetchRevenueReportData(overrides);
        } else if (activeTab === "stock") {
          fetchStockExpirationData(overrides);
        } else if (activeTab === "turnover") {
          fetchStockTurnoverData(overrides);
        }
      }
    }
  };

  const handleDateRangeChange = (startDate: string, endDate: string) => {
    setFilters((prev) => ({
      ...prev,
      startDate,
      endDate,
    }));
  };

  const handleTabChange = (tab: "revenue" | "stock" | "turnover") => {
    setActiveTab(tab);
  };

  // Period change does not alter selected dates; it only changes grouping on backend

  const handleExport = async () => {
    console.log("Excel export triggered:", {
      activeTab,
      reportData: !!reportData,
      stockExpirationData: !!stockExpirationData,
      stockTurnoverData: !!stockTurnoverData,
    });
    setExporting(true);

    try {
      if (activeTab === "revenue" && reportData) {
        console.log("Exporting revenue data to Excel:", reportData);
        await exportRevenueData.toExcel(
          reportData.chartData,
          reportData.kpiData,
          filters
        );
      } else if (activeTab === "stock" && stockExpirationData) {
        console.log(
          "Exporting stock expiration data to Excel:",
          stockExpirationData
        );
        await exportStockExpirationData.toExcel(
          stockExpirationData.chartData,
          stockExpirationData.kpiData,
          filters
        );
      } else if (activeTab === "turnover" && stockTurnoverData) {
        console.log(
          "Exporting stock turnover data to Excel:",
          stockTurnoverData
        );
        await exportStockTurnoverData.toExcel(
          stockTurnoverData.tableData,
          stockTurnoverData.kpiData,
          stockTurnoverData.totals,
          filters
        );
      } else {
        console.warn("No data available for export:", {
          activeTab,
          reportData: !!reportData,
          stockExpirationData: !!stockExpirationData,
          stockTurnoverData: !!stockTurnoverData,
        });
        alert(
          "No data available for export. Please ensure data is loaded and try again."
        );
        return;
      }
      console.log("Excel export completed successfully");
    } catch (error) {
      console.error("Excel export error:", error);
      alert("Export failed. Please check the console for details.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">
            Comprehensive business analytics and insights
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4 mr-2" />
          {exporting ? "Exporting..." : "Export to Excel"}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          <button
            onClick={() => handleTabChange("revenue")}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === "revenue"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Revenue and Profit
            </div>
          </button>
          <button
            onClick={() => handleTabChange("stock")}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === "stock"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center">
              <Package className="h-4 w-4 mr-2" />
              Stock and Expiration Dates
            </div>
          </button>
          <button
            onClick={() => handleTabChange("turnover")}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === "turnover"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Stock Turnover
            </div>
          </button>
        </nav>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center mb-4">
          <Filter className="h-5 w-5 text-gray-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Chain/Branch Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chain
            </label>
            <select
              value={filters.branchId}
              onChange={(e) => {
                const value = e.target.value;
                handleFilterChange("branchId", value);
                if (value) {
                  // Auto-uncheck 'All Branches' if a branch is selected
                  handleFilterChange("includeAllBranches", false);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={filters.includeAllBranches}
            >
              <option value="">All Branches</option>
              {branches.map((branch) => (
                <option key={branch._id} value={branch._id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Date Ranges */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date range
            </label>
            <select
              value={filters.rangePreset}
              onChange={(e) => applyRangePreset(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="lastWeek">Last week</option>
              <option value="lastMonth">Last month</option>
            </select>
          </div>

          {/* Segment Filter - Only show for Stock Turnover tab */}
          {activeTab === "turnover" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Segment
              </label>
              <select
                value={filters.segment}
                onChange={(e) => handleFilterChange("segment", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Segments</option>
                <option value="Prescription">Prescription</option>
                <option value="OTC">OTC</option>
                <option value="Supplements">Supplements</option>
                <option value="Medical Devices">Medical Devices</option>
              </select>
            </div>
          )}

          {/* Manufacturer Filter - Only show for Stock Turnover tab */}
          {activeTab === "turnover" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Manufacturer
              </label>
              <input
                type="text"
                value={filters.manufacturer}
                onChange={(e) =>
                  handleFilterChange("manufacturer", e.target.value)
                }
                placeholder="Filter by manufacturer"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {activeTab === "revenue"
                ? "Start Date"
                : activeTab === "stock"
                ? "Expiry Start Date"
                : "Sales Start Date"}
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                handleDateRangeChange(e.target.value, filters.endDate)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {activeTab === "revenue"
                ? "End Date"
                : activeTab === "stock"
                ? "Expiry End Date"
                : "Sales End Date"}
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                handleDateRangeChange(filters.startDate, e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {dateWarning && (
            <div className="col-span-full text-red-600 text-sm mt-2">
              {dateWarning}
            </div>
          )}

          {/* Include All Branches Toggle */}
          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.includeAllBranches}
                onChange={(e) => {
                  handleFilterChange("includeAllBranches", e.target.checked);
                  if (e.target.checked) {
                    // Clear branch selection if 'All Branches' is checked
                    handleFilterChange("branchId", "");
                  }
                }}
                className="mr-2"
                disabled={!!filters.branchId}
              />
              <span className="text-sm font-medium text-gray-700">
                All Branches
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "revenue" ? (
        <RevenueProfitContent
          reportData={reportData}
          period={filters.groupBy}
          filters={filters}
          stockExpirationData={stockExpirationData}
          stockTurnoverData={stockTurnoverData}
        />
      ) : activeTab === "stock" ? (
        <StockExpirationContent
          stockExpirationData={stockExpirationData}
          filters={filters}
          reportData={reportData}
          stockTurnoverData={stockTurnoverData}
        />
      ) : (
        <StockTurnoverContent
          stockTurnoverData={stockTurnoverData}
          filters={filters}
          reportData={reportData}
          stockExpirationData={stockExpirationData}
        />
      )}
    </div>
  );
};

// Revenue and Profit Content Component
const RevenueProfitContent: React.FC<{
  reportData: ReportData | null;
  period?: string;
  filters: any;
  stockExpirationData: any;
  stockTurnoverData: any;
}> = ({
  reportData,
  period = "week",
  filters,
  stockExpirationData,
  stockTurnoverData,
}) => {
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  const formatCurrency = (num: number): string => {
    return `#${num.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const getTrendIcon = (trend: "up" | "down") => {
    return trend === "up" ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  const getTrendColor = (trend: "up" | "down") => {
    return trend === "up" ? "text-green-600" : "text-red-600";
  };

  return (
    <>
      {/* KPI Cards */}
      {reportData && reportData.kpiData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* Sales Count */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sales count</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(reportData.kpiData.salesCount.value)}
                </p>
              </div>
              <div className="flex items-center">
                {getTrendIcon(reportData.kpiData.salesCount.trend)}
                <span
                  className={`ml-1 text-sm font-medium ${getTrendColor(
                    reportData.kpiData.salesCount.trend
                  )}`}
                >
                  {reportData.kpiData.salesCount.change}%
                </span>
              </div>
            </div>
          </div>

          {/* Packs */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Packs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(reportData.kpiData.packs.value)}
                </p>
              </div>
              <div className="flex items-center">
                {getTrendIcon(reportData.kpiData.packs.trend)}
                <span
                  className={`ml-1 text-sm font-medium ${getTrendColor(
                    reportData.kpiData.packs.trend
                  )}`}
                >
                  {reportData.kpiData.packs.change}%
                </span>
              </div>
            </div>
          </div>

          {/* Net Sales Amount */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Net sales amount
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(reportData.kpiData.netSalesAmount.value)}
                </p>
              </div>
              <div className="flex items-center">
                {getTrendIcon(reportData.kpiData.netSalesAmount.trend)}
                <span
                  className={`ml-1 text-sm font-medium ${getTrendColor(
                    reportData.kpiData.netSalesAmount.trend
                  )}`}
                >
                  {reportData.kpiData.netSalesAmount.change}%
                </span>
              </div>
            </div>
          </div>

          {/* Gross Profit */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Gross profit
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(reportData.kpiData.grossProfit.value)}
                </p>
              </div>
              <div className="flex items-center">
                {getTrendIcon(reportData.kpiData.grossProfit.trend)}
                <span
                  className={`ml-1 text-sm font-medium ${getTrendColor(
                    reportData.kpiData.grossProfit.trend
                  )}`}
                >
                  {reportData.kpiData.grossProfit.change}%
                </span>
              </div>
            </div>
          </div>

          {/* Operating Profit */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Operating profit
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(reportData.kpiData.operatingProfit.value)}
                </p>
              </div>
              <div className="flex items-center">
                {getTrendIcon(reportData.kpiData.operatingProfit.trend)}
                <span
                  className={`ml-1 text-sm font-medium ${getTrendColor(
                    reportData.kpiData.operatingProfit.trend
                  )}`}
                >
                  {reportData.kpiData.operatingProfit.change}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      {reportData &&
        reportData.chartData &&
        reportData.chartData.length > 0 && (
          <div
            id="revenue-chart-container"
            className="bg-white p-6 rounded-lg shadow-sm border"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Revenue and Profit Trends
            </h3>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                <span className="text-sm text-gray-600">Net sales amount</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-teal-500 rounded mr-2"></div>
                <span className="text-sm text-gray-600">Gross profit</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-orange-500 rounded mr-2"></div>
                <span className="text-sm text-gray-600">Operating profit</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-0.5 bg-yellow-500 mr-2"></div>
                <span className="text-sm text-gray-600">Packs</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-0.5 bg-green-500 mr-2"></div>
                <span className="text-sm text-gray-600">Sales count</span>
              </div>
            </div>

            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={reportData.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      if (period === "day") {
                        return date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        });
                      } else if (period === "week") {
                        // Calculate week number
                        const startOfYear = new Date(date.getFullYear(), 0, 1);
                        const days = Math.floor(
                          (date.getTime() - startOfYear.getTime()) /
                            (24 * 60 * 60 * 1000)
                        );
                        const weekNumber = Math.ceil(
                          (days + startOfYear.getDay() + 1) / 7
                        );
                        return `Week ${weekNumber}`;
                      } else {
                        return date.toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        });
                      }
                    }}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => formatNumber(value)}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      if (
                        name === "netSalesAmount" ||
                        name === "grossProfit" ||
                        name === "operatingProfit"
                      ) {
                        return [formatCurrency(Number(value)), name];
                      }
                      return [formatNumber(Number(value)), name];
                    }}
                    labelFormatter={(label) => `Period: ${label}`}
                  />
                  <Legend />

                  {/* Bar Charts */}
                  <Bar
                    yAxisId="left"
                    dataKey="netSalesAmount"
                    fill="#3B82F6"
                    name="Net sales amount"
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="grossProfit"
                    fill="#14B8A6"
                    name="Gross profit"
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="operatingProfit"
                    fill="#F97316"
                    name="Operating profit"
                  />

                  {/* Line Charts */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="packs"
                    stroke="#EAB308"
                    strokeWidth={2}
                    name="Packs"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="salesCount"
                    stroke="#22C55E"
                    strokeWidth={2}
                    name="Sales count"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      {/* No Data State */}
      {reportData &&
        reportData.chartData &&
        reportData.chartData.length === 0 && (
          <div className="bg-white p-12 rounded-lg shadow-sm border text-center">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Data Available
            </h3>
            <p className="text-gray-600">
              No transaction data found for the selected filters.
            </p>
          </div>
        )}
      {filters.branchId &&
        !filters.includeAllBranches &&
        ((reportData &&
          reportData.chartData &&
          reportData.chartData.length === 0) ||
          (stockExpirationData &&
            stockExpirationData.chartData &&
            stockExpirationData.chartData.length === 0) ||
          (stockTurnoverData &&
            stockTurnoverData.tableData &&
            stockTurnoverData.tableData.length === 0)) && (
          <div className="col-span-full text-yellow-600 text-sm mt-2">
            No data found for the selected branch. Try selecting 'All Branches'
            to see if data is available for other branches.
          </div>
        )}
    </>
  );
};

// Stock and Expiration Dates Content Component
const StockExpirationContent: React.FC<{
  stockExpirationData: StockExpirationReportData | null;
  filters: any;
  reportData: any;
  stockTurnoverData: any;
}> = ({ stockExpirationData, filters, reportData, stockTurnoverData }) => {
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  const formatCurrency = (num: number): string => {
    return `#${num.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  return (
    <>
      {/* KPI Cards */}
      {stockExpirationData && stockExpirationData.kpiData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Items */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Items</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(stockExpirationData.kpiData.items.value)}
                </p>
              </div>
            </div>
          </div>

          {/* Unique Compositions */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Unique compositions
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(
                    stockExpirationData.kpiData.uniqueCompositions.value
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Unique SKUs */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unique SKUs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(stockExpirationData.kpiData.uniqueSKUs.value)}
                </p>
              </div>
            </div>
          </div>

          {/* Quantity */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Quantity</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(stockExpirationData.kpiData.quantity.value)}
                </p>
              </div>
            </div>
          </div>

          {/* Cost */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cost</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stockExpirationData.kpiData.cost.value)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      {stockExpirationData &&
        stockExpirationData.chartData &&
        stockExpirationData.chartData.length > 0 && (
          <div
            id="stock-chart-container"
            className="bg-white p-6 rounded-lg shadow-sm border"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Stock and Expiration Date Analysis
            </h3>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-600 rounded mr-2"></div>
                <span className="text-sm text-gray-600">Quantity</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-cyan-500 rounded mr-2"></div>
                <span className="text-sm text-gray-600">Cost</span>
              </div>
            </div>

            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stockExpirationData.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      if (value < 0) {
                        return `${Math.abs(value)} days expired`;
                      } else if (value === 0) {
                        return "Today";
                      } else {
                        return `${value} days`;
                      }
                    }}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => formatNumber(value)}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === "cost") {
                        return [formatCurrency(Number(value)), name];
                      }
                      return [formatNumber(Number(value)), name];
                    }}
                    labelFormatter={(label) => {
                      if (label < 0) {
                        return `${Math.abs(label)} days expired`;
                      } else if (label === 0) {
                        return "Today";
                      } else {
                        return `${label} days until expiry`;
                      }
                    }}
                  />
                  <Legend />

                  {/* Bar Charts */}
                  <Bar
                    yAxisId="left"
                    dataKey="quantity"
                    fill="#2563EB"
                    name="Quantity"
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="cost"
                    fill="#06B6D4"
                    name="Cost"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      {/* No Data State */}
      {stockExpirationData &&
        stockExpirationData.chartData &&
        stockExpirationData.chartData.length === 0 && (
          <div className="bg-white p-12 rounded-lg shadow-sm border text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Data Available
            </h3>
            <p className="text-gray-600">
              No inventory data found for the selected filters.
            </p>
          </div>
        )}
      {filters.branchId &&
        !filters.includeAllBranches &&
        ((reportData &&
          reportData.chartData &&
          reportData.chartData.length === 0) ||
          (stockExpirationData &&
            stockExpirationData.chartData &&
            stockExpirationData.chartData.length === 0) ||
          (stockTurnoverData &&
            stockTurnoverData.tableData &&
            stockTurnoverData.tableData.length === 0)) && (
          <div className="col-span-full text-yellow-600 text-sm mt-2">
            No data found for the selected branch. Try selecting 'All Branches'
            to see if data is available for other branches.
          </div>
        )}
    </>
  );
};

// Stock Turnover Content Component
const StockTurnoverContent: React.FC<{
  stockTurnoverData: StockTurnoverReportData | null;
  filters: any;
  reportData: any;
  stockExpirationData: any;
}> = ({ stockTurnoverData, filters, reportData, stockExpirationData }) => {
  const [sortField, setSortField] =
    useState<keyof StockTurnoverTableData>("stockTurnoverRate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toFixed(2);
  };

  const formatCurrency = (num: number): string => {
    return `${num.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const getTrendIcon = (trend: "up" | "down") => {
    return trend === "up" ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  const getTrendColor = (trend: "up" | "down") => {
    return trend === "up" ? "text-green-600" : "text-red-600";
  };

  const handleSort = (field: keyof StockTurnoverTableData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedData = stockTurnoverData?.tableData
    ? [...stockTurnoverData.tableData].sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];

        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortDirection === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
        }

        return 0;
      })
    : [];

  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  return (
    <>
      {/* KPI Cards */}
      {stockTurnoverData && stockTurnoverData.kpiData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Net Sales Quantity */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Net sales quantity
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(
                    stockTurnoverData.kpiData.netSalesQuantity.value
                  )}
                </p>
              </div>
              <div className="flex items-center">
                {getTrendIcon(stockTurnoverData.kpiData.netSalesQuantity.trend)}
                <span
                  className={`ml-1 text-sm font-medium ${getTrendColor(
                    stockTurnoverData.kpiData.netSalesQuantity.trend
                  )}`}
                >
                  {stockTurnoverData.kpiData.netSalesQuantity.change}
                </span>
              </div>
            </div>
          </div>

          {/* Net Sales Retail Amount */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Net sales retail amount
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    stockTurnoverData.kpiData.netSalesRetailAmount.value
                  )}
                </p>
              </div>
              <div className="flex items-center">
                {getTrendIcon(
                  stockTurnoverData.kpiData.netSalesRetailAmount.trend
                )}
                <span
                  className={`ml-1 text-sm font-medium ${getTrendColor(
                    stockTurnoverData.kpiData.netSalesRetailAmount.trend
                  )}`}
                >
                  {stockTurnoverData.kpiData.netSalesRetailAmount.change}
                </span>
              </div>
            </div>
          </div>

          {/* Gross Profit */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Gross profit
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stockTurnoverData.kpiData.grossProfit.value)}
                </p>
              </div>
              <div className="flex items-center">
                {getTrendIcon(stockTurnoverData.kpiData.grossProfit.trend)}
                <span
                  className={`ml-1 text-sm font-medium ${getTrendColor(
                    stockTurnoverData.kpiData.grossProfit.trend
                  )}`}
                >
                  {stockTurnoverData.kpiData.grossProfit.change}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      {stockTurnoverData &&
        stockTurnoverData.tableData &&
        stockTurnoverData.tableData.length > 0 && (
          <div
            id="turnover-table-container"
            className="bg-white rounded-lg shadow-sm border overflow-hidden"
          >
            <div className="bg-green-600 px-6 py-3">
              <h3 className="text-lg font-semibold text-white">
                Stock Turnover Report
              </h3>
            </div>

            {/* Responsive Table Container */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("segment")}
                    >
                      Segment
                      {sortField === "segment" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("product")}
                    >
                      Product
                      {sortField === "product" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("manufacturer")}
                    >
                      Manufacturer
                      {sortField === "manufacturer" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </th>
                    <th
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("netSalesQuantity")}
                    >
                      Net sales quantity
                      {sortField === "netSalesQuantity" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </th>
                    <th
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("stockQuantity")}
                    >
                      Stock quantity
                      {sortField === "stockQuantity" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </th>
                    <th
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("netSalesRetailAmount")}
                    >
                      Net sales retail amount
                      {sortField === "netSalesRetailAmount" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </th>
                    <th
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("stockRetailAmount")}
                    >
                      Stock retail amount
                      {sortField === "stockRetailAmount" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </th>
                    <th
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("grossProfit")}
                    >
                      Gross profit
                      {sortField === "grossProfit" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </th>
                    <th
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("stockTurnoverRate")}
                    >
                      Stock turnover rate
                      {sortField === "stockTurnoverRate" && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedData.map((item, index) => (
                    <tr
                      key={item.productId}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.segment}
                      </td>
                      <td
                        className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate"
                        title={item.product}
                      >
                        {item.product}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.manufacturer}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {item.netSalesQuantity > 0
                          ? formatNumber(item.netSalesQuantity)
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right bg-blue-50">
                        {formatNumber(item.stockQuantity)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {item.netSalesRetailAmount > 0
                          ? formatCurrency(item.netSalesRetailAmount)
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(item.stockRetailAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {item.grossProfit > 0
                          ? formatCurrency(item.grossProfit)
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatNumber(item.stockTurnoverRate)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Grand Total Row */}
                {stockTurnoverData.totals && (
                  <tfoot className="bg-gray-100">
                    <tr className="font-semibold">
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        colSpan={3}
                      >
                        Grand total
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatNumber(
                          stockTurnoverData.totals.netSalesQuantity
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatNumber(stockTurnoverData.totals.stockQuantity)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(
                          stockTurnoverData.totals.netSalesRetailAmount
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(
                          stockTurnoverData.totals.stockRetailAmount
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(stockTurnoverData.totals.grossProfit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatNumber(
                          stockTurnoverData.totals.stockTurnoverRate
                        )}
                        %
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{" "}
                      <span className="font-medium">
                        {(currentPage - 1) * itemsPerPage + 1}
                      </span>{" "}
                      to{" "}
                      <span className="font-medium">
                        {Math.min(
                          currentPage * itemsPerPage,
                          sortedData.length
                        )}
                      </span>{" "}
                      of{" "}
                      <span className="font-medium">{sortedData.length}</span>{" "}
                      results
                    </p>
                  </div>
                  <div>
                    <nav
                      className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                      aria-label="Pagination"
                    >
                      <button
                        onClick={() =>
                          setCurrentPage(Math.max(1, currentPage - 1))
                        }
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() =>
                          setCurrentPage(Math.min(totalPages, currentPage + 1))
                        }
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      {/* No Data State */}
      {stockTurnoverData &&
        stockTurnoverData.tableData &&
        stockTurnoverData.tableData.length === 0 && (
          <div className="bg-white p-12 rounded-lg shadow-sm border text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Data Available
            </h3>
            <p className="text-gray-600">
              No stock turnover data found for the selected filters.
            </p>
          </div>
        )}
      {filters.branchId &&
        !filters.includeAllBranches &&
        ((reportData &&
          reportData.chartData &&
          reportData.chartData.length === 0) ||
          (stockExpirationData &&
            stockExpirationData.chartData &&
            stockExpirationData.chartData.length === 0) ||
          (stockTurnoverData &&
            stockTurnoverData.tableData &&
            stockTurnoverData.tableData.length === 0)) && (
          <div className="col-span-full text-yellow-600 text-sm mt-2">
            No data found for the selected branch. Try selecting 'All Branches'
            to see if data is available for other branches.
          </div>
        )}
    </>
  );
};

export default Report;

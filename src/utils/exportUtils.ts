import jsPDF from "jspdf";
import "jspdf-autotable";

// Extend jsPDF type to include autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface ExportData {
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
  status: string;
  branchName?: string;
}

export interface ExportFilters {
  dateRange?: string;
  selectedDate?: string;
  customDateRange?: {
    startDate: string;
    endDate: string;
  };
  selectedStatus?: string;
  selectedBranch?: string;
  searchTerm?: string;
}

export const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes.toString().padStart(2, '0');
  const formattedDate = date.toLocaleDateString();
  
  return `${formattedDate} ${formattedHours}:${formattedMinutes} ${ampm}`;
};

export const getDateRangeDescription = (filters: ExportFilters) => {
  const now = new Date();
  
  if (filters.selectedDate) {
    return `Date: ${new Date(filters.selectedDate).toLocaleDateString()}`;
  }
  
  if (filters.customDateRange?.startDate && filters.customDateRange?.endDate) {
    return `Custom Range: ${new Date(filters.customDateRange.startDate).toLocaleDateString()} - ${new Date(filters.customDateRange.endDate).toLocaleDateString()}`;
  }
  
  if (filters.dateRange === "today") {
    return "Today";
  }
  
  if (filters.dateRange && !isNaN(parseInt(filters.dateRange))) {
    return `Last ${filters.dateRange} days`;
  }
  
  return "All Time";
};

export const generatePDFReport = (
  data: ExportData[],
  title: string,
  filters: ExportFilters,
  isAdmin: boolean = false
) => {
  const doc = new jsPDF();
  
  // Add header
  doc.setFontSize(20);
  doc.text(title, 14, 22);
  
  // Add report info
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
  doc.text(`Date Range: ${getDateRangeDescription(filters)}`, 14, 36);
  
  if (filters.selectedStatus && filters.selectedStatus !== "All") {
    doc.text(`Status: ${filters.selectedStatus}`, 14, 42);
  }
  
  if (filters.selectedBranch && filters.selectedBranch !== "All") {
    doc.text(`Branch: ${filters.selectedBranch}`, 14, 48);
  }
  
  if (filters.searchTerm) {
    doc.text(`Search: ${filters.searchTerm}`, 14, 54);
  }
  
  // Calculate summary
  const totalAmount = data.reduce((sum, item) => sum + item.total, 0);
  const completedCount = data.filter(item => item.status === "Completed" || item.status === "Paid").length;
  const pendingCount = data.filter(item => item.status === "Pending").length;
  
  doc.text(`Total Records: ${data.length}`, 14, 60);
  doc.text(`Total Amount: #${totalAmount.toFixed(2)}`, 14, 66);
  doc.text(`Completed: ${completedCount}`, 14, 72);
  doc.text(`Pending: ${pendingCount}`, 14, 78);
  
  // Prepare table data
  const tableData = data.map(item => {
    const itemsText = item.items.map(i => `${i.name} (${i.quantity})`).join(", ");
    const truncatedItems = itemsText.length > 50 ? itemsText.substring(0, 50) + "..." : itemsText;
    
    const baseRow = [
      item.id.substring(0, 12) + "...",
      formatDateTime(item.date),
      item.customer,
      truncatedItems,
      `#${item.total.toFixed(2)}`,
      item.paymentMethod,
      item.status
    ];
    
    if (isAdmin && item.branchName) {
      baseRow.splice(3, 0, item.branchName);
    }
    
    return baseRow;
  });
  
  // Define columns
  const columns = [
    "ID",
    "Date & Time",
    "Customer",
    ...(isAdmin ? ["Branch"] : []),
    "Items",
    "Total",
    "Payment",
    "Status"
  ];
  
  // Add table
  doc.autoTable({
    head: [columns],
    body: tableData,
    startY: 85,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 30 },
      2: { cellWidth: 25 },
      ...(isAdmin ? { 3: { cellWidth: 20 } } : {}),
      [isAdmin ? 4 : 3]: { cellWidth: 40 },
      [isAdmin ? 5 : 4]: { cellWidth: 20 },
      [isAdmin ? 6 : 5]: { cellWidth: 20 },
      [isAdmin ? 7 : 6]: { cellWidth: 20 },
    },
    margin: { top: 85, left: 14, right: 14 },
  });
  
  // Add footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width - 30,
      doc.internal.pageSize.height - 10
    );
  }
  
  return doc;
};

export const generateExcelReport = (
  data: ExportData[],
  title: string,
  filters: ExportFilters,
  isAdmin: boolean = false
) => {
  // Create CSV content
  const columns = [
    "Transaction ID",
    "Date & Time",
    "Customer",
    ...(isAdmin ? ["Branch"] : []),
    "Items",
    "Total Amount",
    "Payment Method",
    "Status"
  ];
  
  const csvContent = [
    columns.join(","),
    ...data.map(item => {
      const itemsText = item.items.map(i => `"${i.name} (Qty: ${i.quantity}, Price: #${i.price})"`).join("; ");
      const baseRow = [
        `"${item.id}"`,
        `"${formatDateTime(item.date)}"`,
        `"${item.customer}"`,
        ...(isAdmin && item.branchName ? [`"${item.branchName}"`] : []),
        `"${itemsText}"`,
        `"#${item.total.toFixed(2)}"`,
        `"${item.paymentMethod}"`,
        `"${item.status}"`
      ];
      return baseRow.join(",");
    })
  ].join("\n");
  
  // Add metadata at the top
  const metadata = [
    `Report: ${title}`,
    `Generated: ${new Date().toLocaleString()}`,
    `Date Range: ${getDateRangeDescription(filters)}`,
    ...(filters.selectedStatus && filters.selectedStatus !== "All" ? [`Status: ${filters.selectedStatus}`] : []),
    ...(filters.selectedBranch && filters.selectedBranch !== "All" ? [`Branch: ${filters.selectedBranch}`] : []),
    ...(filters.searchTerm ? [`Search: ${filters.searchTerm}`] : []),
    `Total Records: ${data.length}`,
    `Total Amount: #${data.reduce((sum, item) => sum + item.total, 0).toFixed(2)}`,
    "",
    ""
  ].join("\n");
  
  return metadata + csvContent;
};

export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const downloadPDF = (doc: jsPDF, filename: string) => {
  doc.save(filename);
};

export const downloadExcel = (csvContent: string, filename: string) => {
  downloadFile(csvContent, filename, "text/csv;charset=utf-8;");
};

export const generateReportFilename = (
  baseName: string,
  filters: ExportFilters,
  format: "pdf" | "xlsx" = "pdf"
) => {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 10);
  
  let dateSuffix = "";
  if (filters.selectedDate) {
    dateSuffix = `_${filters.selectedDate}`;
  } else if (filters.customDateRange?.startDate && filters.customDateRange?.endDate) {
    dateSuffix = `_${filters.customDateRange.startDate}_to_${filters.customDateRange.endDate}`;
  } else if (filters.dateRange === "today") {
    dateSuffix = `_today`;
  } else if (filters.dateRange && !isNaN(parseInt(filters.dateRange))) {
    dateSuffix = `_last_${filters.dateRange}_days`;
  }
  
  const extension = format === "pdf" ? "pdf" : "csv";
  return `${baseName}${dateSuffix}_${timestamp}.${extension}`;
};

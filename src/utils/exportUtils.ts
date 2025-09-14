import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

export type ExportFormat = 'csv' | 'excel' | 'pdf';

// Legacy exports for TransactionHistory.tsx compatibility
export interface ExportData {
  [key: string]: any;
}

export interface ExportFilters {
  [key: string]: any;
}

export const generateExcelReport = (data: ExportData[], filename: string) => {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  XLSX.writeFile(workbook, filename);
};

export const downloadExcel = (data: ExportData[], filename: string) => {
  generateExcelReport(data, filename);
};

export const generateReportFilename = (prefix: string, extension: string = 'xlsx') => {
  const date = new Date().toISOString().split('T')[0];
  return `${prefix}-${date}.${extension}`;
};

const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toFixed(2);
};

export const exportRevenueData = {
  toCSV: (data: any[], kpiData: any, filters: any) => {
    console.log('Exporting revenue CSV:', { data, kpiData, filters });
    const csvData = [
      ['Revenue and Profit Report'],
      [`Generated: ${new Date().toLocaleString()}`],
      [`Period: ${filters.period}`],
      [`Date Range: ${filters.startDate} to ${filters.endDate}`],
      [`Branch: ${filters.includeAllBranches ? 'All Branches' : 'Selected Branch'}`],
      [],
      ['KPI Summary'],
      ['Metric', 'Value', 'Change', 'Trend'],
      ['Sales Count', kpiData.salesCount.value.toString(), kpiData.salesCount.change, kpiData.salesCount.trend],
      ['Packs', kpiData.packs.value.toString(), kpiData.packs.change, kpiData.packs.trend],
      ['Net Sales Amount', formatCurrency(kpiData.netSalesAmount.value), kpiData.netSalesAmount.change, kpiData.netSalesAmount.trend],
      ['Gross Profit', formatCurrency(kpiData.grossProfit.value), kpiData.grossProfit.change, kpiData.grossProfit.trend],
      ['Expenses', formatCurrency(kpiData.expenses.value), kpiData.expenses.change, kpiData.expenses.trend],
      ['Operating Profit', formatCurrency(kpiData.operatingProfit.value), kpiData.operatingProfit.change, kpiData.operatingProfit.trend],
      [],
      ['Period Data'],
      ['Period', 'Net Sales Amount', 'Gross Profit', 'Expenses', 'Operating Profit', 'Sales Count', 'Packs'],
      ...data.map(item => [
        item.period,
        formatCurrency(item.netSalesAmount),
        formatCurrency(item.grossProfit),
        formatCurrency(item.expenses),
        formatCurrency(item.operatingProfit),
        item.salesCount.toString(),
        item.packs.toString()
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    console.log('CSV content generated:', csvContent.substring(0, 200) + '...');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    console.log('Blob created:', blob);
    const filename = `revenue-profit-report-${new Date().toISOString().split('T')[0]}.csv`;
    console.log('Saving file:', filename);
    
    // Use native download approach
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  toExcel: (data: any[], kpiData: any, filters: any) => {
    const workbook = XLSX.utils.book_new();

    const kpiSheetData = [
      ['Revenue and Profit Report - KPI Summary'],
      [`Generated: ${new Date().toLocaleString()}`],
      [`Period: ${filters.period}`],
      [`Date Range: ${filters.startDate} to ${filters.endDate}`],
      [`Branch: ${filters.includeAllBranches ? 'All Branches' : 'Selected Branch'}`],
      [],
      ['Metric', 'Value', 'Change', 'Trend'],
      ['Sales Count', kpiData.salesCount.value, kpiData.salesCount.change, kpiData.salesCount.trend],
      ['Packs', kpiData.packs.value, kpiData.packs.change, kpiData.packs.trend],
      ['Net Sales Amount', kpiData.netSalesAmount.value, kpiData.netSalesAmount.change, kpiData.netSalesAmount.trend],
      ['Gross Profit', kpiData.grossProfit.value, kpiData.grossProfit.change, kpiData.grossProfit.trend],
      ['Expenses', kpiData.expenses.value, kpiData.expenses.change, kpiData.expenses.trend],
      ['Operating Profit', kpiData.operatingProfit.value, kpiData.operatingProfit.change, kpiData.operatingProfit.trend]
    ];

    const kpiSheet = XLSX.utils.aoa_to_sheet(kpiSheetData);
    XLSX.utils.book_append_sheet(workbook, kpiSheet, 'KPI Summary');

    const periodSheetData = [
      ['Period', 'Net Sales Amount', 'Gross Profit', 'Expenses', 'Operating Profit', 'Sales Count', 'Packs'],
      ...data.map(item => [
        item.period,
        item.netSalesAmount,
        item.grossProfit,
        item.expenses,
        item.operatingProfit,
        item.salesCount,
        item.packs
      ])
    ];

    const periodSheet = XLSX.utils.aoa_to_sheet(periodSheetData);
    XLSX.utils.book_append_sheet(workbook, periodSheet, 'Period Data');

    const filename = `revenue-profit-report-${new Date().toISOString().split('T')[0]}.xlsx`;
    console.log('Saving Excel file:', filename);
    XLSX.writeFile(workbook, filename);
  },

  toPDF: async (elementId: string, title: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`${title}-${new Date().toISOString().split('T')[0]}.pdf`);
  }
};

export const exportStockExpirationData = {
  toCSV: (data: any[], kpiData: any, filters: any) => {
    const csvData = [
      ['Stock and Expiration Date Report'],
      [`Generated: ${new Date().toLocaleString()}`],
      [`Date Range: ${filters.startDate} to ${filters.endDate}`],
      [`Branch: ${filters.includeAllBranches ? 'All Branches' : 'Selected Branch'}`],
      [],
      ['KPI Summary'],
      ['Metric', 'Value'],
      ['Items', kpiData.items.value.toString()],
      ['Unique Compositions', kpiData.uniqueCompositions.value.toString()],
      ['Unique SKUs', kpiData.uniqueSKUs.value.toString()],
      ['Quantity', formatNumber(kpiData.quantity.value)],
      ['Cost', formatCurrency(kpiData.cost.value)],
      [],
      ['Expiration Data'],
      ['Days Until Expiry', 'Quantity', 'Cost', 'Items', 'Unique Compositions', 'Unique SKUs'],
      ...data.map(item => [
        item.day < 0 ? `${Math.abs(item.day)} days expired` : item.day === 0 ? 'Today' : `${item.day} days`,
        formatNumber(item.quantity),
        formatCurrency(item.cost),
        item.items.toString(),
        item.uniqueCompositions.toString(),
        item.uniqueSKUs.toString()
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = `stock-expiration-report-${new Date().toISOString().split('T')[0]}.csv`;
    
    // Use native download approach
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  toExcel: (data: any[], kpiData: any, filters: any) => {
    const workbook = XLSX.utils.book_new();

    const kpiSheetData = [
      ['Stock and Expiration Date Report - KPI Summary'],
      [`Generated: ${new Date().toLocaleString()}`],
      [`Date Range: ${filters.startDate} to ${filters.endDate}`],
      [`Branch: ${filters.includeAllBranches ? 'All Branches' : 'Selected Branch'}`],
      [],
      ['Metric', 'Value'],
      ['Items', kpiData.items.value],
      ['Unique Compositions', kpiData.uniqueCompositions.value],
      ['Unique SKUs', kpiData.uniqueSKUs.value],
      ['Quantity', kpiData.quantity.value],
      ['Cost', kpiData.cost.value]
    ];

    const kpiSheet = XLSX.utils.aoa_to_sheet(kpiSheetData);
    XLSX.utils.book_append_sheet(workbook, kpiSheet, 'KPI Summary');

    const expirationSheetData = [
      ['Days Until Expiry', 'Quantity', 'Cost', 'Items', 'Unique Compositions', 'Unique SKUs'],
      ...data.map(item => [
        item.day < 0 ? `${Math.abs(item.day)} days expired` : item.day === 0 ? 'Today' : `${item.day} days`,
        item.quantity,
        item.cost,
        item.items,
        item.uniqueCompositions,
        item.uniqueSKUs
      ])
    ];

    const expirationSheet = XLSX.utils.aoa_to_sheet(expirationSheetData);
    XLSX.utils.book_append_sheet(workbook, expirationSheet, 'Expiration Data');

    XLSX.writeFile(workbook, `stock-expiration-report-${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  toPDF: async (elementId: string, title: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`${title}-${new Date().toISOString().split('T')[0]}.pdf`);
  }
};

export const exportStockTurnoverData = {
  toCSV: (data: any[], kpiData: any, totals: any, filters: any) => {
    const csvData = [
      ['Stock Turnover Report'],
      [`Generated: ${new Date().toLocaleString()}`],
      [`Date Range: ${filters.startDate} to ${filters.endDate}`],
      [`Branch: ${filters.includeAllBranches ? 'All Branches' : 'Selected Branch'}`],
      [`Segment: ${filters.segment || 'All Segments'}`],
      [`Manufacturer: ${filters.manufacturer || 'All Manufacturers'}`],
      [],
      ['KPI Summary'],
      ['Metric', 'Value', 'Change', 'Trend'],
      ['Net Sales Quantity', kpiData.netSalesQuantity.value.toString(), kpiData.netSalesQuantity.change, kpiData.netSalesQuantity.trend],
      ['Net Sales Retail Amount', formatCurrency(kpiData.netSalesRetailAmount.value), kpiData.netSalesRetailAmount.change, kpiData.netSalesRetailAmount.trend],
      ['Gross Profit', formatCurrency(kpiData.grossProfit.value), kpiData.grossProfit.change, kpiData.grossProfit.trend],
      [],
      ['Grand Totals'],
      ['Net Sales Quantity', totals.netSalesQuantity.toString()],
      ['Stock Quantity', totals.stockQuantity.toString()],
      ['Net Sales Retail Amount', formatCurrency(totals.netSalesRetailAmount)],
      ['Stock Retail Amount', formatCurrency(totals.stockRetailAmount)],
      ['Gross Profit', formatCurrency(totals.grossProfit)],
      ['Stock Turnover Rate', `${totals.stockTurnoverRate.toFixed(2)}%`],
      [],
      ['Product Details'],
      ['Segment', 'Product', 'Manufacturer', 'Net Sales Quantity', 'Stock Quantity', 'Net Sales Retail Amount', 'Stock Retail Amount', 'Gross Profit', 'Stock Turnover Rate'],
      ...data.map(item => [
        item.segment,
        item.product,
        item.manufacturer,
        item.netSalesQuantity.toString(),
        item.stockQuantity.toString(),
        formatCurrency(item.netSalesRetailAmount),
        formatCurrency(item.stockRetailAmount),
        formatCurrency(item.grossProfit),
        `${item.stockTurnoverRate.toFixed(2)}%`
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = `stock-turnover-report-${new Date().toISOString().split('T')[0]}.csv`;
    
    // Use native download approach
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  toExcel: (data: any[], kpiData: any, totals: any, filters: any) => {
    const workbook = XLSX.utils.book_new();

    const kpiSheetData = [
      ['Stock Turnover Report - KPI Summary'],
      [`Generated: ${new Date().toLocaleString()}`],
      [`Date Range: ${filters.startDate} to ${filters.endDate}`],
      [`Branch: ${filters.includeAllBranches ? 'All Branches' : 'Selected Branch'}`],
      [`Segment: ${filters.segment || 'All Segments'}`],
      [`Manufacturer: ${filters.manufacturer || 'All Manufacturers'}`],
      [],
      ['Metric', 'Value', 'Change', 'Trend'],
      ['Net Sales Quantity', kpiData.netSalesQuantity.value, kpiData.netSalesQuantity.change, kpiData.netSalesQuantity.trend],
      ['Net Sales Retail Amount', kpiData.netSalesRetailAmount.value, kpiData.netSalesRetailAmount.change, kpiData.netSalesRetailAmount.trend],
      ['Gross Profit', kpiData.grossProfit.value, kpiData.grossProfit.change, kpiData.grossProfit.trend],
      [],
      ['Grand Totals'],
      ['Net Sales Quantity', totals.netSalesQuantity],
      ['Stock Quantity', totals.stockQuantity],
      ['Net Sales Retail Amount', totals.netSalesRetailAmount],
      ['Stock Retail Amount', totals.stockRetailAmount],
      ['Gross Profit', totals.grossProfit],
      ['Stock Turnover Rate', totals.stockTurnoverRate]
    ];

    const kpiSheet = XLSX.utils.aoa_to_sheet(kpiSheetData);
    XLSX.utils.book_append_sheet(workbook, kpiSheet, 'KPI Summary');

    const productSheetData = [
      ['Segment', 'Product', 'Manufacturer', 'Net Sales Quantity', 'Stock Quantity', 'Net Sales Retail Amount', 'Stock Retail Amount', 'Gross Profit', 'Stock Turnover Rate'],
      ...data.map(item => [
        item.segment,
        item.product,
        item.manufacturer,
        item.netSalesQuantity,
        item.stockQuantity,
        item.netSalesRetailAmount,
        item.stockRetailAmount,
        item.grossProfit,
        item.stockTurnoverRate
      ])
    ];

    const productSheet = XLSX.utils.aoa_to_sheet(productSheetData);
    XLSX.utils.book_append_sheet(workbook, productSheet, 'Product Details');

    XLSX.writeFile(workbook, `stock-turnover-report-${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  toPDF: async (elementId: string, title: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`${title}-${new Date().toISOString().split('T')[0]}.pdf`);
  }
};
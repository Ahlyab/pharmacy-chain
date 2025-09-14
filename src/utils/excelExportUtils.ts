import * as XLSX from 'xlsx';

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(amount);
};

// Helper function to format numbers
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toFixed(2);
};

export const exportRevenueData = {
  toExcel: async (data: any[], kpiData: any, filters: any) => {
    console.log('Starting Excel export for revenue data:', { data, kpiData, filters });
    
    try {
      const workbook = XLSX.utils.book_new();

      // KPI Summary Sheet
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
        ['Net Sales Amount', formatCurrency(kpiData.netSalesAmount.value), kpiData.netSalesAmount.change, kpiData.netSalesAmount.trend],
        ['Gross Profit', formatCurrency(kpiData.grossProfit.value), kpiData.grossProfit.change, kpiData.grossProfit.trend],
        ['Expenses', formatCurrency(kpiData.expenses.value), kpiData.expenses.change, kpiData.expenses.trend],
        ['Operating Profit', formatCurrency(kpiData.operatingProfit.value), kpiData.operatingProfit.change, kpiData.operatingProfit.trend]
      ];

      const kpiSheet = XLSX.utils.aoa_to_sheet(kpiSheetData);
      XLSX.utils.book_append_sheet(workbook, kpiSheet, 'KPI Summary');

      // Period Data Sheet
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

      // Save file
      const filename = `revenue-profit-report-${new Date().toISOString().split('T')[0]}.xlsx`;
      console.log('Saving Excel file:', filename);
      XLSX.writeFile(workbook, filename);
      console.log('Revenue Excel export completed successfully');
    } catch (error) {
      console.error('Error exporting revenue data to Excel:', error);
      throw error;
    }
  }
};

export const exportStockExpirationData = {
  toExcel: async (data: any[], kpiData: any, filters: any) => {
    console.log('Starting Excel export for stock expiration data:', { data, kpiData, filters });
    
    try {
      const workbook = XLSX.utils.book_new();

      // KPI Summary Sheet
      const kpiSheetData = [
        ['Stock and Expiration Date Report - KPI Summary'],
        [`Generated: ${new Date().toLocaleString()}`],
        [`Date Range: ${filters.startDate} to ${filters.endDate}`],
        [`Branch: ${filters.includeAllBranches ? 'All Branches' : 'Selected Branch'}`],
        [],
        ['Metric', 'Value', 'Change', 'Trend'],
        ['Total SKUs', kpiData.totalSKUs.value, kpiData.totalSKUs.change, kpiData.totalSKUs.trend],
        ['Total Stock Value', formatCurrency(kpiData.totalStockValue.value), kpiData.totalStockValue.change, kpiData.totalStockValue.trend],
        ['Expiring Soon (30 days)', kpiData.expiringSoon.value, kpiData.expiringSoon.change, kpiData.expiringSoon.trend],
        ['Expired Items', kpiData.expiredItems.value, kpiData.expiredItems.change, kpiData.expiredItems.trend],
        ['Unique Compositions', kpiData.uniqueCompositions.value, kpiData.uniqueCompositions.change, kpiData.uniqueCompositions.trend],
        ['Unique SKUs', kpiData.uniqueSKUs.value, kpiData.uniqueSKUs.change, kpiData.uniqueSKUs.trend]
      ];

      const kpiSheet = XLSX.utils.aoa_to_sheet(kpiSheetData);
      XLSX.utils.book_append_sheet(workbook, kpiSheet, 'KPI Summary');

      // Chart Data Sheet
      const chartSheetData = [
        ['Period', 'Total SKUs', 'Total Stock Value', 'Expiring Soon', 'Expired Items', 'Unique Compositions', 'Unique SKUs'],
        ...data.map(item => [
          item.period,
          item.totalSKUs,
          item.totalStockValue,
          item.expiringSoon,
          item.expiredItems,
          item.uniqueCompositions,
          item.uniqueSKUs
        ])
      ];

      const chartSheet = XLSX.utils.aoa_to_sheet(chartSheetData);
      XLSX.utils.book_append_sheet(workbook, chartSheet, 'Chart Data');

      // Save file
      const filename = `stock-expiration-report-${new Date().toISOString().split('T')[0]}.xlsx`;
      console.log('Saving Excel file:', filename);
      XLSX.writeFile(workbook, filename);
      console.log('Stock expiration Excel export completed successfully');
    } catch (error) {
      console.error('Error exporting stock expiration data to Excel:', error);
      throw error;
    }
  }
};

export const exportStockTurnoverData = {
  toExcel: async (data: any[], kpiData: any, totals: any, filters: any) => {
    console.log('Starting Excel export for stock turnover data:', { data, kpiData, totals, filters });
    
    try {
      const workbook = XLSX.utils.book_new();

      // KPI Summary Sheet
      const kpiSheetData = [
        ['Stock Turnover Report - KPI Summary'],
        [`Generated: ${new Date().toLocaleString()}`],
        [`Date Range: ${filters.startDate} to ${filters.endDate}`],
        [`Branch: ${filters.includeAllBranches ? 'All Branches' : 'Selected Branch'}`],
        [],
        ['Metric', 'Value', 'Change', 'Trend'],
        ['Total Products', kpiData.totalProducts.value, kpiData.totalProducts.change, kpiData.totalProducts.trend],
        ['Total Sales Value', formatCurrency(kpiData.totalSalesValue.value), kpiData.totalSalesValue.change, kpiData.totalSalesValue.trend],
        ['Total Gross Profit', formatCurrency(kpiData.totalGrossProfit.value), kpiData.totalGrossProfit.change, kpiData.totalGrossProfit.trend],
        ['Average Turnover Rate', `${kpiData.averageTurnoverRate.value}%`, kpiData.averageTurnoverRate.change, kpiData.averageTurnoverRate.trend]
      ];

      const kpiSheet = XLSX.utils.aoa_to_sheet(kpiSheetData);
      XLSX.utils.book_append_sheet(workbook, kpiSheet, 'KPI Summary');

      // Table Data Sheet
      const tableSheetData = [
        ['Product Name', 'Composition', 'SKU', 'Manufacturer', 'Segment', 'Sales Count', 'Sales Value', 'Gross Profit', 'Stock Turnover Rate'],
        ...data.map(item => [
          item.productName,
          item.composition,
          item.sku,
          item.manufacturer,
          item.segment,
          item.salesCount,
          formatCurrency(item.salesValue),
          formatCurrency(item.grossProfit),
          `${item.stockTurnoverRate.toFixed(2)}%`
        ])
      ];

      const tableSheet = XLSX.utils.aoa_to_sheet(tableSheetData);
      XLSX.utils.book_append_sheet(workbook, tableSheet, 'Product Data');

      // Totals Sheet
      const totalsSheetData = [
        ['Summary Totals'],
        [],
        ['Metric', 'Value'],
        ['Total Sales Count', totals.totalSalesCount],
        ['Total Sales Value', formatCurrency(totals.totalSalesValue)],
        ['Total Gross Profit', formatCurrency(totals.totalGrossProfit)],
        ['Average Turnover Rate', `${totals.averageTurnoverRate.toFixed(2)}%`]
      ];

      const totalsSheet = XLSX.utils.aoa_to_sheet(totalsSheetData);
      XLSX.utils.book_append_sheet(workbook, totalsSheet, 'Totals');

      // Save file
      const filename = `stock-turnover-report-${new Date().toISOString().split('T')[0]}.xlsx`;
      console.log('Saving Excel file:', filename);
      XLSX.writeFile(workbook, filename);
      console.log('Stock turnover Excel export completed successfully');
    } catch (error) {
      console.error('Error exporting stock turnover data to Excel:', error);
      throw error;
    }
  }
};

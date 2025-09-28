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
        [`Period: ${filters?.period || 'N/A'}`],
        [`Date Range: ${filters?.startDate || 'N/A'} to ${filters?.endDate || 'N/A'}`],
        [`Branch: ${filters?.includeAllBranches ? 'All Branches' : 'Selected Branch'}`],
        [],
        ['Metric', 'Value', 'Change', 'Trend'],
        ['Sales Count', kpiData?.salesCount?.value || 0, kpiData?.salesCount?.change || 'N/A', kpiData?.salesCount?.trend || 'N/A'],
        ['Packs', kpiData?.packs?.value || 0, kpiData?.packs?.change || 'N/A', kpiData?.packs?.trend || 'N/A'],
        ['Net Sales Amount', formatCurrency(kpiData?.netSalesAmount?.value || 0), kpiData?.netSalesAmount?.change || 'N/A', kpiData?.netSalesAmount?.trend || 'N/A'],
        ['Gross Profit', formatCurrency(kpiData?.grossProfit?.value || 0), kpiData?.grossProfit?.change || 'N/A', kpiData?.grossProfit?.trend || 'N/A'],
        ['Expenses', formatCurrency(kpiData?.expenses?.value || 0), kpiData?.expenses?.change || 'N/A', kpiData?.expenses?.trend || 'N/A'],
        ['Operating Profit', formatCurrency(kpiData?.operatingProfit?.value || 0), kpiData?.operatingProfit?.change || 'N/A', kpiData?.operatingProfit?.trend || 'N/A']
      ];

      const kpiSheet = XLSX.utils.aoa_to_sheet(kpiSheetData);
      XLSX.utils.book_append_sheet(workbook, kpiSheet, 'KPI Summary');

      // Period Data Sheet
      const periodSheetData = [
        ['Period', 'Net Sales Amount', 'Gross Profit', 'Expenses', 'Operating Profit', 'Sales Count', 'Packs'],
        ...(data || []).map(item => [
          item?.period || 'N/A',
          item?.netSalesAmount || 0,
          item?.grossProfit || 0,
          item?.expenses || 0,
          item?.operatingProfit || 0,
          item?.salesCount || 0,
          item?.packs || 0
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
        [`Date Range: ${filters?.startDate || 'N/A'} to ${filters?.endDate || 'N/A'}`],
        [`Branch: ${filters?.includeAllBranches ? 'All Branches' : 'Selected Branch'}`],
        [],
        ['Metric', 'Value', 'Change', 'Trend'],
        ['Total SKUs', kpiData?.totalSKUs?.value || 0, kpiData?.totalSKUs?.change || 'N/A', kpiData?.totalSKUs?.trend || 'N/A'],
        ['Total Stock Value', formatCurrency(kpiData?.totalStockValue?.value || 0), kpiData?.totalStockValue?.change || 'N/A', kpiData?.totalStockValue?.trend || 'N/A'],
        ['Expiring Soon (30 days)', kpiData?.expiringSoon?.value || 0, kpiData?.expiringSoon?.change || 'N/A', kpiData?.expiringSoon?.trend || 'N/A'],
        ['Expired Items', kpiData?.expiredItems?.value || 0, kpiData?.expiredItems?.change || 'N/A', kpiData?.expiredItems?.trend || 'N/A'],
        ['Unique Compositions', kpiData?.uniqueCompositions?.value || 0, kpiData?.uniqueCompositions?.change || 'N/A', kpiData?.uniqueCompositions?.trend || 'N/A'],
        ['Unique SKUs', kpiData?.uniqueSKUs?.value || 0, kpiData?.uniqueSKUs?.change || 'N/A', kpiData?.uniqueSKUs?.trend || 'N/A']
      ];

      const kpiSheet = XLSX.utils.aoa_to_sheet(kpiSheetData);
      XLSX.utils.book_append_sheet(workbook, kpiSheet, 'KPI Summary');

      // Chart Data Sheet
      const chartSheetData = [
        ['Period', 'Total SKUs', 'Total Stock Value', 'Expiring Soon', 'Expired Items', 'Unique Compositions', 'Unique SKUs'],
        ...(data || []).map(item => [
          item?.period || 'N/A',
          item?.totalSKUs || 0,
          item?.totalStockValue || 0,
          item?.expiringSoon || 0,
          item?.expiredItems || 0,
          item?.uniqueCompositions || 0,
          item?.uniqueSKUs || 0
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
        [`Date Range: ${filters?.startDate || 'N/A'} to ${filters?.endDate || 'N/A'}`],
        [`Branch: ${filters?.includeAllBranches ? 'All Branches' : 'Selected Branch'}`],
        [],
        ['Metric', 'Value', 'Change', 'Trend'],
        ['Total Products', kpiData?.totalProducts?.value || 0, kpiData?.totalProducts?.change || 'N/A', kpiData?.totalProducts?.trend || 'N/A'],
        ['Total Sales Value', formatCurrency(kpiData?.totalSalesValue?.value || 0), kpiData?.totalSalesValue?.change || 'N/A', kpiData?.totalSalesValue?.trend || 'N/A'],
        ['Total Gross Profit', formatCurrency(kpiData?.totalGrossProfit?.value || 0), kpiData?.totalGrossProfit?.change || 'N/A', kpiData?.totalGrossProfit?.trend || 'N/A'],
        ['Average Turnover Rate', `${kpiData?.averageTurnoverRate?.value || 0}%`, kpiData?.averageTurnoverRate?.change || 'N/A', kpiData?.averageTurnoverRate?.trend || 'N/A']
      ];

      const kpiSheet = XLSX.utils.aoa_to_sheet(kpiSheetData);
      XLSX.utils.book_append_sheet(workbook, kpiSheet, 'KPI Summary');

      // Table Data Sheet
      const tableSheetData = [
        ['Product Name', 'Composition', 'SKU', 'Manufacturer', 'Segment', 'Sales Count', 'Sales Value', 'Gross Profit', 'Stock Turnover Rate'],
        ...(data || []).map(item => [
          item?.productName || 'N/A',
          item?.composition || 'N/A',
          item?.sku || 'N/A',
          item?.manufacturer || 'N/A',
          item?.segment || 'N/A',
          item?.salesCount || 0,
          formatCurrency(item?.salesValue || 0),
          formatCurrency(item?.grossProfit || 0),
          `${(item?.stockTurnoverRate || 0).toFixed(2)}%`
        ])
      ];

      const tableSheet = XLSX.utils.aoa_to_sheet(tableSheetData);
      XLSX.utils.book_append_sheet(workbook, tableSheet, 'Product Data');

      // Totals Sheet
      const totalsSheetData = [
        ['Summary Totals'],
        [],
        ['Metric', 'Value'],
        ['Total Sales Count', totals?.totalSalesCount || 0],
        ['Total Sales Value', formatCurrency(totals?.totalSalesValue || 0)],
        ['Total Gross Profit', formatCurrency(totals?.totalGrossProfit || 0)],
        ['Average Turnover Rate', `${(totals?.averageTurnoverRate || 0).toFixed(2)}%`]
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

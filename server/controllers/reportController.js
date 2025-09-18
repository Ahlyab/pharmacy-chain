import Transaction from '../models/Transaction.js';
import Branch from '../models/Branch.js';
import Inventory from '../models/Inventory.js';

// Get revenue and profit report data
const getRevenueProfitReport = async (req, res) => {
  try {
    const { 
      branchId, 
      startDate, 
      endDate, 
      period = 'week',
      includeAllBranches = false 
    } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Build branch filter
    const branchFilter = {};
    if (branchId && !includeAllBranches) {
      branchFilter.branchId = branchId;
    }

    // Get transactions
    const transactions = await Transaction.find({
      ...dateFilter,
      ...branchFilter,
      status: 'Completed'
    }).populate('branchId', 'name').populate('items.productId', 'name unitsPerPack');

    // Group data by period
    const groupedData = {};
    
    transactions.forEach(transaction => {
      let periodKey;
      const transactionDate = new Date(transaction.date);
      
      if (period === 'day') {
        periodKey = transactionDate.toISOString().split('T')[0];
      } else if (period === 'week') {
        const weekStart = new Date(transactionDate);
        weekStart.setDate(transactionDate.getDate() - transactionDate.getDay());
        periodKey = weekStart.toISOString().split('T')[0];
      } else if (period === 'month') {
        periodKey = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!groupedData[periodKey]) {
        groupedData[periodKey] = {
          period: periodKey,
          netSalesAmount: 0,
          grossProfit: 0,
          expenses: 0,
          operatingProfit: 0,
          salesCount: 0,
          packs: 0,
          transactions: []
        };
      }

      // Calculate metrics
      const netSalesAmount = transaction.totalAmount;
      const grossProfit = netSalesAmount * 0.33; // Assuming 33% gross profit margin
      const expenses = netSalesAmount * 0.08; // Assuming 8% expenses
      const operatingProfit = grossProfit - expenses;

      let totalPacks = 0;
      let totalUnits = 0;

      transaction.items.forEach(item => {
        if (item.isUnitPurchase) {
          totalUnits += item.unitsSold;
          totalPacks += Math.ceil(item.unitsSold / (item.productId?.unitsPerPack || 1));
        } else {
          totalPacks += item.packsSold;
          totalUnits += item.packsSold * (item.productId?.unitsPerPack || 1);
        }
      });

      groupedData[periodKey].netSalesAmount += netSalesAmount;
      groupedData[periodKey].grossProfit += grossProfit;
      groupedData[periodKey].expenses += expenses;
      groupedData[periodKey].operatingProfit += operatingProfit;
      groupedData[periodKey].salesCount += 1;
      groupedData[periodKey].packs += totalPacks;
      groupedData[periodKey].transactions.push(transaction);
    });

    // Convert to array and sort by period
    const reportData = Object.values(groupedData).sort((a, b) => 
      new Date(a.period) - new Date(b.period)
    );

    // Calculate totals for KPI cards
    const totals = reportData.reduce((acc, period) => {
      acc.netSalesAmount += period.netSalesAmount;
      acc.grossProfit += period.grossProfit;
      acc.expenses += period.expenses;
      acc.operatingProfit += period.operatingProfit;
      acc.salesCount += period.salesCount;
      acc.packs += period.packs;
      return acc;
    }, {
      netSalesAmount: 0,
      grossProfit: 0,
      expenses: 0,
      operatingProfit: 0,
      salesCount: 0,
      packs: 0
    });

    // Calculate percentage changes (mock data for now)
    const previousPeriodTotals = {
      netSalesAmount: totals.netSalesAmount * 0.96,
      grossProfit: totals.grossProfit * 0.978,
      expenses: totals.expenses * 1.403,
      operatingProfit: totals.operatingProfit * 0.95,
      salesCount: totals.salesCount * 1.04,
      packs: totals.packs * 1.024
    };

    const kpiData = {
      salesCount: {
        value: totals.salesCount,
        change: ((totals.salesCount - previousPeriodTotals.salesCount) / previousPeriodTotals.salesCount * 100).toFixed(1),
        trend: totals.salesCount > previousPeriodTotals.salesCount ? 'up' : 'down'
      },
      packs: {
        value: totals.packs,
        change: ((totals.packs - previousPeriodTotals.packs) / previousPeriodTotals.packs * 100).toFixed(1),
        trend: totals.packs > previousPeriodTotals.packs ? 'up' : 'down'
      },
      netSalesAmount: {
        value: totals.netSalesAmount,
        change: ((totals.netSalesAmount - previousPeriodTotals.netSalesAmount) / previousPeriodTotals.netSalesAmount * 100).toFixed(1),
        trend: totals.netSalesAmount > previousPeriodTotals.netSalesAmount ? 'up' : 'down'
      },
      grossProfit: {
        value: totals.grossProfit,
        change: ((totals.grossProfit - previousPeriodTotals.grossProfit) / previousPeriodTotals.grossProfit * 100).toFixed(1),
        trend: totals.grossProfit > previousPeriodTotals.grossProfit ? 'up' : 'down'
      },
      expenses: {
        value: totals.expenses,
        change: ((totals.expenses - previousPeriodTotals.expenses) / previousPeriodTotals.expenses * 100).toFixed(1),
        trend: totals.expenses > previousPeriodTotals.expenses ? 'up' : 'down'
      },
      operatingProfit: {
        value: totals.operatingProfit,
        change: ((totals.operatingProfit - previousPeriodTotals.operatingProfit) / previousPeriodTotals.operatingProfit * 100).toFixed(1),
        trend: totals.operatingProfit > previousPeriodTotals.operatingProfit ? 'up' : 'down'
      }
    };

    res.json({
      success: true,
      data: {
        chartData: reportData,
        kpiData,
        filters: {
          branchId,
          startDate,
          endDate,
          period,
          includeAllBranches
        }
      }
    });

  } catch (error) {
    console.error('Error generating revenue profit report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating report',
      error: error.message
    });
  }
};

// Get branches for filter dropdown
const getBranches = async (req, res) => {
  try {
    const branches = await Branch.find({ status: 'Active' }).select('_id name');
    res.json({
      success: true,
      data: branches
    });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching branches',
      error: error.message
    });
  }
};

// Get stock and expiration date report data
const getStockExpirationReport = async (req, res) => {
  try {
    const { 
      branchId, 
      startDate, 
      endDate, 
      includeAllBranches = false 
    } = req.query;

    // Build date filter for expiry dates
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.expiryDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Build branch filter
    const branchFilter = {};
    if (branchId && !includeAllBranches) {
      branchFilter.branchId = branchId;
    }

    // Get inventory items
    const inventoryItems = await Inventory.find({
      ...dateFilter,
      ...branchFilter
    }).populate('branchId', 'name').populate('supplierId', 'name');

    // Calculate days until/since expiration
    const currentDate = new Date();
    const processedItems = inventoryItems.map(item => {
      const expiryDate = new Date(item.expiryDate);
      const timeDiff = expiryDate.getTime() - currentDate.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      return {
        ...item.toObject(),
        daysUntilExpiry: daysDiff,
        isExpired: daysDiff < 0,
        totalCost: item.stock * (item.purchasePriceExclVAT || item.unitPrice || 0)
      };
    });

    // Group data by days until/since expiration
    const groupedData = {};
    
    processedItems.forEach(item => {
      const dayKey = item.daysUntilExpiry;
      
      if (!groupedData[dayKey]) {
        groupedData[dayKey] = {
          day: dayKey,
          quantity: 0,
          cost: 0,
          items: 0,
          uniqueCompositions: new Set(),
          uniqueSKUs: new Set()
        };
      }

      groupedData[dayKey].quantity += item.stock;
      groupedData[dayKey].cost += item.totalCost;
      groupedData[dayKey].items += 1;
      groupedData[dayKey].uniqueCompositions.add(item.composition || item.name);
      groupedData[dayKey].uniqueSKUs.add(item.name);
    });

    // Convert to array and sort by day
    const chartData = Object.values(groupedData)
      .map(group => ({
        ...group,
        uniqueCompositions: group.uniqueCompositions.size,
        uniqueSKUs: group.uniqueSKUs.size
      }))
      .sort((a, b) => a.day - b.day);

    // Calculate totals for KPI cards
    const totals = processedItems.reduce((acc, item) => {
      acc.items += 1;
      acc.quantity += item.stock;
      acc.cost += item.totalCost;
      acc.uniqueCompositions.add(item.composition || item.name);
      acc.uniqueSKUs.add(item.name);
      return acc;
    }, {
      items: 0,
      quantity: 0,
      cost: 0,
      uniqueCompositions: new Set(),
      uniqueSKUs: new Set()
    });

    const kpiData = {
      items: {
        value: totals.items,
        label: 'Items'
      },
      uniqueCompositions: {
        value: totals.uniqueCompositions.size,
        label: 'Unique compositions'
      },
      uniqueSKUs: {
        value: totals.uniqueSKUs.size,
        label: 'Unique SKUs'
      },
      quantity: {
        value: totals.quantity,
        label: 'Quantity'
      },
      cost: {
        value: totals.cost,
        label: 'Cost'
      }
    };

    res.json({
      success: true,
      data: {
        chartData,
        kpiData,
        filters: {
          branchId,
          startDate,
          endDate,
          includeAllBranches
        }
      }
    });

  } catch (error) {
    console.error('Error generating stock expiration report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating report',
      error: error.message
    });
  }
};

// Get stock turnover report data
const getStockTurnoverReport = async (req, res) => {
  try {
    const { 
      branchId, 
      startDate, 
      endDate, 
      includeAllBranches = true,
      segment,
      manufacturer
    } = req.query;

    // Build date filter for transaction dates
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Build branch filter
    const branchFilter = {};
    if (branchId && !includeAllBranches) {
      branchFilter.branchId = branchId;
    }

    // Get transactions for sales data
    const transactions = await Transaction.find({
      ...dateFilter,
      ...branchFilter,
      status: 'completed'
    }).populate('items.productId', 'name composition manufacturer category');

    // Get inventory for stock data
    const inventoryFilter = {};
    if (branchId && !includeAllBranches) {
      inventoryFilter.branchId = branchId;
    }
    if (segment) {
      inventoryFilter.category = segment;
    }
    if (manufacturer) {
      inventoryFilter.manufacturer = manufacturer;
    }

    const inventoryItems = await Inventory.find(inventoryFilter)
      .populate('branchId', 'name')
      .populate('supplierId', 'name');

    // Process sales data
    const salesData = {};
    transactions.forEach(transaction => {
      transaction.items.forEach(item => {
        const productId = item.productId._id.toString();
        if (!salesData[productId]) {
          salesData[productId] = {
            productId,
            name: item.productId.name,
            composition: item.productId.composition || item.productId.name,
            manufacturer: item.productId.manufacturer || 'Unknown',
            category: item.productId.category || 'General',
            netSalesQuantity: 0,
            netSalesRetailAmount: 0,
            grossProfit: 0
          };
        }
        salesData[productId].netSalesQuantity += item.quantity;
        salesData[productId].netSalesRetailAmount += item.totalPrice;
        salesData[productId].grossProfit += (item.totalPrice - (item.costPrice * item.quantity));
      });
    });

    // Process stock data and combine with sales
    const stockTurnoverData = [];
    const totals = {
      netSalesQuantity: 0,
      stockQuantity: 0,
      netSalesRetailAmount: 0,
      stockRetailAmount: 0,
      grossProfit: 0
    };

    inventoryItems.forEach(item => {
      const productId = item._id.toString();
      const salesInfo = salesData[productId] || {
        netSalesQuantity: 0,
        netSalesRetailAmount: 0,
        grossProfit: 0
      };

      const stockRetailAmount = item.stock * (item.unitPrice || 0);
      const turnoverRate = item.stock > 0 ? (salesInfo.netSalesQuantity / item.stock) * 100 : 0;

      const productData = {
        productId,
        segment: item.category || 'General',
        product: item.name,
        manufacturer: item.manufacturer || 'Unknown',
        composition: item.composition || item.name,
        netSalesQuantity: salesInfo.netSalesQuantity,
        stockQuantity: item.stock,
        netSalesRetailAmount: salesInfo.netSalesRetailAmount,
        stockRetailAmount: stockRetailAmount,
        grossProfit: salesInfo.grossProfit,
        stockTurnoverRate: turnoverRate
      };

      stockTurnoverData.push(productData);

      // Add to totals
      totals.netSalesQuantity += salesInfo.netSalesQuantity;
      totals.stockQuantity += item.stock;
      totals.netSalesRetailAmount += salesInfo.netSalesRetailAmount;
      totals.stockRetailAmount += stockRetailAmount;
      totals.grossProfit += salesInfo.grossProfit;
    });

    // Calculate previous period for trend analysis
    let previousStartDate, previousEndDate;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diff = end.getTime() - start.getTime();
      previousEndDate = new Date(start.getTime() - 1);
      previousStartDate = new Date(previousEndDate.getTime() - diff);
    }

    let previousTotals = {
      netSalesQuantity: 0,
      netSalesRetailAmount: 0,
      grossProfit: 0
    };

    if (previousStartDate && previousEndDate) {
      // Build previous period filters
      const prevDateFilter = {
        createdAt: {
          $gte: previousStartDate,
          $lte: previousEndDate
        }
      };
      // Use same branch/segment/manufacturer filters
      const prevTransactions = await Transaction.find({
        ...prevDateFilter,
        ...branchFilter,
        status: 'completed'
      }).populate('items.productId', 'name composition manufacturer category');

      prevTransactions.forEach(transaction => {
        transaction.items.forEach(item => {
          previousTotals.netSalesQuantity += item.quantity;
          previousTotals.netSalesRetailAmount += item.totalPrice;
          previousTotals.grossProfit += (item.totalPrice - (item.costPrice * item.quantity));
        });
      });
    }

    function calcChange(current, previous) {
      if (!previous || previous === 0) return '0.0';
      return ((current - previous) / previous * 100).toFixed(1);
    }
    function calcTrend(current, previous) {
      return current > previous ? 'up' : 'down';
    }

    const kpiData = {
      netSalesQuantity: {
        value: totals.netSalesQuantity,
        label: 'Net sales quantity',
        change: calcChange(totals.netSalesQuantity, previousTotals.netSalesQuantity),
        trend: calcTrend(totals.netSalesQuantity, previousTotals.netSalesQuantity)
      },
      netSalesRetailAmount: {
        value: totals.netSalesRetailAmount,
        label: 'Net sales retail amount',
        change: calcChange(totals.netSalesRetailAmount, previousTotals.netSalesRetailAmount),
        trend: calcTrend(totals.netSalesRetailAmount, previousTotals.netSalesRetailAmount)
      },
      grossProfit: {
        value: totals.grossProfit,
        label: 'Gross profit',
        change: calcChange(totals.grossProfit, previousTotals.grossProfit),
        trend: calcTrend(totals.grossProfit, previousTotals.grossProfit)
      }
    };

    // Sort by stock turnover rate (descending)
    stockTurnoverData.sort((a, b) => b.stockTurnoverRate - a.stockTurnoverRate);

    const overallTurnoverRate = totals.stockQuantity > 0 ? 
      (totals.netSalesQuantity / totals.stockQuantity) * 100 : 0;

    res.json({
      success: true,
      data: {
        tableData: stockTurnoverData,
        totals: {
          ...totals,
          stockTurnoverRate: overallTurnoverRate
        },
        kpiData,
        filters: {
          branchId,
          startDate,
          endDate,
          includeAllBranches,
          segment,
          manufacturer
        }
      }
    });

  } catch (error) {
    console.error('Error generating stock turnover report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating report',
      error: error.message
    });
  }
};

export {
  getRevenueProfitReport,
  getStockExpirationReport,
  getStockTurnoverReport,
  getBranches
};

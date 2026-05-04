const db = require('../db');

exports.getDashboardStats = async (req, res) => {
  try {
    // Run all queries in parallel for maximum performance
    const [
      lowStockResult,
      issuedThisMonthResult,
      stockUsedResult,
      pendingRequestsResult,
      quarterlyUsageResult,
      stockDistributionResult,
      allocationResult,
      recentActivityTransactions,
      recentActivityRequests
    ] = await Promise.all([
      // 1. Low Stock Items
      db.query(`
        SELECT item_code, item_name, current_stock, reorder_level,
        CAST(CASE WHEN reorder_level > 0 THEN ROUND((GREATEST(current_stock, 0)::numeric / reorder_level::numeric) * 100) ELSE 0 END AS INTEGER) as stock_percentage
        FROM Items 
        WHERE current_stock <= reorder_level 
        ORDER BY current_stock ASC 
        LIMIT 5
      `),

      // 2. Total Items Issued (Adjusted to most recent month with data for better visibility)
      db.query(`
        SELECT COALESCE(SUM(td.quantity), 0) as total_issued
        FROM Transaction_Details td
        JOIN Transactions t ON td.transaction_id = t.transaction_id
        WHERE t.transaction_type = 'OUT' 
        AND t.transaction_date >= date_trunc('month', (SELECT MAX(transaction_date) FROM Transactions))
        ${req.user.role === 'FOCAL_OFFICER' ? `AND t.office_id = ${req.user.office_id}` : ''}
      `),

      // 3. Percentage Stock Used
      db.query(`
        WITH monthly_outflow AS (
          SELECT COALESCE(SUM(td.quantity), 0) as outflow
          FROM Transaction_Details td
          JOIN Transactions t ON td.transaction_id = t.transaction_id
          WHERE t.transaction_type = 'OUT' 
          AND t.transaction_date >= date_trunc('month', (SELECT MAX(transaction_date) FROM Transactions))
          ${req.user.role === 'FOCAL_OFFICER' ? `AND t.office_id = ${req.user.office_id}` : ''}
        ),
        total_stock AS (
          SELECT COALESCE(SUM(current_stock), 0) as current_total FROM Items
        )
        SELECT 
          CAST(CASE 
            WHEN (current_total + outflow) > 0 
            THEN ROUND((outflow::numeric / (current_total + outflow)::numeric) * 100) 
            ELSE 0 
          END AS INTEGER) as percentage_used
        FROM monthly_outflow, total_stock
      `),

      // 4. Pending Requests
      db.query(`
        SELECT r.request_id, o.acronym as office, r.request_date, r.status
        FROM Requests r
        JOIN Offices o ON r.office_id = o.office_id
        WHERE r.status = 'PENDING'
        ${req.user.role === 'FOCAL_OFFICER' ? `AND r.office_id = ${req.user.office_id}` : ''}
        ORDER BY r.request_date DESC
        LIMIT 5
      `),

      // 5. Quarterly Usage (Filtered by most recent year with data)
      db.query(`
        SELECT c.category_name as label, 
               EXTRACT(QUARTER FROM t.transaction_date) as quarter,
               SUM(td.quantity) as total_quantity
        FROM Transaction_Details td
        JOIN Transactions t ON td.transaction_id = t.transaction_id
        JOIN Items i ON td.item_id = i.item_id
        JOIN Categories c ON i.category_id = c.category_id
        WHERE t.transaction_type = 'OUT' 
        AND EXTRACT(YEAR FROM t.transaction_date) = (SELECT EXTRACT(YEAR FROM MAX(transaction_date)) FROM Transactions)
        ${req.user.role === 'FOCAL_OFFICER' ? `AND t.office_id = ${req.user.office_id}` : ''}
        GROUP BY c.category_name, quarter
        ORDER BY c.category_name, quarter
      `),

      // 6. Stock Distribution by Office
      db.query(`
        SELECT o.acronym as label, SUM(td.quantity) as value
        FROM Transaction_Details td
        JOIN Transactions t ON td.transaction_id = t.transaction_id
        JOIN Offices o ON t.office_id = o.office_id
        WHERE t.transaction_type = 'OUT'
        ${req.user.role === 'FOCAL_OFFICER' ? `AND t.office_id = ${req.user.office_id}` : ''}
        GROUP BY o.acronym
        ORDER BY value DESC
      `),

      // 7. Supply Allocation Status
      db.query(`
        SELECT o.acronym as office, 
               SUM(CASE WHEN t.transaction_type = 'OUT' THEN td.quantity ELSE 0 END) as consumed,
               SUM(CASE WHEN t.transaction_type = 'IN' THEN td.quantity ELSE 0 END) - 
               SUM(CASE WHEN t.transaction_type = 'OUT' THEN td.quantity ELSE 0 END) as remaining
        FROM Transaction_Details td
        JOIN Transactions t ON td.transaction_id = t.transaction_id
        JOIN Offices o ON t.office_id = o.office_id
        ${req.user.role === 'FOCAL_OFFICER' ? `WHERE t.office_id = ${req.user.office_id}` : ''}
        GROUP BY o.acronym
      `),

      // 8. Recent Activity Transactions
      db.query(`
        SELECT 'Transaction' as type, 
               CASE WHEN transaction_type = 'IN' THEN 'Received items' ELSE 'Issued items to ' || o.acronym END as description,
               transaction_date as date
        FROM Transactions t
        LEFT JOIN Offices o ON t.office_id = o.office_id
        ${req.user.role === 'FOCAL_OFFICER' ? `WHERE t.office_id = ${req.user.office_id}` : ''}
        ORDER BY transaction_date DESC
        LIMIT 3
      `),

      // 9. Recent Activity Requests
      db.query(`
        SELECT 'Request' as type, 
               'New request from ' || o.acronym as description,
               request_date as date
        FROM Requests r
        JOIN Offices o ON r.office_id = o.office_id
        ${req.user.role === 'FOCAL_OFFICER' ? `WHERE r.office_id = ${req.user.office_id}` : ''}
        ORDER BY request_date DESC
        LIMIT 3
      `)
    ]);

    const recentActivities = [...recentActivityTransactions.rows, ...recentActivityRequests.rows]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    res.json({
      lowStock: lowStockResult.rows,
      issuedThisMonth: issuedThisMonthResult.rows[0].total_issued,
      percentageStockUsed: stockUsedResult.rows[0].percentage_used,
      pendingRequests: pendingRequestsResult.rows,
      quarterlyUsage: quarterlyUsageResult.rows,
      stockDistribution: stockDistributionResult.rows,
      allocationStatus: allocationResult.rows,
      recentActivities: recentActivities
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

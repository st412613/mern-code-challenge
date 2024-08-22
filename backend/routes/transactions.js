const express = require("express");
const axios = require("axios");
const Transaction = require("../models/Transaction");

const router = express.Router();

// List Transactions with Search and Pagination
router.get('/', async (req, res) => {
    const { page = 1, perPage = 10, search = '', month } = req.query;
    try {
        // Initialize query array
        let queryConditions = [];

        // Ensure search is a string
        const searchTerm = typeof search === 'string' ? search.trim() : '';

        // Convert searchTerm to a number for price if it's numeric
        const searchPrice = isNaN(Number(searchTerm)) ? null : Number(searchTerm);

        // Add search condition if search is not empty
        if (searchTerm || searchPrice !== null) {
            // Add search condition for title, description, category, and price
            queryConditions.push({
                $or: [
                    { title: { $regex: new RegExp(searchTerm, 'i') } },
                    { description: { $regex: new RegExp(searchTerm, 'i') } },
                    { category: { $regex: new RegExp(searchTerm, 'i') } },
                    { price: searchPrice } // Check for price if valid
                ]
            });
        }

        // Add month condition if month is provided
        if (month) {
            // Convert month string to numeric month index (0-11)
            const months = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ];

            const monthIndex = months.indexOf(month);
            if (monthIndex === -1) {
                return res.status(400).json({ error: 'Invalid month value' });
            }
            // Filter for the specific month, disregard year
            queryConditions.push({
                $expr: {
                    $and: [
                        { $eq: [{ $month: "$dateOfSale" }, monthIndex + 1] }
                    ]
                }
            });
        }

        // Construct final query
        const query = queryConditions.length > 0 ? { $and: queryConditions } : {};  
        const transactions = await Transaction.find(query)
            .skip((page - 1) * perPage)
            .limit(Number(perPage));

        const total = await Transaction.countDocuments(query);
        res.json({
            transactions,
            total,
            page: Number(page),
            perPage: Number(perPage)
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// API for Statistics
router.get("/statistics", async (req, res) => {
    const { month } = req.query;
  
    try {
      // Define month names for conversion
      const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
  
      // Convert month name to index (1-12)
      const monthIndex = months.indexOf(month) + 1;
      if (monthIndex === 0) {
        return res.status(400).json({ error: 'Invalid month value' });
      }
  
      // Query to find transactions in the specified month
      const transactions = await Transaction.aggregate([
        {
          $match: {
            $expr: {
              $and: [
                { $eq: [{ $month: "$dateOfSale" }, monthIndex] }
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            totalSaleAmount: { $sum: { $cond: [{ $eq: ["$sold", true] }, "$price", 0] } },
            totalSoldItems: { $sum: { $cond: [{ $eq: ["$sold", true] }, 1, 0] } },
            totalNotSoldItems: { $sum: { $cond: [{ $eq: ["$sold", false] }, 1, 0] } }
          }
        }
      ]);
  
      // Ensure that transactions data exists
      const stats = transactions[0] || {
        totalSaleAmount: 0,
        totalSoldItems: 0,
        totalNotSoldItems: 0
      };
  
      res.json({
        totalSaleAmount: stats.totalSaleAmount,
        totalSoldItems: stats.totalSoldItems,
        totalNotSoldItems: stats.totalNotSoldItems,
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });
  

// API for Bar Chart
router.get("/bar-chart", async (req, res) => {
    const { month } = req.query;
    let queryConditions = [];

    // Handle month filtering if provided
    if (month) {
        const months = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        const monthIndex = months.indexOf(month);
        if (monthIndex === -1) {
            return res.status(400).json({ error: 'Invalid month value' });
        }

        queryConditions.push({
            $expr: {
                $and: [
                    { $eq: [{ $month: "$dateOfSale" }, monthIndex + 1] }
                ]
            }
        });
    }

    // Build the query object
    const query = queryConditions.length > 0 ? { $and: queryConditions } : {};  

    try {
        // Define price ranges
        const ranges = [
            [0, 100],
            [101, 200],
            [201, 300],
            [301, 400],
            [401, 500],
            [501, 600],
            [601, 700],
            [701, 800],
            [801, 900],
            [901, Number.MAX_SAFE_INTEGER],
        ];

        // Query counts for each range
        const result = await Promise.all(
            ranges.map(async ([min, max]) => {
                const count = await Transaction.countDocuments({
                    ...query,
                    price: { $gte: min, $lte: max }
                });
                return { range: `${min}-${max}`, count };
            })
        );

        // Format result to ensure all ranges are included
        const formattedResult = ranges.map(([min, max]) => ({
            range: `${min}-${max}`,
            count: result.find(r => r.range === `${min}-${max}`)?.count || 0
        }));

        res.json(formattedResult);
    } catch (err) {
        console.error('Error fetching bar chart data:', err);
        res.status(500).send("Error fetching bar chart data");
    }
});

// API for Pie Chart
router.get("/pie-chart", async (req, res) => {
    const { month } = req.query;
    let queryConditions = [];
    // Handle month filtering if provided
    if (month) {
        const months = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        const monthIndex = months.indexOf(month);
        if (monthIndex === -1) {
            return res.status(400).json({ error: 'Invalid month value' });
        }
        queryConditions.push({
            $expr: {
                $and: [
                    { $eq: [{ $month: "$dateOfSale" }, monthIndex + 1] }
                ]
            }
        });
    }
    // Build the query object
    const query = queryConditions.length > 0 ? { $and: queryConditions } : {};  
    try {
      // Query for transactions within the specific month
      const transactions = await Transaction.find({
        ...query,
      });
  
      // Count the number of transactions for each category
      const categories = {};
  
      transactions.forEach((transaction) => {
        if (categories[transaction.category]) {
          categories[transaction.category]++;
        } else {
          categories[transaction.category] = 1;
        }
      });
  
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pie chart data" });
    }
  });  

// API to Combine All Responses
router.get("/combined-data", async (req, res) => {
  const { month } = req.query;

  try {
    const statistics = await axios.get(
      `http://localhost:5000/api/transactions/statistics?month=${month}`
    );
    const barChart = await axios.get(
      `http://localhost:5000/api/transactions/bar-chart?month=${month}`
    );
    const pieChart = await axios.get(
      `http://localhost:5000/api/transactions/pie-chart?month=${month}`
    );

    res.json({
      statistics: statistics.data,
      barChart: barChart.data,
      pieChart: pieChart.data,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch combined data" });
  }
});

module.exports = router;

// const express = require('express');
// const axios = require('axios');
// const Transaction = require('../models/Transaction');

// const router = express.Router();

// // Seed database
// router.get('/initialize', async (req, res) => {
//   try {
//     const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
//     const transactions = response.data;

//     await Transaction.deleteMany({});
//     await Transaction.insertMany(transactions);

//     res.status(200).send('Database initialized');
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to initialize database' });
//   }
// });

// module.exports = router;

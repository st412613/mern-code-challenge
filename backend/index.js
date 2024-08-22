require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const Transaction = require('./models/Transaction');
const transactionRoutes = require('./routes/transactions');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8070;

// -------initial connection with mongoDB----------------
const connect = async () => {
    try {
        mongoose.set('strictQuery', false);
        await mongoose.connect(process.env.MONGO_URI);
        console.log("connected to mongodb cloud");
        await initializeDatabase();
    } catch (err) {
        console.log(`connection Failed${err}`);
    }
};
// -------------------------------------------------------

// ----------------Seed database--------------------------
const initializeDatabase = async () => {
    try {
        const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
        const transactions = response.data;
        // Clear existing transactions and insert new ones
        await Transaction.deleteMany({});
        await Transaction.insertMany(transactions);
        console.log('Database initialized');
    } catch (error) {
        console.error('Failed to initialize database:', error.message);
    }
};
//----------------------------------------------------------
//---------------middlewares-----------------------------
app.use(cors());
app.use(express.json());

// Import routes
app.use('/api/transactions', transactionRoutes);

//------------port where server runs----------------------
app.listen(8070, () => {
    connect()
    console.log(`server is running at port: http://localhost:${PORT}`);
});
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/mern-challenge', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const transactionSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  dateOfSale: Date,
  sold: Boolean,
  category: String,
});

const Transaction = mongoose.model('Transaction', transactionSchema);

app.get('/api/init', async (req, res) => {
  try {
    const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
    const transactions = response.data;

    await Transaction.deleteMany({});
    await Transaction.insertMany(transactions);

    res.status(200).send('Database initialized');
  } catch (error) {
    res.status(500).send('Error initializing database');
  }
});

app.get('/api/transactions', async (req, res) => {
  const { page = 1, perPage = 10, search = '', month } = req.query;

  const searchQuery = search
    ? { $or: [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { price: new RegExp(search, 'i') }
      ] }
    : {};

  const dateQuery = month ? {
    dateOfSale: {
      $gte: new Date(`2021-${month}-01`),
      $lt: new Date(`2021-${Number(month) + 1}-01`)
    }
  } : {};

  try {
    const transactions = await Transaction.find({ ...searchQuery, ...dateQuery })
      .skip((page - 1) * perPage)
      .limit(Number(perPage));

    res.json(transactions);
  } catch (error) {
    res.status(500).send('Error fetching transactions');
  }
});

app.get('/api/statistics', async (req, res) => {
  const { month } = req.query;

  const dateQuery = month ? {
    dateOfSale: {
      $gte: new Date(`2021-${month}-01`),
      $lt: new Date(`2021-${Number(month) + 1}-01`)
    }
  } : {};

  try {
    const totalSaleAmount = await Transaction.aggregate([
      { $match: dateQuery },
      { $group: { _id: null, totalAmount: { $sum: "$price" } } }
    ]);

    const totalSoldItems = await Transaction.countDocuments({ ...dateQuery, sold: true });
    const totalNotSoldItems = await Transaction.countDocuments({ ...dateQuery, sold: false });

    res.json({
      totalSaleAmount: totalSaleAmount[0]?.totalAmount || 0,
      totalSoldItems,
      totalNotSoldItems
    });
  } catch (error) {
    res.status(500).send('Error fetching statistics');
  }
});

app.get('/api/barchart', async (req, res) => {
  const { month } = req.query;

  const dateQuery = month ? {
    dateOfSale: {
      $gte: new Date(`2021-${month}-01`),
      $lt: new Date(`2021-${Number(month) + 1}-01`)
    }
  } : {};

  const priceRanges = [
    { range: '0-100', min: 0, max: 100 },
    { range: '101-200', min: 101, max: 200 },
    { range: '201-300', min: 201, max: 300 },
    { range: '301-400', min: 301, max: 400 },
    { range: '401-500', min: 401, max: 500 },
    { range: '501-600', min: 501, max: 600 },
    { range: '601-700', min: 601, max: 700 },
    { range: '701-800', min: 701, max: 800 },
    { range: '801-900', min: 801, max: 900 },
    { range: '901-above', min: 901, max: Infinity },
  ];

  try {
    const barChartData = await Promise.all(priceRanges.map(async (range) => {
      const count = await Transaction.countDocuments({
        ...dateQuery,
        price: { $gte: range.min, $lt: range.max === Infinity ? Number.MAX_SAFE_INTEGER : range.max }
      });

      return { range: range.range, count };
    }));

    res.json(barChartData);
  } catch (error) {
    res.status(500).send('Error fetching bar chart data');
  }
});

app.get('/api/piechart', async (req, res) => {
  const { month } = req.query;

  const dateQuery = month ? {
    dateOfSale: {
      $gte: new Date(`2021-${month}-01`),
      $lt: new Date(`2021-${Number(month) + 1}-01`)
    }
  } : {};

  try {
    const pieChartData = await Transaction.aggregate([
      { $match: dateQuery },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $project: { category: "$_id", count: 1, _id: 0 } }
    ]);

    res.json(pieChartData);
  } catch (error) {
    res.status(500).send('Error fetching pie chart data');
  }
});

app.get('/api/combined', async (req, res) => {
  const { month } = req.query;

  try {
    const [transactions, statistics, barChart, pieChart] = await Promise.all([
      axios.get(`http://localhost:5000/api/transactions?month=${month}`),
      axios.get(`http://localhost:5000/api/statistics?month=${month}`),
      axios.get(`http://localhost:5000/api/barchart?month=${month}`),
      axios.get(`http://localhost:5000/api/piechart?month=${month}`)
    ]);

    res.json({
      transactions: transactions.data,
      statistics: statistics.data,
      barChart: barChart.data,
      pieChart: pieChart.data,
    });
  } catch (error) {
    res.status(500).send('Error fetching combined data');
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

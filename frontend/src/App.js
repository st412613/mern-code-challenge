import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import axios from "axios";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";

// Register components for both Bar and Pie charts
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement // Register ArcElement for Pie charts
);

const App = () => {
  const [transactions, setTransactions] = useState([]);
  const [month, setMonth] = useState("March");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [barData, setBarData] = useState({});
  const [pieData, setPieData] = useState({});
  const [stats, setStats] = useState({
    totalSaleAmount: 0,
    totalSoldItems: 0,
    totalNotSoldItems: 0,
  });
  const itemsPerPage = 10;
  const chartInstanceRef = useRef(null); 

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  useEffect(() => {
    fetchTransactions();
    fetchStatistics();
      fetchBarChartData();
      fetchPieChartData();
  }, [month, page, search]);
  
  const fetchTransactions = async () => {
    try {
      // If there's a search term, reset page to 1
      const currentPage = search ? 1 : page;
      const { data } = await axios.get(
        `http://localhost:8070/api/transactions?page=${currentPage}&perPage=${itemsPerPage}&search=${search}&month=${month}`
      );
      setTransactions(data.transactions);
      setTotalTransactions(data.total);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };
  const fetchStatistics = async () => {
    try {
      const { data } = await axios.get(`http://localhost:8070/api/transactions/statistics?&month=${month}`);
      setStats(data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const fetchBarChartData = async () => {
    try {
      const { data } = await axios.get(`http://localhost:8070/api/transactions/bar-chart?&month=${month}`);
  
      // Transform the data into the format required by Chart.js
      const labels = data.map(item => item.range);
      const values = data.map(item => item.count);
      setBarData({
        labels: labels,
        datasets: [{
          label: 'Number of Items',
          data: values,
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      });
    } catch (error) {
      console.error('Error fetching bar chart data:', error);
    }
  };
  

  const fetchPieChartData = async () => {
    try {
      const { data } = await axios.get(`http://localhost:8070/api/transactions/pie-chart?&month=${month}`);
      const categories = Object.keys(data); // Extracts the keys (categories)
      const values = Object.values(data);   // Extracts the values (counts)
      setPieData({
        labels: categories,
        datasets: [{
          data: values,
          backgroundColor: [
            'rgba(255, 99, 132, 0.2)',
            'rgba(54, 162, 235, 0.2)',
            'rgba(255, 206, 86, 0.2)',
            'rgba(75, 192, 192, 0.2)',
            'rgba(153, 102, 255, 0.2)',
            'rgba(255, 159, 64, 0.2)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)'
          ],
          borderWidth: 1
        }]
      });
    } catch (error) {
      console.error('Error fetching pie chart data:', error);
    }
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1); // Reset to page 1 when searching
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || (newPage - 1) * itemsPerPage >= totalTransactions)
      return; // Prevent going to invalid pages
    setPage(newPage);
  };

  const truncateText = (text, maxLength) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  return (
    <div className="App">
      <div className="title">
        <h1>Transaction Dashboard</h1>
      </div>

      <div className="selectorContainer">
        {/* Search Box */}
        <input
          type="text"
          placeholder="Search transaction"
          value={search}
          className="searchBox"
          onChange={handleSearchChange}
        />

        {/* Month Selector */}
        <select
          className="selectorBox"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        >
          {months.map((month) => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
        </select>
      </div>

      <div className="tableContainer">
        {/* Transaction Table */}
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Description</th>
              <th>Price</th>
              <th>Category</th>
              <th>Sold</th>
              <th>Image</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>{transaction.id}</td>
                <td>{truncateText(transaction.title, 40)}</td>
                <td>{truncateText(transaction.description, 50)}</td>
                <td>${transaction.price.toFixed(2)}</td>{" "}
                <td>{transaction.category}</td>
                <td>{transaction.sold ? "Yes" : "No"}</td>
                <td>
                  <img
                    style={{ width: "50px", height: "50px" }}
                    src={transaction.image}
                    alt={truncateText(transaction.title, 20)}
                  />
                </td>{" "}
                {/* Display image */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="paginationControls">
        {/* page no */}
        <span>Page No : {page}</span>

        {/* prev & next button */}
        <div>
          <button
            className="PaginationButtons"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
          >
            Previous
          </button>
          -
          <button
            className="PaginationButtons"
            onClick={() => handlePageChange(page + 1)}
            disabled={(page - 1) * itemsPerPage >= totalTransactions}
          >
            Next
          </button>
        </div>

        {/* Items Per Page */}
        <span className="itemsPerPage">Per Page : {itemsPerPage}</span>
      </div>

      {/* Statistics */}
      <div className="statisticContainer">
        <h2>
          Statistics - {month} <span>(selected month from dropdown)</span>
        </h2>
        <div className="statisticContent">
          <p>
            <span>Total Sale Amount:</span> ${stats.totalSaleAmount}
          </p>
          <p>
            <span>Total Sold Items:</span> {stats.totalSoldItems}
          </p>
          <p>
            <span>Total Not Sold Items:</span> {stats.totalNotSoldItems}
          </p>
        </div>
      </div>

      {/* Bar Chart */}
      {/* Bar Chart */}
<div className="barGraphConatiner">
  <h2>
    Bar Chart Statistics - {month} <span>(selected month from dropdown)</span>
  </h2>
  {barData.labels && barData.labels.length > 0 ? (
    <Bar
      data={barData}
      options={{
        plugins: {
          title: {
            display: true,
            text: 'Number of Items by Price Range'
          }
        },
        responsive: true,
        maintainAspectRatio: false,
      }}
    />
  ) : (
    <p>Loading chart data...</p>
  )}
</div>


       {/* Pie Chart */}
       <div className="pieChartContainer">
        <h2>
          Category Distribution - {month}{" "}
          <span>(selected month from dropdown)</span>
        </h2>
        {pieData.labels && pieData.labels.length > 0 ? (
          <Pie
            data={pieData}
            options={{
              plugins: {
                legend: {
                  position: "top",
                },
                tooltip: {
                  callbacks: {
                    label: (tooltipItem) =>
                      `${tooltipItem.label}: ${tooltipItem.raw}`,
                  },
                },
              },
            }}
          />
        ) : (
          <p>Loading pie data...</p>
        )}
      </div>
    </div>
  );
};

export default App;

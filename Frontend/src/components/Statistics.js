import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Statistics = ({ month }) => {
  const [statistics, setStatistics] = useState({});

  useEffect(() => {
    fetchStatistics();
  }, [month]);

  const fetchStatistics = async () => {
    const response = await axios.get('http://localhost:5000/api/statistics', { params: { month } });
    setStatistics(response.data);
  };

  return (
    <div>
      <h3>Statistics for {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}</h3>
      <p>Total Sale Amount: ${statistics.totalSaleAmount}</p>
      <p>Total Sold Items: {statistics.totalSoldItems}</p>
      <p>Total Not Sold Items: {statistics.totalNotSoldItems}</p>
    </div>
  );
};

export default Statistics;

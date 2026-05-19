import { useEffect, useState } from "react";
import axios from "axios";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const API_BASE_URL = import.meta.env.VITE_API_URL;
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");

    axios
      .get(`${API_BASE_URL}/dashboard/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => setStats(res.data))
      .catch((err) => console.error(err));
  }, []);

  if (!stats) return <p>Loading dashboard...</p>;

  return (
    <section className="admin-dashboard">
      <div className="dashboard-container">
        <h1>Admin Dashboard</h1>

        <div className="stats-grid">
          <div className="stat-card">
            <p>Total Products</p>
            <h2>{stats.totalProducts}</h2>
          </div>

          <div className="stat-card">
            <p>Total Orders</p>
            <h2>{stats.totalOrders}</h2>
          </div>

          <div className="stat-card">
            <p>Pending Orders</p>
            <h2>{stats.pendingOrders}</h2>
          </div>

          <div className="stat-card">
            <p>Total Revenue</p>
            <h2>${stats.totalRevenue.toFixed(2)}</h2>
          </div>
        </div>

        <div className="recent-orders">
          <h2>Recent Orders</h2>

          {stats.recentOrders.map((order) => (
            <div key={order.id} className="recent-order-card">
              <div>
                <strong>Order #{order.id}</strong>
                <p>{order.full_name || "Unknown customer"}</p>
              </div>

              <div>
                <p>${Number(order.total).toFixed(2)}</p>
                <span>{order.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
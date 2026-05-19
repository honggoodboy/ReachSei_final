import { Link, useNavigate } from "react-router-dom";
import "./AdminLayout.css";

export default function AdminLayout({ children }) {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("adminToken");
    navigate("/admin/login");
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h2>Reachsei Admin</h2>

        <nav>
          <Link to="/admin/dashboard">Dashboard</Link>
          <Link to="/admin/products">Products</Link>
          <Link to="/admin/products/new">Add Product</Link>
          <Link to="/admin/orders">Orders</Link>
          <Link to="/admin/reviews">Reviews</Link>
        </nav>

        <button onClick={logout}>Logout</button>
      </aside>

      <main className="admin-main">{children}</main>
    </div>
  );
}
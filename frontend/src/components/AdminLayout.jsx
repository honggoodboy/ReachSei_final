import { NavLink, useNavigate } from "react-router-dom";
import "./AdminLayout.css";

const navItems = [
  {
    label: "Dashboard",
    path: "/admin/dashboard",
    icon: "https://img.icons8.com/?size=100&id=zZWdn0zBfMOR&format=png&color=000000",
  },
  {
    label: "Products",
    path: "/admin/products",
    icon: "https://img.icons8.com/?size=100&id=12091&format=png&color=000000",
  },
  {
    label: "Add Product",
    path: "/admin/products/new",
    icon: "https://img.icons8.com/?size=100&id=84991&format=png&color=000000",
  },
  {
    label: "Orders",
    path: "/admin/orders",
    icon: "https://img.icons8.com/?size=100&id=0DBkCUANmgoQ&format=png&color=000000",
  },
  {
    label: "Reviews",
    path: "/admin/reviews",
    icon: "https://img.icons8.com/?size=100&id=60609&format=png&color=000000",
  },
];

export default function AdminLayout({ children }) {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("adminToken");
    navigate("/admin/login");
  };

  return (
    <div className="admin-layout">

      {/* ================= DESKTOP SIDEBAR ================= */}
      <aside className="admin-sidebar">

        <div className="admin-sidebar-header">
          <h2>Reachsei Admin</h2>
        </div>

        <nav className="admin-sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `admin-sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <img src={item.icon} alt="" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <button className="admin-logout" onClick={logout}>
          Logout
        </button>

      </aside>


      {/* ================= MAIN CONTENT ================= */}
      <main className="admin-main">
        {children}
      </main>


      {/* ================= MOBILE BOTTOM NAV ================= */}
      <nav className="admin-mobile-nav">

        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `admin-mobile-link ${isActive ? "active" : ""}`
            }
          >
            <img src={item.icon} alt="" />
            <span>{item.label}</span>
          </NavLink>
        ))}

      </nav>

    </div>
  );
}
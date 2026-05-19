import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";
import logo from "../img/logo_reachsei.jpg";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openCategory, setOpenCategory] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [user, setUser] = useState(null);

  const { cartCount } = useCart();
  const navigate = useNavigate();

  const links = [
    { name: "Home", to: "/" },
    {
      name: "Products",
      children: [
        { name: "T-Shirts", to: "/products/tshirt" },
        { name: "Shorts", to: "/products/shorts" },
        { name: "Shoes", to: "/products/shoes" },
        { name: "Socks", to: "/products/socks" },
        { name: "Rackets", to: "/products/rackets" },
        { name: "Bags", to: "/products/bags" },
        { name: "Accessories", to: "/products/accessories" },
      ],
    },
    { name: "Newsletter", to: "/newsletter" },
    { name: "Contact", to: "/contact" },
  ];

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setShowSearch(false);
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen || showSearch ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [menuOpen, showSearch]);

  const handleSearch = (e) => {
    e.preventDefault();

    if (!searchText.trim()) return;

    navigate(`/search?q=${encodeURIComponent(searchText.trim())}`);
    setSearchText("");
    setMenuOpen(false);
    setShowSearch(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("userToken");
    localStorage.removeItem("user");
    setUser(null);
    setMenuOpen(false);
    navigate("/");
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          <Link className="logo" to="/">
            <img className="logo-mark" src={logo} alt="Reachsei Logo" />
            <Link to="/admin/login"><span className="logo-text">
              Reach<em>sei</em>
            </span></Link>
          </Link>

          <ul className="nav-menu">
            {links.map((link) => (
              <li key={link.name} className={link.children ? "dropdown" : ""}>
                {!link.children ? (
                  <Link to={link.to}>{link.name}</Link>
                ) : (
                  <>
                    <span className="nav-parent">{link.name} ▾</span>

                    <ul className="dropdown-menu">
                      {link.children.map((item) => (
                        <li key={item.name}>
                          <Link to={item.to}>{item.name}</Link>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </li>
            ))}
          </ul>

          <div className="nav-actions">
            <form className="search-pill desktop-search" onSubmit={handleSearch}>
              <span>🔍</span>
              <input
                type="text"
                placeholder="Search gear…"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </form>

            <button
              type="button"
              className="icon-btn mobile-search-btn"
              onClick={() => setShowSearch(true)}
              aria-label="Open search"
            >
              🔍
            </button>
            <div className="desktop-profile">
  <Link to={user ? "/profile" : "/login"} className="profile-trigger">
    <span className="profile-avatar-small">
      {user ? user.name?.charAt(0).toUpperCase() : "👤"}
    </span>
    <span>{user ? user.name : "Profile"}</span>
  </Link>

  {user && (
    <div className="profile-menu">
      <Link to="/profile">Profile</Link>
      <Link to="/my-orders">My Orders</Link>
      <Link to="/wishlist">Wishlist</Link>
      <button type="button" onClick={handleLogout}>
        Logout
      </button>
    </div>
  )}
</div>
            <Link className="icon-btn" to="/cart" aria-label="Cart">
              🛒
              <span className="cart-count">{cartCount}</span>
            </Link>

            <button
              className="hamburger-btn"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              ☰
            </button>
          </div>
        </div>
      </nav>

      {showSearch && (
        <div className="search-overlay">
          
          <form onSubmit={handleSearch} className="search-overlay-box">
            <input
              type="text"
              placeholder="Search products..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              autoFocus
            />

            <button type="submit">Search</button>

            <button
              type="button"
              className="close-search"
              onClick={() => setShowSearch(false)}
            >
              ✕
            </button>
          </form>
        </div>
      )}

      <div
        className={`menu-overlay ${menuOpen ? "show" : ""}`}
        onClick={() => setMenuOpen(false)}
      />

      <aside className={`mobile-drawer ${menuOpen ? "open" : ""}`}>
        <div className="drawer-header">
          <div className="drawer-logo">
            <img className="logo-mark" src={logo} alt="Reachsei Logo" />
            <span className="logo-text">
              Reach<em>sei</em>
            </span>
          </div>

          <button
            className="close-btn"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <div className="drawer-account">
          <Link
            to={user ? "/profile" : "/login"}
            onClick={() => setMenuOpen(false)}
            className="drawer-account-card"
          >
            <span className="drawer-avatar">
              {user ? user.name?.charAt(0).toUpperCase() : "👤"}
            </span>

            <div>
              <h3>{user ? user.name : "My Account"}</h3>
              <p>{user ? "View profile" : "Login / Register"}</p>
            </div>

            <span className="drawer-arrow">›</span>
          </Link>
        </div>

        <div className="drawer-links">
          <Link to="/" onClick={() => setMenuOpen(false)}>
            🏠 Home <span>›</span>
          </Link>

          <div
            className="drawer-category"
            onClick={() =>
              setOpenCategory(openCategory === "Products" ? null : "Products")
            }
          >
            🛍️ Shop <span>›</span>
          </div>

          {openCategory === "Products" && (
            <div className="drawer-sub">
              {links[1].children.map((item) => (
                <Link
                  key={item.name}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          )}

          {user && (
            <Link to="/my-orders" onClick={() => setMenuOpen(false)}>
              📦 My Orders <span>›</span>
            </Link>
          )}

          <Link to="/wishlist" onClick={() => setMenuOpen(false)}>
            ♡ Wishlist <span>›</span>
          </Link>

          <Link to="/newsletter" onClick={() => setMenuOpen(false)}>
            ✉️ Newsletter <span>›</span>
          </Link>

          <Link to="/contact" onClick={() => setMenuOpen(false)}>
            ☎️ Contact <span>›</span>
          </Link>
        </div>

        <div className="drawer-extra">
          {user ? (
            <button className="drawer-logout" onClick={handleLogout}>
              Logout
            </button>
          ) : (
            <Link
              className="drawer-btn"
              to="/login"
              onClick={() => setMenuOpen(false)}
            >
              Login / Register
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
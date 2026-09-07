import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";

import logo from "../img/logo_reachsei.png";
import searchIcon from "../assets/search-icon.png";
import cartIcon from "../assets/cart-icon.png";
import { useCart } from "../context/CartContext";

const ICONS = {
  home: "https://img.icons8.com/?size=100&id=EkVS0vhJIaAl&format=png&color=000000",
  products: "https://img.icons8.com/?size=100&id=VksxHreSn4ck&format=png&color=000000",
  orders: "https://img.icons8.com/?size=100&id=RlNoi5xwjZXe&format=png&color=000000",
  account: "https://img.icons8.com/?size=100&id=H101gtpJBVoh&format=png&color=000000",
};

const productCategories = [
  { name: "T-Shirts", to: "/products/tshirt" },
  { name: "Shorts", to: "/products/shorts" },
  { name: "Skirts", to: "/products/skirts" },
  { name: "Shoes", to: "/products/shoes" },
  { name: "Socks", to: "/products/socks" },
  { name: "Jackets", to: "/products/jackets" },
  { name: "Rackets", to: "/products/rackets" },
  { name: "Bags", to: "/products/bags" },
  { name: "Towels", to: "/products/towels" },
  { name: "Shuttlecocks", to: "/products/shuttlecocks" },
  { name: "Sports Care", to: "/products/sports-care" },
  { name: "Accessories", to: "/products/accessories" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [user, setUser] = useState(null);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const [desktopProductsOpen, setDesktopProductsOpen] = useState(false);

  const { cartCount } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = location.pathname.startsWith("/admin");

  useEffect(() => {
    const loadUser = () => {
      const savedUser = localStorage.getItem("user");

      if (!savedUser) {
        setUser(null);
        return;
      }

      try {
        setUser(JSON.parse(savedUser));
      } catch {
        setUser(null);
      }
    };

    loadUser();

    window.addEventListener("storage", loadUser);
    window.addEventListener("userUpdated", loadUser);

    return () => {
      window.removeEventListener("storage", loadUser);
      window.removeEventListener("userUpdated", loadUser);
    };
  }, [location.pathname]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== "Escape") return;

      setMenuOpen(false);
      setShowSearch(false);
      setMobileProductsOpen(false);
      setDesktopProductsOpen(false);
    };

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    const shouldLock = menuOpen || showSearch || mobileProductsOpen;
    document.body.style.overflow = shouldLock ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen, showSearch, mobileProductsOpen]);

  const closeAll = () => {
    setMenuOpen(false);
    setShowSearch(false);
    setMobileProductsOpen(false);
    setDesktopProductsOpen(false);
  };

  const handleSearch = (event) => {
    event.preventDefault();

    const value = searchText.trim();
    if (!value) return;

    navigate(`/search?q=${encodeURIComponent(value)}`);
    setSearchText("");
    closeAll();
  };

  const handleLogout = () => {
    localStorage.removeItem("userToken");
    localStorage.removeItem("user");

    setUser(null);
    closeAll();
    navigate("/");
  };

  const handleMobileProducts = () => {
    setMenuOpen(false);
    setMobileProductsOpen(true);
  };

  const handleCategorySelect = () => {
    setMobileProductsOpen(false);
  };

  return (
    <>
      {!isAdmin && (
        <>
          <nav className="navbar">
            <div className="nav-container">
              {/* LOGO */}
              <Link className="logo" to="/" onClick={closeAll}>
                <img
                  className="logo-mark"
                  src={logo}
                  alt="Reachsei"
                />
                <span className="logo-text">
                  Reach<em>sei</em>
                </span>
              </Link>

              {/* DESKTOP MENU */}
              <ul className="nav-menu">
                <li>
                  <Link
                    to="/"
                    className={location.pathname === "/" ? "active" : ""}
                  >
                    Home
                  </Link>
                </li>

                <li
                  className="nav-dropdown"
                  onMouseEnter={() => setDesktopProductsOpen(true)}
                  onMouseLeave={() => setDesktopProductsOpen(false)}
                >
                  <button
                    type="button"
                    className={`nav-dropdown-button ${
                      location.pathname.startsWith("/products")
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setDesktopProductsOpen((open) => !open)
                    }
                    aria-expanded={desktopProductsOpen}
                  >
                    Products
                    <span className="dropdown-arrow">
                      {desktopProductsOpen ? "⌃" : "⌄"}
                    </span>
                  </button>

                  <div
                    className={`dropdown-menu ${
                      desktopProductsOpen ? "open" : ""
                    }`}
                  >
                    <div className="dropdown-title">
                      <span>SHOP</span>
                      <strong>Choose a category</strong>
                    </div>

                    <div className="dropdown-grid">
                      {productCategories.map((category) => (
                        <Link
                          key={category.name}
                          to={category.to}
                          onClick={() => setDesktopProductsOpen(false)}
                          className={
                            location.pathname === category.to
                              ? "selected"
                              : ""
                          }
                        >
                          {category.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </li>

                <li>
                  <Link
                    to="/newsletter"
                    className={
                      location.pathname.startsWith("/newsletter")
                        ? "active"
                        : ""
                    }
                  >
                    Newsletter
                  </Link>
                </li>

                <li>
                  <Link
                    to="/contact"
                    className={
                      location.pathname.startsWith("/contact")
                        ? "active"
                        : ""
                    }
                  >
                    Contact
                  </Link>
                </li>
              </ul>

              {/* ACTIONS */}
              <div className="nav-actions">
                <form
                  className="desktop-search"
                  onSubmit={handleSearch}
                >
                  <img
                    src={searchIcon}
                    alt=""
                    aria-hidden="true"
                    className="search-icon-img"
                  />
                  <input
                    type="text"
                    placeholder="Search gear..."
                    value={searchText}
                    onChange={(event) =>
                      setSearchText(event.target.value)
                    }
                    aria-label="Search products"
                  />
                </form>

                <button
                  type="button"
                  className="mobile-search-button"
                  onClick={() => setShowSearch(true)}
                  aria-label="Search"
                >
                  <img
                    src={searchIcon}
                    alt=""
                    aria-hidden="true"
                  />
                </button>

                <div className="desktop-profile">
                  <Link
                    to={user ? "/profile" : "/login"}
                    className="profile-trigger"
                  >
                    <span className="profile-avatar-small">
                      {user?.name
                        ? user.name.charAt(0).toUpperCase()
                        : "?"}
                    </span>
                    <span className="profile-name">
                      {user?.name || "Profile"}
                    </span>
                  </Link>

                  {user && (
                    <div className="profile-menu">
                      <Link to="/profile">Profile</Link>
                      <Link to="/my-orders">My Orders</Link>
                      <Link to="/wishlist">Wishlist</Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>

                <Link
                  className="cart-button"
                  to="/cart"
                  aria-label="Shopping cart"
                >
                  <img
                    src={cartIcon}
                    alt=""
                    aria-hidden="true"
                  />
                  {Number(cartCount) > 0 && (
                    <span className="cart-count">
                      {cartCount}
                    </span>
                  )}
                </Link>

                <button
                  type="button"
                  className="hamburger-button"
                  onClick={() => setMenuOpen(true)}
                  aria-label="Open menu"
                >
                  <span />
                  <span />
                  <span />
                </button>
              </div>
            </div>
          </nav>

          {/* SEARCH */}
          {showSearch && (
            <div
              className="search-overlay"
              onMouseDown={() => setShowSearch(false)}
            >
              <form
                className="search-overlay-box"
                onSubmit={handleSearch}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="search-overlay-input">
                  <img src={searchIcon} alt="" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchText}
                    onChange={(event) =>
                      setSearchText(event.target.value)
                    }
                    autoFocus
                  />
                </div>

                <button type="submit" className="search-submit">
                  Search
                </button>

                <button
                  type="button"
                  className="search-close"
                  onClick={() => setShowSearch(false)}
                  aria-label="Close search"
                >
                  ×
                </button>
              </form>
            </div>
          )}

          {/* MOBILE DRAWER */}
          <div
            className={`menu-overlay ${menuOpen ? "show" : ""}`}
            onClick={() => setMenuOpen(false)}
            aria-hidden={!menuOpen}
          />

          <aside
            className={`mobile-drawer ${menuOpen ? "open" : ""}`}
            aria-hidden={!menuOpen}
          >
            <div className="drawer-header">
              <Link
                to="/"
                className="drawer-logo"
                onClick={() => setMenuOpen(false)}
              >
                <img src={logo} alt="Reachsei" />
                <span>
                  Reach<em>sei</em>
                </span>
              </Link>

              <button
                type="button"
                className="drawer-close"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
              >
                ×
              </button>
            </div>

            <Link
              to={user ? "/profile" : "/login"}
              className="drawer-account-card"
              onClick={() => setMenuOpen(false)}
            >
              <span className="drawer-avatar">
                {user?.name
                  ? user.name.charAt(0).toUpperCase()
                  : "?"}
              </span>

              <span className="drawer-account-copy">
                <strong>{user?.name || "My Account"}</strong>
                <small>
                  {user ? "View your profile" : "Login / Register"}
                </small>
              </span>

              <span className="drawer-arrow">›</span>
            </Link>

            <div className="drawer-links">
              <Link
                to="/"
                onClick={() => setMenuOpen(false)}
              >
                <span>Home</span>
                <b>›</b>
              </Link>

              <button
                type="button"
                className="drawer-category-button"
                onClick={handleMobileProducts}
              >
                <span>Products</span>
                <b>›</b>
              </button>

              {user && (
                <Link
                  to="/my-orders"
                  onClick={() => setMenuOpen(false)}
                >
                  <span>My Orders</span>
                  <b>›</b>
                </Link>
              )}

              <Link
                to="/wishlist"
                onClick={() => setMenuOpen(false)}
              >
                <span>Wishlist</span>
                <b>›</b>
              </Link>

              <Link
                to="/newsletter"
                onClick={() => setMenuOpen(false)}
              >
                <span>Newsletter</span>
                <b>›</b>
              </Link>

              <Link
                to="/contact"
                onClick={() => setMenuOpen(false)}
              >
                <span>Contact</span>
                <b>›</b>
              </Link>
            </div>

            <div className="drawer-footer">
              {user ? (
                <button
                  type="button"
                  className="drawer-logout"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              ) : (
                <Link
                  to="/login"
                  className="drawer-login-button"
                  onClick={() => setMenuOpen(false)}
                >
                  Login / Register
                </Link>
              )}
            </div>
          </aside>

          {/* PRODUCT CATEGORY SHEET */}
          {mobileProductsOpen && (
            <div
              className="category-sheet-overlay"
              onMouseDown={() => setMobileProductsOpen(false)}
            >
              <section
                className="category-sheet"
                onMouseDown={(event) => event.stopPropagation()}
                aria-label="Product categories"
              >
                <div className="category-sheet-handle" />

                <div className="category-sheet-header">
                  <div>
                    <span>SHOP</span>
                    <h2>Choose a category</h2>
                    <p>Find the gear you need.</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMobileProductsOpen(false)}
                    aria-label="Close categories"
                  >
                    ×
                  </button>
                </div>

                <div className="category-grid">
                  {productCategories.map((category) => (
                    <Link
                      key={category.name}
                      to={category.to}
                      onClick={handleCategorySelect}
                      className={
                        location.pathname === category.to
                          ? "selected"
                          : ""
                      }
                    >
                      <span>{category.name}</span>
                      <b>›</b>
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* MOBILE / TABLET BOTTOM NAV */}
          <nav
            className="mobile-bottom-nav"
            aria-label="Mobile navigation"
          >
            <Link
              to="/"
              className={`mobile-bottom-item ${
                location.pathname === "/" ? "active" : ""
              }`}
              aria-label="Home"
            >
              <span className="bottom-nav-icon">
                <img src={ICONS.home} alt="" />
              </span>
              <small>Home</small>
            </Link>

            <button
              type="button"
              className={`mobile-bottom-item ${
                location.pathname.startsWith("/products") ||
                mobileProductsOpen
                  ? "active"
                  : ""
              }`}
              onClick={() => setMobileProductsOpen(true)}
              aria-label="Products"
              aria-expanded={mobileProductsOpen}
            >
              <span className="bottom-nav-icon">
                <img src={ICONS.products} alt="" />
              </span>
              <small>Products</small>
            </button>

            <Link
              to="/my-orders"
              className={`mobile-bottom-item ${
                location.pathname.startsWith("/my-orders")
                  ? "active"
                  : ""
              }`}
              aria-label="Orders"
            >
              <span className="bottom-nav-icon">
                <img src={ICONS.orders} alt="" />
              </span>
              <small>Orders</small>
            </Link>

            <Link
              to={user ? "/profile" : "/login"}
              className={`mobile-bottom-item ${
                location.pathname.startsWith("/profile") ||
                location.pathname.startsWith("/login")
                  ? "active"
                  : ""
              }`}
              aria-label="Account"
            >
              <span className="bottom-nav-icon">
                <img src={ICONS.account} alt="" />
              </span>
              <small>Account</small>
            </Link>
          </nav>
        </>
      )}
    </>
  );
}

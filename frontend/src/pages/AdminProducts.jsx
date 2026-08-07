import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "./AdminProducts.css";

const MASTER_CATEGORIES = [
  { slug: "tshirt", title: "T-Shirts", icon: "👕", match: ["tshirt", "t-shirt", "tshirts", "t-shirts"] },
  { slug: "shorts", title: "Shorts", icon: "🩳", match: ["short", "shorts"] },
  { slug: "skirts", title: "Skirts", icon: "👗", match: ["skirt", "skirts"] },
  { slug: "shoes", title: "Shoes", icon: "👟", match: ["shoe", "shoes"] },
  { slug: "socks", title: "Socks", icon: "🧦", match: ["sock", "socks"] },
  { slug: "rackets", title: "Rackets", icon: "🏸", match: ["racket", "rackets", "rocket", "rockets"] },
  { slug: "jackets", title: "Jackets", icon: "🧥", match: ["jacket", "jackets"] },
  { slug: "bags", title: "Bags", icon: "🎒", match: ["bag", "bags"] },
  { slug: "towels", title: "Towels", icon: "🧼", match: ["towel", "towels"] },
  { slug: "shuttlecocks", title: "Shuttlecocks", icon: "🪶", match: ["shuttlecock", "shuttlecocks"] },
  { slug: "sports-care", title: "Sports Care", icon: "🩹", match: ["sports-care", "sport-care"] },
  { slug: "accessories", title: "Accessories", icon: "🧢", match: ["accessory", "accessories"] },
];

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [viewMode, setViewMode] = useState("grouped"); // 'grouped' | 'grid'
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("adminToken");

  const fetchProducts = () => {
    setLoading(true);
    axios
      .get(`${API_BASE_URL}/products`)
      .then((res) => {
        setProducts(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const deleteProduct = async (id, productName) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${productName || "this product"}"?`
    );

    if (!confirmDelete) return;

    try {
      await axios.delete(`${API_BASE_URL}/products/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error(error);
      alert("Failed to delete product. Please try again.");
    }
  };

  // Helper to map raw product category to normalized category object
  const getCategoryInfo = (rawCategory) => {
    const clean = String(rawCategory || "").toLowerCase().trim();
    return MASTER_CATEGORIES.find((cat) => cat.match.includes(clean)) || {
      slug: clean || "uncategorized",
      title: rawCategory ? (rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1)) : "Uncategorized",
      icon: "📦",
      match: [clean],
    };
  };

  // Compute category counts for tab badges
  const categoryCounts = useMemo(() => {
    const counts = { All: products.length };
    
    MASTER_CATEGORIES.forEach((cat) => {
      counts[cat.slug] = 0;
    });
    counts["uncategorized"] = 0;

    products.forEach((p) => {
      const info = getCategoryInfo(p.category);
      if (counts[info.slug] !== undefined) {
        counts[info.slug] += 1;
      } else {
        counts[info.slug] = (counts[info.slug] || 0) + 1;
      }
    });

    return counts;
  }, [products]);

  // Filter products by search text and selected category tab/dropdown
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const searchLower = searchText.toLowerCase().trim();
      const matchesSearch =
        !searchLower ||
        product.name?.toLowerCase().includes(searchLower) ||
        product.category?.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      if (selectedCategory === "All") return true;

      const catInfo = getCategoryInfo(product.category);
      return catInfo.slug === selectedCategory || product.category === selectedCategory;
    });
  }, [products, searchText, selectedCategory]);

  // Group filtered products by category for Category Grouped View
  const groupedProducts = useMemo(() => {
    const groups = [];

    // First map standard categories that have matching filtered products
    MASTER_CATEGORIES.forEach((cat) => {
      const items = filteredProducts.filter((p) => getCategoryInfo(p.category).slug === cat.slug);
      if (items.length > 0) {
        groups.push({
          category: cat,
          items,
        });
      }
    });

    // Check for custom/uncategorized products not in master categories
    const customItems = filteredProducts.filter((p) => {
      const info = getCategoryInfo(p.category);
      return !MASTER_CATEGORIES.some((mc) => mc.slug === info.slug);
    });

    if (customItems.length > 0) {
      groups.push({
        category: { slug: "uncategorized", title: "Uncategorized & Custom", icon: "📦" },
        items: customItems,
      });
    }

    return groups;
  }, [filteredProducts]);

  const renderProductCard = (p) => {
    const catInfo = getCategoryInfo(p.category);
    const isSoldOut = p.stock_status === "soldout";
    const isPreOrder = p.stock_status === "preorder";

    return (
      <div key={p.id} className="admin-product-card">
        <div className="admin-product-img-wrapper">
          <img src={p.image} alt={p.name} loading="lazy" />
          <span className="admin-cat-badge">
            {catInfo.icon} {catInfo.title}
          </span>
        </div>

        <div className="admin-product-info">
          <div className="admin-product-header">
            <h3>{p.name}</h3>
            <span className={`admin-stock-tag stock-${p.stock_status || "instock"}`}>
              {isSoldOut ? "Sold Out" : isPreOrder ? "Pre-Order" : "In Stock"}
            </span>
          </div>

          <div className="admin-product-details">
            <span className="admin-product-price">${Number(p.price).toFixed(2)}</span>
            {p.sizes && <span className="admin-product-sizes">Sizes: {p.sizes}</span>}
          </div>
          {p.description && <p className="admin-product-desc">{p.description}</p>}
        </div>

        <div className="admin-product-actions">
          <Link
            to={`/admin/products/edit/${p.id}`}
            className="edit-btn"
            title="Edit product"
          >
            ✏️ Edit
          </Link>

          <button
            className="delete-btn"
            onClick={() => deleteProduct(p.id, p.name)}
            title="Delete product"
          >
            🗑️ Delete
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className="admin-products-page">
      <div className="admin-products-container">
        {/* Page Top Header */}
        <div className="admin-products-head">
          <div>
            <h1>Manage Products by Category</h1>
            <p className="admin-subtitle">
              Easily view, edit, or delete inventory sorted by category
            </p>
          </div>

          <Link to="/admin/products/new" className="add-product-link">
            ＋ Add New Product
          </Link>
        </div>

        {/* Category Pills Bar */}
        <div className="category-pills-container">
          <button
            type="button"
            className={`category-pill ${selectedCategory === "All" ? "active" : ""}`}
            onClick={() => setSelectedCategory("All")}
          >
            📦 All Products
            <span className="pill-count">{categoryCounts["All"] || 0}</span>
          </button>

          {MASTER_CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.slug] || 0;
            return (
              <button
                key={cat.slug}
                type="button"
                className={`category-pill ${selectedCategory === cat.slug ? "active" : ""}`}
                onClick={() => setSelectedCategory(cat.slug)}
              >
                {cat.icon} {cat.title}
                <span className="pill-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Filters and View Mode Controls */}
        <div className="admin-filters-bar">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search product name, category, description..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            {searchText && (
              <button className="clear-search-btn" onClick={() => setSearchText("")}>
                ✕
              </button>
            )}
          </div>

          <div className="filter-controls">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-select"
            >
              <option value="All">All Categories ({products.length})</option>
              {MASTER_CATEGORIES.map((cat) => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.icon} {cat.title} ({categoryCounts[cat.slug] || 0})
                </option>
              ))}
              <option value="uncategorized">
                📦 Uncategorized ({categoryCounts["uncategorized"] || 0})
              </option>
            </select>

            <div className="view-mode-toggle">
              <button
                type="button"
                className={`view-btn ${viewMode === "grouped" ? "active" : ""}`}
                onClick={() => setViewMode("grouped")}
                title="Group products by category sections"
              >
                📂 Grouped View
              </button>
              <button
                type="button"
                className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
                onClick={() => setViewMode("grid")}
                title="View products in grid"
              >
                🔲 Grid View
              </button>
            </div>
          </div>
        </div>

        {/* Product Count & Active Filters Summary */}
        <div className="results-summary">
          <span>
            Showing <strong>{filteredProducts.length}</strong> of {products.length} products
          </span>
          {selectedCategory !== "All" && (
            <span className="active-filter-tag">
              Category: {getCategoryInfo(selectedCategory).title}
              <button onClick={() => setSelectedCategory("All")}>✕</button>
            </span>
          )}
          {searchText && (
            <span className="active-filter-tag">
              Search: "{searchText}"
              <button onClick={() => setSearchText("")}>✕</button>
            </span>
          )}
        </div>

        {/* Product Listing */}
        {loading ? (
          <div className="admin-loading-state">
            <div className="spinner"></div>
            <p>Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="no-products">
            <div className="no-products-icon">🔍</div>
            <h3>No products found</h3>
            <p>Try adjusting your category filter or search terms.</p>
            <button
              className="reset-filters-btn"
              onClick={() => {
                setSearchText("");
                setSelectedCategory("All");
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : viewMode === "grouped" ? (
          /* Category Grouped View */
          <div className="admin-category-groups">
            {groupedProducts.map(({ category, items }) => (
              <div key={category.slug} className="admin-category-section">
                <div className="category-section-header">
                  <div className="category-title-wrap">
                    <span className="cat-header-icon">{category.icon}</span>
                    <h2>{category.title}</h2>
                    <span className="category-item-count">
                      {items.length} {items.length === 1 ? "product" : "products"}
                    </span>
                  </div>
                </div>

                <div className="admin-product-list">
                  {items.map((p) => renderProductCard(p))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Grid View */
          <div className="admin-product-list grid-mode">
            {filteredProducts.map((p) => renderProductCard(p))}
          </div>
        )}
      </div>
    </section>
  );
}
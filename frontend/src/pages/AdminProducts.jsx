import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "./AdminProducts.css";

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const API_BASE_URL = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("adminToken");

  const fetchProducts = () => {
    axios
      .get(`${API_BASE_URL}/products`)
      .then((res) => setProducts(res.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const deleteProduct = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmDelete) return;

    try {
      await axios.delete(`${API_BASE_URL}/products/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      fetchProducts();
    } catch (error) {
      console.error(error);
      alert("Failed to delete product");
    }
  };

  const categories = [
    "All",
    ...new Set(products.map((p) => p.category).filter(Boolean)),
  ];

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchText.toLowerCase());

    const matchesCategory =
      selectedCategory === "All" ||
      product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <section className="admin-products-page">
      <div className="admin-products-container">
        <div className="admin-products-head">
          <h1>Manage Products</h1>

          <Link to="/admin/products/new" className="add-product-link">
            + Add Product
          </Link>
        </div>

        <div className="admin-filters">
          <input
            type="text"
            placeholder="🔍 Search products..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <p className="product-count">
          Showing {filteredProducts.length} of {products.length} products
        </p>

        <div className="admin-product-list">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((p) => (
              <div key={p.id} className="admin-product-card">
                <img src={p.image} alt={p.name} />

                <div>
                  <h3>{p.name}</h3>
                  <p>{p.category}</p>
                  <strong>${p.price}</strong>
                </div>

                <div className="admin-product-actions">
                  <Link
                    to={`/admin/products/edit/${p.id}`}
                    className="edit-btn"
                  >
                    Edit
                  </Link>

                  <button
                    className="delete-btn"
                    onClick={() => deleteProduct(p.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="no-products">
              No products found.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
import { useEffect, useState } from "react";
import axios from "axios";
import "./AddProduct.css";

export default function AddProduct() {
  const API_BASE_URL = import.meta.env.VITE_API_URL;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    sizes: "",
    stock_status: "instock",
  });

  const [image, setImage] = useState(null);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(null);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);

    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!image) {
      setMessage("Please choose an image.");
      return;
    }

    try {
      const token = localStorage.getItem("adminToken");

      const data = new FormData();
      data.append("name", formData.name);
      data.append("description", formData.description);
      data.append("price", formData.price);
      data.append("category", formData.category);
      data.append("sizes", formData.sizes);
      data.append("stock_status", formData.stock_status);
      data.append("image", image);

      await axios.post(`${API_BASE_URL}/products`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setMessage("Product added successfully.");

      setFormData({
        name: "",
        description: "",
        price: "",
        category: "",
        sizes: "",
        stock_status: "instock",
      });

      setImage(null);
      setPreview(null);
    } catch (error) {
      console.error(error);
      setMessage(error.response?.data?.error || "Failed to add product.");
    }
  };

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <section className="admin-page">
      <div className="admin-card">
        <h1>Seller Dashboard</h1>
        <h2>Add Product</h2>

        <form onSubmit={handleSubmit} className="add-product-form">
          <input
            type="text"
            name="name"
            placeholder="Product name"
            value={formData.name}
            onChange={handleChange}
            required
          />

          <textarea
            name="description"
            placeholder="Description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
            required
          />

          <input
            type="number"
            name="price"
            placeholder="Price"
            step="0.01"
            value={formData.price}
            onChange={handleChange}
            required
          />

          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
          >
            <option value="">Select category</option>
            <option value="tshirt">T-Shirt</option>
            <option value="shorts">Shorts</option>
            <option value="shoes">Shoes</option>
            <option value="socks">Socks</option>
            <option value="rackets">Rackets</option>
            <option value="bags">Bags</option>
            <option value="accessories">Accessories</option>
            <option value="sports-care">Sports Care</option>
            <option value="shuttlecocks">Shuttlecocks</option>
          </select>

          <input
            type="text"
            name="sizes"
            placeholder="Sizes e.g. S,M,L,XL"
            value={formData.sizes}
            onChange={handleChange}
          />

          <select
            name="stock_status"
            value={formData.stock_status}
            onChange={handleChange}
          >
            <option value="instock">In Stock</option>
            <option value="preorder">Pre-Order</option>
            <option value="soldout">Sold Out</option>
          </select>

          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            required
          />

          {preview && (
            <img src={preview} alt="Preview" className="image-preview" />
          )}

          <button type="submit">Save Product</button>
        </form>

        {message && <p className="form-message">{message}</p>}
      </div>
    </section>
  );
}
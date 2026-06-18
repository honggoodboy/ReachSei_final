import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./EditProduct.css";

export default function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_URL;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    sizes: "",
    stock_status: "instock",
  });

  const [currentImage, setCurrentImage] = useState("");
  const [newImage, setNewImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/products/${id}`)
      .then((res) => {
        const p = res.data;

        setFormData({
          name: p.name || "",
          description: p.description || "",
          price: p.price || "",
          category: p.category || "",
          sizes: p.sizes || "",
          stock_status: p.stock_status || "instock",
        });

        setCurrentImage(p.image || "");
      })
      .catch((err) => console.error(err));
  }, [id, API_BASE_URL]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setNewImage(file);

    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("adminToken");

      await axios.put(`${API_BASE_URL}/products/${id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setMessage("Product updated successfully.");

      setTimeout(() => {
        navigate("/admin/products");
      }, 800);
    } catch (error) {
      console.error(error);
      setMessage(error.response?.data?.error || "Failed to update product.");
    }
  };

  const handleImageUpdate = async () => {
    if (!newImage) {
      setMessage("Please choose a new image.");
      return;
    }

    try {
      const token = localStorage.getItem("adminToken");

      const data = new FormData();
      data.append("image", newImage);

      const res = await axios.put(`${API_BASE_URL}/products/${id}/image`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setCurrentImage(res.data.product.image);
      setNewImage(null);
      setPreview(null);
      setMessage("Image updated successfully.");
    } catch (error) {
      console.error(error);
      setMessage(error.response?.data?.error || "Failed to update image.");
    }
  };

  return (
    <section className="edit-product-page">
      <div className="edit-product-card">
        <div className="edit-product-head">
          <h1>Edit Product</h1>
          <Link to="/admin/products">← Back</Link>
        </div>

        <form onSubmit={handleUpdate} className="edit-product-form">
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Product name"
            required
          />

          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Description"
            rows="4"
          />

          <input
            name="price"
            type="number"
            step="0.01"
            value={formData.price}
            onChange={handleChange}
            placeholder="Price"
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
            <option value="skirt">Skirts</option>
            <option value="shoes">Shoes</option>
            <option value="socks">Socks</option>
            <option value="jackets">Jackets</option>
            <option value="rackets">Rackets</option>
            <option value="bags">Bags</option>
            <option value="towels">Towels</option>
            <option value="shuttlecocks">Shuttlecocks</option>
            <option value="sports-care">Sports Care</option>
            <option value="accessories">Accessories</option>
          </select>

          <input
            name="sizes"
            value={formData.sizes}
            onChange={handleChange}
            placeholder="Sizes e.g. S,M,L,XL"
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

          <button type="submit">Update Product</button>
        </form>

        <div className="edit-image-box">
          <h2>Product Image</h2>

          {currentImage && (
            <img
              src={preview || currentImage}
              alt="Product preview"
              className="edit-image-preview"
            />
          )}

          <input type="file" accept="image/*" onChange={handleImageChange} />

          <button type="button" onClick={handleImageUpdate}>
            Update Image
          </button>
        </div>

        {message && <p className="edit-message">{message}</p>}
      </div>
    </section>
  );
}
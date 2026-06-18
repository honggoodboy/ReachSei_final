import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { useWishlist } from "../context/WishlistContext";
import "./Products.css";
import { optimizeCloudinaryUrl } from "../utils/optimizeImage";

export default function Products() {
  const [products, setProducts] = useState([]);

  const { category } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const { addToCart } = useCart();
  const { showToast } = useToast();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const API_BASE_URL = import.meta.env.VITE_API_URL;

  const query = new URLSearchParams(location.search);
  const search = query.get("q");

  const categorySections = [
    {
      slug: "tshirt",
      title: "T-Shirts",
      match: ["tshirt", "t-shirt", "tshirts", "t-shirts"],
    },
    {
      slug: "shorts",
      title: "Shorts",
      match: ["short", "shorts", "short dress", "shorts & dresses"],
    },
    {
      slug: "shoes",
      title: "Shoes",
      match: ["shoe", "shoes"],
    },
    {
      slug: "socks",
      title: "Socks",
      match: ["sock", "socks"],
    },
    {
      slug: "rackets",
      title: "Rackets",
      match: ["racket", "rackets", "rocket", "rockets"],
    },
    {
      slug: "bags",
      title: "Bags",
      match: ["bag", "bags"],
    },
    {
      slug: "accessories",
      title: "Accessories",
      match: ["accessory", "accessories"],
    },
    {
      slug: "sports-care",
      title: "Sports Care",
      match: ["sports care", "sport care", "sports medicine"],
    },
    {
      slug: "shuttlecocks",
      title: "Shuttlecocks",
      match: ["shuttlecock", "shuttlecocks"],
    },
    
  ];

  const normalizeText = (text) => {
    return String(text || "")
      .toLowerCase()
      .trim();
  };

  const getStockLabel = (status) => {
    if (status === "preorder") return "Pre-Order";
    if (status === "soldout") return "Sold Out";
    return "In Stock";
  };

  const getCategoryInfo = (productCategory) => {
    const cleanCategory = normalizeText(productCategory);

    return categorySections.find((section) =>
      section.match.includes(cleanCategory)
    );
  };

  useEffect(() => {
    let url = `${API_BASE_URL}/products`;

    if (search) {
      url = `${API_BASE_URL}/products?search=${encodeURIComponent(search)}`;
    }

    axios
      .get(url)
      .then((res) => setProducts(res.data))
      .catch((err) => console.error(err));
  }, [search, API_BASE_URL]);

  const filteredProducts = useMemo(() => {
    if (!category) return products;

    return products.filter((product) => {
      const categoryInfo = getCategoryInfo(product.category);
      return categoryInfo?.slug === category;
    });
  }, [products, category]);

  const groupedProducts = useMemo(() => {
    const groups = {};

    categorySections.forEach((section) => {
      groups[section.slug] = [];
    });

    products.forEach((product) => {
      const categoryInfo = getCategoryInfo(product.category);

      if (categoryInfo) {
        groups[categoryInfo.slug].push(product);
      }
    });

    return groups;
  }, [products]);

  const handleAddToCart = (product) => {
    const isSoldOut = product.stock_status === "soldout";

    if (isSoldOut) return;

    if (product.sizes) {
      navigate(`/products/detail/${product.id}`);
      return;
    }

    addToCart({
      ...product,
      size: "",
      selectedSize: "",
      cartId: `${product.id}-default`,
      price: Number(product.price) || 0,
    });

    showToast(`${product.name} added to cart`);
  };

  const renderProductCard = (product) => {
    const isSoldOut = product.stock_status === "soldout";

    return (
      <div key={product.id} className="product-card">
        <div className="pro-img">
          <Link to={`/products/detail/${product.id}`}>
            <img
  src={optimizeCloudinaryUrl(product.image, 500)}
  alt={product.name}
  loading="lazy"
  className="product-image"
/>
          </Link>

          <button
            type="button"
            className={`pro-fav ${
              isInWishlist(product.id) ? "active" : ""
            }`}
            onClick={() => toggleWishlist(product)}
          >
            {isInWishlist(product.id) ? "♥" : "♡"}
          </button>

          <button
            type="button"
            className="pro-add"
            disabled={isSoldOut}
            onClick={() => handleAddToCart(product)}
          >
            {isSoldOut
              ? "Sold Out"
              : product.sizes
              ? "Choose Size"
              : "＋ Add to Cart"}
          </button>
        </div>

        <div className="pro-body">
          <p className="pro-brand-tag">{product.category}</p>

          <Link to={`/products/detail/${product.id}`} className="pro-name">
            {product.name}
          </Link>

          <p className={`pro-stock stock-${product.stock_status || "instock"}`}>
            {getStockLabel(product.stock_status)}
          </p>

          <div className="pro-price-row">
            <span className="pro-price">${product.price}</span>

            <span className="pro-stars">
              {"★".repeat(Math.round(product.average_rating || 0))}
              {"☆".repeat(5 - Math.round(product.average_rating || 0))}
            </span>

            <span className="pro-reviews">
              ({product.total_reviews || 0})
            </span>
          </div>
        </div>
      </div>
    );
  };

  const currentCategoryTitle =
    categorySections.find((item) => item.slug === category)?.title ||
    "Products";

  const isSearchPage = Boolean(search);
  const isCategoryPage = Boolean(category);
  const isHomeProductPage = !isSearchPage && !isCategoryPage;

  return (
    <section id="products" className="products">
      {(isSearchPage || isCategoryPage) && (
        <div className="products-back-wrapper">
          <button className="products-back-btn" onClick={() => navigate(-1)}>
            ← Back
          </button>
        </div>
      )}

      {isSearchPage && (
        <>
          <h2 className="section-title">Search: {search}</h2>

          <div className="product-grid">
            {products.length === 0 ? (
              <p>No products found</p>
            ) : (
              products.map((product) => renderProductCard(product))
            )}
          </div>
        </>
      )}

      {isCategoryPage && (
        <>
          <h2 className="section-title">{currentCategoryTitle}</h2>

          <div className="product-grid">
            {filteredProducts.length === 0 ? (
              <p>No products found in this category</p>
            ) : (
              filteredProducts.map((product) => renderProductCard(product))
            )}
          </div>
        </>
      )}

      {isHomeProductPage && (
        <>
          <h2 className="section-title">Products</h2>

          {categorySections.map((section) => {
  const items = groupedProducts[section.slug];

  if (!items || items.length === 0) return null;

  return (
    <div key={section.slug} className="product-category-section">
      <div className="category-section-head">
        <h3>{section.title}</h3>

        <Link
          to={`/products/${section.slug}`}
          className="view-all-link"
        >
          View All →
        </Link>
      </div>

      <div className="product-grid home-category-grid">
        {items.map((product) => renderProductCard(product))}
      </div>
    </div>
  );
})}
        </>
      )}
    </section>
  );
}
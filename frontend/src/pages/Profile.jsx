import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Profile.css";

export default function Profile() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const [imgError, setImgError] = useState(false);

  if (!user) {
    navigate("/login");
    return null;
  }

  const handleLogout = () => {
    localStorage.removeItem("userToken");
    localStorage.removeItem("user");
    navigate("/");
  };

  const showPhoto = user.avatar_url && !imgError;

  return (
    <section className="profile-page">
      <div className="profile-card">
        <div className={`profile-avatar ${showPhoto ? "has-img" : ""}`}>
          {showPhoto ? (
            <img
              src={user.avatar_url}
              alt={user.name || "Profile"}
              className="profile-avatar-img"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
          ) : (
            user.name?.charAt(0).toUpperCase() || "?"
          )}
        </div>

        <h1>{user.name}</h1>
        <p>{user.email}</p>

        <div className="profile-links">
          <Link to="/profile/edit">Edit Profile</Link>
          <Link to="/my-orders">My Orders</Link>
          <Link to="/wishlist">Wishlist</Link>
        </div>

        <button onClick={handleLogout}>Logout</button>
      </div>
    </section>
  );
}
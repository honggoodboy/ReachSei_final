import { Link, useNavigate } from "react-router-dom";
import "./Profile.css";

export default function Profile() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user) {
    navigate("/login");
    return null;
  }

  const handleLogout = () => {
    localStorage.removeItem("userToken");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <section className="profile-page">
      <div className="profile-card">
        <div className="profile-avatar">
          {user.name?.charAt(0).toUpperCase()}
        </div>

        <h1>{user.name}</h1>
        <p>{user.email}</p>

        <div className="profile-links">
          <Link to="/profile/edit">Edit Profile</Link>
          <Link to="/profile/password">Change Password</Link>
          <Link to="/my-orders">My Orders</Link>
          <Link to="/wishlist">Wishlist</Link>
          <Link to="/">Continue Shopping</Link>
        </div>

        <button onClick={handleLogout}>Logout</button>
      </div>
    </section>
  );
}
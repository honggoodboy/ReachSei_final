import "./Footer.css";
import logo from "../img/logo_reachsei.jpg"
export default function Footer() {
  return (
    <footer id="footer" className="footer">
      <div className="footer-top">
        <div className="footer-col footer-brand">
          <div className="footer-logo">
            <img className="logo-mark" src={logo} alt="Reachsei Logo" />
            <span className="logo-text">
              <a href="">Reach<em>sei</em></a>
            </span>
          </div>

          <p>Professional badminton gear for players in Cambodia.</p>
          <p><strong>Address:</strong> Orkide Badminton</p>
          <p><strong>Phone:</strong> +855 96 684 8484</p>
          <p><strong>Hours:</strong> 8:00am – 10:00pm</p>
        </div>

        <div className="footer-col">
          <h4>About</h4>
          <a href="/">About Us</a>
          <a href="/">Delivery Info</a>
          <a href="/">Privacy Policy</a>
          <a href="/">Terms & Conditions</a>
        </div>

        <div className="footer-col">
          <h4>My Account</h4>
          <a href="/login">Sign In</a>
          <a href="/cart">View Cart</a>
          <a href="/">Wishlist</a>
          <a href="/">Track Order</a>
        </div>

        <div className="footer-col">
          <h4>Follow Us</h4>
          <a
            href="https://www.facebook.com/reachseibadminton/"
            target="_blank"
            rel="noreferrer"
          >
            Facebook
          </a>
          <a
            href="https://www.tiktok.com/@reachseibadminton"
            target="_blank"
            rel="noreferrer"
          >
            TikTok
          </a>
          <a
            href="https://t.me/reachseibadminton"
            target="_blank"
            rel="noreferrer"
          >
            Telegram
          </a>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 Reachsei Store. All rights reserved.</span>
        <span>Made with ❤️ for badminton lovers in Cambodia 🇰🇭</span>
      </div>
    </footer>
  );
}
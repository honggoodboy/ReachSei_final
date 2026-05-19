import "./Hero.css";

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-grid"></div>

      <div className="hero-inner">
        <div className="hero-left">
          <div className="hero-pill">
            <div className="hero-pill-dot">🏸</div>
            <span>New 2026 Collection is here</span>
          </div>

          <h1 className="hero-title">
            PLAY <br />
            <span className="line-yellow">BETTER.</span> <br />
            <span className="line-sky">WIN MORE.</span>
          </h1>

          <p className="hero-desc">
            Professional badminton gear from Yonex, Li-Ning, Victor & Mizuno.
            Every product built for the court — from beginner to champion.
          </p>

          <div className="hero-actions">
            <a href="#products" className="btn-sun">
              Shop Now →
            </a>
            <a href="#newsletter" className="btn-ghost">
              Get Deals ↗
            </a>
          </div>
        </div>

        <div className="hero-right">
          <div className="hero-card hero-card-main">
            <img src="/src/img/babushirt.jpg" alt="Jersey" />
            <div className="hero-card-info">
              <p className="hero-card-brand">BabuTeam</p>
              <p className="hero-card-name">OBC Fan Jersey 2026</p>
              <p className="hero-card-price">$19.99</p>
            </div>
          </div>

          <div className="hero-card hero-card-sm">
            <img src="/src/img/shoe1.jpg" alt="Shoes" />
            <div className="hero-card-info">
              <p className="hero-card-brand">Mizuno</p>
              <p className="hero-card-name">Court Shoes</p>
              <p className="hero-card-price">$8.00</p>
            </div>
          </div>

          <div className="hero-badge">⚡ 15–30% OFF Sale</div>
        </div>
      </div>
    </section>
  );
}
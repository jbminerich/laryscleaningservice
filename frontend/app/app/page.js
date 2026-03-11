import Image from "next/image";
import logo from "../Logo.png";

const services = [
  "Standard House Cleaning",
  "Deep Cleaning",
  "Move-In / Move-Out Cleaning",
  "Recurring Weekly / Bi-Weekly Cleaning",
  "Kitchen + Bathroom Detail Cleaning",
  "Office & Small Commercial Cleaning",
];

const highlights = [
  "Bonded & insured team",
  "Eco-friendly products available",
  "Simple booking and reliable arrival windows",
];

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <p className="eyebrow">House Cleaning • Reliable • Professional</p>
            <h1>Lary&apos;s Cleaning Services</h1>
            <p className="lead">
              A modern cleaning experience for busy households. We help you enjoy a fresh,
              calm, spotless home week after week.
            </p>
            <div className="cta-row">
              <a className="btn btn-primary" href="tel:+15555555555">
                Call for a Free Estimate
              </a>
              <a className="btn btn-secondary" href="/request-appointment">
                Request Appointment Online
              </a>
            </div>
          </div>

          <div className="logo-card">
            <Image
              src={logo}
              alt="Lary's Cleaning Services logo"
              width={440}
              height={440}
              priority
            />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Services Designed for Real Life</h2>
          <div className="card-grid">
            {services.map((service) => (
              <article className="card" key={service}>
                <h3>{service}</h3>
                <p>
                  Customized to your home layout, priorities, and preferred schedule for
                  dependable results.
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <h2>Why Homeowners Choose Us</h2>
          <ul className="checklist">
            {highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="container final-cta">
          <h2>Ready for a Cleaner Home?</h2>
          <p>
            Call or text <strong>(555) 555-5555</strong> and we&apos;ll help you pick the right
            cleaning plan.
          </p>
          <p>
            Prefer online booking? <a href="/request-appointment">Submit an appointment request</a>.
          </p>
        </div>
      </section>
    </main>
  );
}
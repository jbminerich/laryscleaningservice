import Image from "next/image";
import logo from "../Logo.png";

const services = [
  {
    title: "Standard Cleaning",
    icon: "🧼",
    items: [
      "Kitchen cleaning",
      "Bathroom cleaning",
      "Vacuum & mop floors",
      "Dusting surfaces",
      "Trash removal",
    ],
  },
  {
    title: "Deep Cleaning",
    icon: "✨",
    items: ["Baseboards", "Inside appliances", "Window sills", "Tile scrubbing"],
  },
  {
    title: "Move-In / Move-Out Cleaning",
    icon: "📦",
    items: [
      "Detailed empty-home reset",
      "Inside cabinets and closets",
      "Appliance wipe-down",
      "Ready-for-keys finish",
    ],
  },
  {
    title: "Recurring Cleaning",
    icon: "📅",
    items: ["Weekly", "Bi-weekly", "Monthly"],
  },
];

const reviews = [
  {
    quote:
      "Our home feels amazing every time. The team is always on time, friendly, and incredibly thorough.",
    name: "— Maria R., Seattle",
  },
  {
    quote:
      "We booked a deep clean before hosting family and it exceeded expectations. Highly recommend.",
    name: "— James T., Bellevue",
  },
  {
    quote:
      "Scheduling recurring service was easy and now we get consistent, reliable results every visit.",
    name: "— Priya N., Renton",
  },
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
            <p className="hero-headline">Professional House Cleaning in the Greater Seattle Area</p>
            <p className="lead">
              A modern cleaning experience for busy households. We help you enjoy a fresh,
              calm, spotless home week after week.
            </p>
            <div className="cta-row">
              <a className="btn btn-primary" href="tel:+14255004931">
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
              <article className="card" key={service.title}>
                <h3>
                  <span aria-hidden="true">{service.icon}</span> {service.title}
                </h3>
                <ul className="service-list">
                  {service.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <h2>Customer Reviews</h2>
          <div className="card-grid reviews-grid">
            {reviews.map((review) => (
              <article className="card review-card" key={review.name}>
                <p>&ldquo;{review.quote}&rdquo;</p>
                <p className="review-name">{review.name}</p>
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
            Call or text <strong>(425) 500-4931</strong> and we&apos;ll help you pick the right
            cleaning plan.
          </p>
          <p>
            Prefer online booking? <a href="/request-appointment">Submit an appointment request</a>.
          </p>
          <p>
            Learn more <a href="/about">about our business</a>.
          </p>
        </div>
      </section>
    </main>
  );
}
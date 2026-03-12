export const metadata = {
  title: "About | Lary's Cleaning Services",
  description:
    "Learn about Lary's Cleaning Services and our commitment to reliable, professional house cleaning in the Greater Seattle area.",
};

export default function AboutPage() {
  return (
    <main>
      <section className="section">
        <div className="container about-wrap">
          <p className="eyebrow">About Lary&apos;s Cleaning Services</p>
          <h1 className="request-title">A local team that cares about every home we clean</h1>
          <p>
            Lary&apos;s Cleaning Services is focused on helping families and busy professionals
            enjoy healthier, calmer homes without the stress of keeping up with everything on
            their own.
          </p>
          <p>
            We proudly serve homeowners across the Greater Seattle Area with dependable,
            detail-oriented cleaning and friendly customer service from the first call to every
            completed visit.
          </p>
          <h2>What you can expect from us</h2>
          <ul className="checklist">
            <li>Professional and respectful service every visit</li>
            <li>Flexible options for standard, deep, move-in/move-out, and recurring cleaning</li>
            <li>Consistent quality and clear communication</li>
            <li>A team committed to making your home feel fresh and welcoming</li>
          </ul>
          <p style={{ marginTop: "1rem" }}>
            Ready to get started? <a href="/request-appointment">Request your appointment online</a>{" "}
            or call us at <a href="tel:+14255004931">(425) 500-4931</a>.
          </p>
        </div>
      </section>
    </main>
  );
}
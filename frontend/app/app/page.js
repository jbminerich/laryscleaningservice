const services = [
  "Standard House Cleaning",
  "Deep Cleaning",
  "Move-In / Move-Out Cleaning",
  "Recurring Weekly / Bi-Weekly Cleaning",
];

export default async function HomePage() {
  let apiServices = [];
  const apiBase = process.env.INTERNAL_API_BASE_URL || "http://localhost:8000";

  try {
    const res = await fetch(`${apiBase}/services`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      apiServices = data.services || [];
    }
  } catch {
    // Fallback handled below
  }

  return (
    <main className="container">
      <h1>Lary&apos;s Cleaning Services</h1>
      <p className="lead">Reliable, detail-focused cleaning for homes and offices.</p>

      <section>
        <h2>Popular Services</h2>
        <ul>
          {services.map((service) => (
            <li key={service}>{service}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>API Service Catalog</h2>
        {apiServices.length > 0 ? (
          <ul>
            {apiServices.map((service) => (
              <li key={service.name}>
                <strong>{service.name}:</strong> {service.description}
              </li>
            ))}
          </ul>
        ) : (
          <p>API catalog unavailable right now. Backend may still be starting.</p>
        )}
      </section>

      <section>
        <h2>Book an Estimate</h2>
        <p>
          Call or text us to schedule your cleaning: <strong>(555) 555-5555</strong>
        </p>
      </section>
    </main>
  );
}
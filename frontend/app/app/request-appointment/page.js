"use client";

import { useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/apiBaseUrl";

const SERVICE_OPTIONS = [
  "Standard Cleaning",
  "Deep Cleaning",
  "Move-In / Move-Out Cleaning",
  "Office Cleaning",
];

const RECURRENCE_OPTIONS = [
  { label: "One-time", value: "none" },
  { label: "Weekly", value: "weekly" },
  { label: "Bi-weekly", value: "biweekly" },
  { label: "Monthly", value: "monthly" },
];

const emptyWindow = { start: "" };

async function parseApiResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const raw = await response.text();

  if (!raw) {
    return {};
  }

  const looksLikeHtml = raw.trimStart().startsWith("<!DOCTYPE") || raw.includes("<html");
  if (!contentType.includes("application/json") && looksLikeHtml) {
    return {
      detail:
        "Unable to reach the appointment API right now (received an HTML page instead of API response). Please try again in a moment.",
    };
  }

  try {
    return JSON.parse(raw);
  } catch {
    return { detail: "Unexpected server response. Please try again." };
  }
}

function getAppointmentRequestCandidates() {
  const candidates = ["/api", getApiBaseUrl()];

  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    candidates.push(`${origin}/api`);
    candidates.push(origin);
  }

  candidates.push("https://laryscleaningservices.org/api");
  candidates.push("https://laryscleaningservices.org");

  return [...new Set(candidates.map((value) => value.replace(/\/$/, "")))];
}

async function submitAppointmentRequest(payload) {
  const candidates = getAppointmentRequestCandidates();
  let lastError = "";

  for (const baseUrl of candidates) {
    const response = await fetch(`${baseUrl}/appointments/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const parsed = await parseApiResponse(response);
    if (response.ok) {
      return parsed;
    }

    if (response.status === 404) {
      lastError = parsed?.detail || "Endpoint not found.";
      continue;
    }

    throw new Error(parsed?.detail || "Unable to submit appointment request.");
  }

  throw new Error(
    lastError ||
      "Unable to reach the appointment API (all known endpoints returned 404). Please contact support."
  );
}

export default function RequestAppointmentPage() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    address: "",
    service_name: SERVICE_OPTIONS[0],
    recurrence: "none",
    notes: "",
  });
  const [windows, setWindows] = useState([emptyWindow]);
  const [status, setStatus] = useState({ loading: false, error: "", success: "" });

  const canAddWindow = useMemo(() => windows.length < 3, [windows.length]);

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function updateWindow(index, key, value) {
    setWindows((prev) =>
      prev.map((window, i) => (i === index ? { ...window, [key]: value } : window))
    );
  }

  function addWindow() {
    if (!canAddWindow) return;
    setWindows((prev) => [...prev, emptyWindow]);
  }

  function removeWindow(index) {
    if (windows.length === 1) return;
    setWindows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ loading: true, error: "", success: "" });

    const normalizedWindows = windows
      .filter((window) => window.start)
      .map((window) => ({
        start: new Date(window.start).toISOString(),
      }));

    if (normalizedWindows.length === 0) {
      setStatus({ loading: false, error: "Please add at least one valid preferred time window.", success: "" });
      return;
    }

    try {
      await submitAppointmentRequest({
        ...form,
        preferred_windows: normalizedWindows,
      });

      setStatus({
        loading: false,
        error: "",
        success:
          "Thanks! Your appointment request was submitted. We will follow up to confirm your final time.",
      });
      setForm({
        first_name: "",
        last_name: "",
        phone: "",
        email: "",
        address: "",
        service_name: SERVICE_OPTIONS[0],
        recurrence: "none",
        notes: "",
      });
      setWindows([emptyWindow]);
    } catch (error) {
      setStatus({ loading: false, error: error.message, success: "" });
    }
  }

  return (
    <main className="section">
      <div className="container request-wrap">
        <h1 className="request-title">Request an Appointment</h1>
        <p className="request-subtitle">
          Tell us about your home and your preferred times. We&apos;ll review and confirm your
          appointment.
        </p>

        <form className="request-form" onSubmit={handleSubmit}>
          <div className="field-grid two-col">
            <label>
              First name
              <input name="first_name" value={form.first_name} onChange={updateForm} required />
            </label>
            <label>
              Last name
              <input name="last_name" value={form.last_name} onChange={updateForm} required />
            </label>
          </div>

          <div className="field-grid two-col">
            <label>
              Phone
              <input name="phone" value={form.phone} onChange={updateForm} required />
            </label>
            <label>
              Email
              <input name="email" type="email" value={form.email} onChange={updateForm} required />
            </label>
          </div>

          <label>
            Service address
            <input name="address" value={form.address} onChange={updateForm} required />
          </label>

          <div className="field-grid two-col">
            <label>
              Service type
              <select name="service_name" value={form.service_name} onChange={updateForm}>
                {SERVICE_OPTIONS.map((service) => (
                  <option key={service} value={service}>
                    {service}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Recurrence
              <select name="recurrence" value={form.recurrence} onChange={updateForm}>
                {RECURRENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="window-list">
            <p className="window-title">Preferred time windows (up to 3)</p>
            {windows.map((window, index) => (
              <div className="field-grid three-col" key={`window-${index}`}>
                <label>
                  Preferred date/time
                  <input
                    type="datetime-local"
                    value={window.start}
                    onChange={(event) => updateWindow(index, "start", event.target.value)}
                    required
                  />
                </label>
                <button type="button" className="btn btn-secondary btn-small" onClick={() => removeWindow(index)}>
                  Remove
                </button>
              </div>
            ))}

            <button type="button" className="btn btn-secondary" onClick={addWindow} disabled={!canAddWindow}>
              Add another window
            </button>
          </div>

          <label>
            Notes (pets, gate code, priorities)
            <textarea name="notes" value={form.notes} onChange={updateForm} rows={4} />
          </label>

          {status.error && <p className="form-error">{status.error}</p>}
          {status.success && <p className="form-success">{status.success}</p>}

          <button className="btn btn-primary" type="submit" disabled={status.loading}>
            {status.loading ? "Submitting..." : "Submit Appointment Request"}
          </button>
        </form>
      </div>
    </main>
  );
}
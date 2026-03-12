"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "../../lib/apiBaseUrl";

const STATUS_OPTIONS = ["all", "requested", "confirmed", "proposed_time", "declined", "completed"];

async function parseApiResponse(response) {
  const raw = await response.text();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return { detail: "Unexpected server response. Please try again." };
  }
}

function toIso(value) {
  return value ? new Date(value).toISOString() : null;
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [adminToken, setAdminToken] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyAppointmentId, setBusyAppointmentId] = useState(null);

  const [confirmForm, setConfirmForm] = useState({});
  const [proposeForm, setProposeForm] = useState({});
  const [declineForm, setDeclineForm] = useState({});
  const [blockForm, setBlockForm] = useState({ start: "", end: "", reason: "" });

  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }
    setAdminToken(token);
  }, [router]);

  useEffect(() => {
    if (!adminToken) return;
    fetchAppointments(adminToken, statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken, statusFilter]);

  async function fetchAppointments(token, status) {
    setLoading(true);
    setError("");

    const query = status && status !== "all" ? `?status=${encodeURIComponent(status)}` : "";

    try {
      const response = await fetch(`${apiBaseUrl}/admin/appointments${query}`, {
        headers: { "x-admin-token": token },
      });

      const payload = await parseApiResponse(response);
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("adminToken");
          router.push("/admin/login");
          throw new Error("Session expired. Please sign in again.");
        }
        throw new Error(payload?.detail || "Failed to load appointments.");
      }

      setAppointments(payload.appointments || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      if (adminToken) {
        await fetch(`${apiBaseUrl}/admin/logout`, {
          method: "POST",
          headers: { "x-admin-token": adminToken },
        });
      }
    } finally {
      localStorage.removeItem("adminToken");
      router.push("/admin/login");
    }
  }

  function updateActionState(setter, appointmentId, key, value) {
    setter((prev) => ({
      ...prev,
      [appointmentId]: {
        ...(prev[appointmentId] || {}),
        [key]: value,
      },
    }));
  }

  async function performAppointmentAction(appointmentId, path, body, successMessage) {
    setBusyAppointmentId(appointmentId);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${apiBaseUrl}${path}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const payload = await parseApiResponse(response);
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("adminToken");
          router.push("/admin/login");
          throw new Error("Session expired. Please sign in again.");
        }
        throw new Error(payload?.detail || "Action failed.");
      }

      setNotice(successMessage);
      await fetchAppointments(adminToken, statusFilter);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyAppointmentId(null);
    }
  }

  async function handleConfirm(appointmentId) {
    const data = confirmForm[appointmentId] || {};
    if (!data.start || !data.end) {
      setError("Please provide scheduled start and end times for confirm.");
      return;
    }

    await performAppointmentAction(
      appointmentId,
      `/admin/appointments/${appointmentId}/confirm`,
      {
        scheduled_start: toIso(data.start),
        scheduled_end: toIso(data.end),
        admin_notes: data.notes || null,
      },
      `Appointment #${appointmentId} confirmed.`
    );
  }

  async function handlePropose(appointmentId) {
    const data = proposeForm[appointmentId] || {};
    if (!data.start || !data.end) {
      setError("Please provide proposed start and end times.");
      return;
    }

    await performAppointmentAction(
      appointmentId,
      `/admin/appointments/${appointmentId}/propose`,
      {
        proposed_start: toIso(data.start),
        proposed_end: toIso(data.end),
        admin_notes: data.notes || null,
      },
      `New time proposed for #${appointmentId}.`
    );
  }

  async function handleDecline(appointmentId) {
    const reason = declineForm[appointmentId]?.reason;
    if (!reason) {
      setError("Please include a decline reason.");
      return;
    }

    await performAppointmentAction(
      appointmentId,
      `/admin/appointments/${appointmentId}/decline`,
      { reason },
      `Appointment #${appointmentId} declined.`
    );
  }

  async function handleComplete(appointmentId) {
    await performAppointmentAction(
      appointmentId,
      `/admin/appointments/${appointmentId}/complete`,
      null,
      `Appointment #${appointmentId} marked completed.`
    );
  }

  async function handleBlockAvailability(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!blockForm.start || !blockForm.end || !blockForm.reason.trim()) {
      setError("Please provide start, end, and reason for availability block.");
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/admin/availability/block`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken,
        },
        body: JSON.stringify({
          start: toIso(blockForm.start),
          end: toIso(blockForm.end),
          reason: blockForm.reason,
        }),
      });

      const payload = await parseApiResponse(response);
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("adminToken");
          router.push("/admin/login");
          throw new Error("Session expired. Please sign in again.");
        }
        throw new Error(payload?.detail || "Failed to block availability.");
      }

      setNotice("Availability blocked successfully.");
      setBlockForm({ start: "", end: "", reason: "" });
      await fetchAppointments(adminToken, statusFilter);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <main className="section">
      <div className="container admin-wrap">
        <div className="admin-header-row">
          <div>
            <h1 className="admin-title">Admin Dashboard</h1>
            <p className="admin-subtitle">Review requests, schedule appointments, and manage availability.</p>
          </div>
          <button className="btn btn-secondary" onClick={logout}>
            Logout
          </button>
        </div>

        <div className="admin-toolbar">
          <label>
            Filter status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>

        <form className="admin-panel" onSubmit={handleBlockAvailability}>
          <h2>Block Availability</h2>
          <div className="field-grid three-col">
            <label>
              Start
              <input
                type="datetime-local"
                value={blockForm.start}
                onChange={(event) => setBlockForm((prev) => ({ ...prev, start: event.target.value }))}
                required
              />
            </label>
            <label>
              End
              <input
                type="datetime-local"
                value={blockForm.end}
                onChange={(event) => setBlockForm((prev) => ({ ...prev, end: event.target.value }))}
                required
              />
            </label>
            <label>
              Reason
              <input
                value={blockForm.reason}
                onChange={(event) => setBlockForm((prev) => ({ ...prev, reason: event.target.value }))}
                placeholder="Time off / unavailable"
                required
              />
            </label>
          </div>
          <button className="btn btn-secondary" type="submit">
            Save Block
          </button>
        </form>

        {error && <p className="form-error">{error}</p>}
        {notice && <p className="form-success">{notice}</p>}

        {loading ? (
          <p>Loading appointments…</p>
        ) : appointments.length === 0 ? (
          <p>No appointments found for this filter.</p>
        ) : (
          <div className="admin-list">
            {appointments.map((appointment) => {
              const isBusy = busyAppointmentId === appointment.id;

              return (
                <article className="admin-card" key={appointment.id}>
                  <div className="admin-card-header">
                    <h3>#{appointment.id} • {appointment.customer_name}</h3>
                    <span className="admin-badge">{appointment.status}</span>
                  </div>

                  <p>
                    <strong>Service:</strong> {appointment.service_name} • <strong>Recurrence:</strong>{" "}
                    {appointment.recurrence}
                  </p>
                  <p>
                    <strong>Contact:</strong> {appointment.customer_email} / {appointment.customer_phone}
                  </p>
                  <p>
                    <strong>Address:</strong> {appointment.address}
                  </p>
                  <p>
                    <strong>Scheduled:</strong> {formatDate(appointment.scheduled_start)} -{" "}
                    {formatDate(appointment.scheduled_end)}
                  </p>
                  <p>
                    <strong>Notes:</strong> {appointment.notes || "—"}
                  </p>
                  <div>
                    <strong>Preferred windows:</strong>
                    <ul>
                      {(appointment.preferred_windows || []).map((window, idx) => (
                        <li key={`${appointment.id}-window-${idx}`}>
                          {formatDate(window.start)} - {formatDate(window.end)}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="admin-actions-grid">
                    <div className="admin-panel">
                      <h4>Confirm</h4>
                      <input
                        type="datetime-local"
                        onChange={(event) =>
                          updateActionState(setConfirmForm, appointment.id, "start", event.target.value)
                        }
                      />
                      <input
                        type="datetime-local"
                        onChange={(event) =>
                          updateActionState(setConfirmForm, appointment.id, "end", event.target.value)
                        }
                      />
                      <input
                        placeholder="Admin notes (optional)"
                        onChange={(event) =>
                          updateActionState(setConfirmForm, appointment.id, "notes", event.target.value)
                        }
                      />
                      <button
                        className="btn btn-primary"
                        onClick={() => handleConfirm(appointment.id)}
                        type="button"
                        disabled={isBusy}
                      >
                        Confirm
                      </button>
                    </div>

                    <div className="admin-panel">
                      <h4>Propose New Time</h4>
                      <input
                        type="datetime-local"
                        onChange={(event) =>
                          updateActionState(setProposeForm, appointment.id, "start", event.target.value)
                        }
                      />
                      <input
                        type="datetime-local"
                        onChange={(event) =>
                          updateActionState(setProposeForm, appointment.id, "end", event.target.value)
                        }
                      />
                      <input
                        placeholder="Admin notes (optional)"
                        onChange={(event) =>
                          updateActionState(setProposeForm, appointment.id, "notes", event.target.value)
                        }
                      />
                      <button
                        className="btn btn-secondary"
                        onClick={() => handlePropose(appointment.id)}
                        type="button"
                        disabled={isBusy}
                      >
                        Propose
                      </button>
                    </div>

                    <div className="admin-panel">
                      <h4>Decline / Complete</h4>
                      <input
                        placeholder="Decline reason"
                        onChange={(event) =>
                          updateActionState(setDeclineForm, appointment.id, "reason", event.target.value)
                        }
                      />
                      <div className="cta-row">
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleDecline(appointment.id)}
                          type="button"
                          disabled={isBusy}
                        >
                          Decline
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={() => handleComplete(appointment.id)}
                          type="button"
                          disabled={isBusy}
                        >
                          Complete
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
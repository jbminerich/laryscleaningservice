"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const trimmed = token.trim();
    if (!trimmed) {
      setError("Please enter your admin token.");
      return;
    }

    localStorage.setItem("adminToken", trimmed);
    router.push("/admin/dashboard");
  }

  return (
    <main className="section">
      <div className="container admin-wrap">
        <h1 className="admin-title">Admin Login</h1>
        <p className="admin-subtitle">Use your admin token to manage appointment requests.</p>

        <form className="request-form" onSubmit={handleSubmit}>
          <label>
            Admin token
            <input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Enter ADMIN_TOKEN"
              required
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="btn btn-primary" type="submit">
            Continue to Dashboard
          </button>
        </form>
      </div>
    </main>
  );
}
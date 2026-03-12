import os
import secrets
import smtplib
from datetime import UTC, date, datetime, time, timedelta
from email.message import EmailMessage
from itertools import count
from typing import Literal

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field, field_validator

app = FastAPI(title="larys-cleaning-api", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://app.localhost",
        "http://localhost",
        "http://localhost:3000",
        "http://127.0.0.1",
        "https://laryscleaningservices.org",
        "https://www.laryscleaningservices.org",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SERVICES = [
    {
        "name": "Standard Cleaning",
        "duration_minutes": 120,
        "description": "Routine maintenance cleaning for kitchens, bathrooms, bedrooms, and common spaces.",
    },
    {
        "name": "Deep Cleaning",
        "duration_minutes": 240,
        "description": "Detailed top-to-bottom cleaning for move-ins, move-outs, and seasonal resets.",
    },
    {
        "name": "Move-In / Move-Out Cleaning",
        "duration_minutes": 300,
        "description": "Comprehensive cleaning to prepare homes for moving in or out.",
    },
    {
        "name": "Office Cleaning",
        "duration_minutes": 180,
        "description": "Reliable recurring cleaning for offices and small business spaces.",
    },
]

APPOINTMENT_BUFFER_MINUTES = 30
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "change-me-admin-token")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "change-me-password")
ADMIN_SESSION_HOURS = int(os.getenv("ADMIN_SESSION_HOURS", "12"))

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT") or "587")
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "")
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
APPOINTMENT_NOTIFICATION_TO = os.getenv(
    "APPOINTMENT_NOTIFICATION_TO", "ilariellysilva02@gmail.com"
)

customer_id_sequence = count(start=1)
appointment_id_sequence = count(start=1)
block_id_sequence = count(start=1)

customers: list[dict] = []
appointments: list[dict] = []
availability_blocks: list[dict] = []
admin_sessions: dict[str, datetime] = {}


class TimeWindow(BaseModel):
    start: datetime
    end: datetime | None = None

    @field_validator("end")
    @classmethod
    def validate_end_after_start(cls, value: datetime | None, info):
        if value is None:
            return value
        start = info.data.get("start")
        if start and value <= start:
            raise ValueError("end must be after start")
        return value


class AppointmentRequestIn(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    phone: str = Field(min_length=7, max_length=30)
    email: EmailStr
    address: str = Field(min_length=5, max_length=300)
    service_name: str
    preferred_windows: list[TimeWindow] = Field(min_length=1, max_length=3)
    recurrence: Literal["none", "weekly", "biweekly", "monthly"] = "none"
    notes: str | None = Field(default=None, max_length=1000)


class ConfirmAppointmentIn(BaseModel):
    scheduled_start: datetime
    scheduled_end: datetime
    admin_notes: str | None = Field(default=None, max_length=1000)


class ProposeAppointmentIn(BaseModel):
    proposed_start: datetime
    proposed_end: datetime
    admin_notes: str | None = Field(default=None, max_length=1000)


class DeclineAppointmentIn(BaseModel):
    reason: str = Field(min_length=2, max_length=300)


class AvailabilityBlockIn(BaseModel):
    start: datetime
    end: datetime
    reason: str = Field(min_length=2, max_length=200)


class AdminLoginIn(BaseModel):
    username: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=1, max_length=200)


def to_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def overlaps(start_a: datetime, end_a: datetime, start_b: datetime, end_b: datetime) -> bool:
    return start_a < end_b and start_b < end_a


def has_schedule_conflict(start: datetime, end: datetime, ignore_appointment_id: int | None = None) -> bool:
    buffered_start = start - timedelta(minutes=APPOINTMENT_BUFFER_MINUTES)
    buffered_end = end + timedelta(minutes=APPOINTMENT_BUFFER_MINUTES)

    for appointment in appointments:
        if appointment["id"] == ignore_appointment_id:
            continue
        if appointment["status"] != "confirmed":
            continue

        current_start = appointment.get("scheduled_start")
        current_end = appointment.get("scheduled_end")
        if current_start and current_end and overlaps(buffered_start, buffered_end, current_start, current_end):
            return True

    for block in availability_blocks:
        if overlaps(buffered_start, buffered_end, block["start"], block["end"]):
            return True

    return False


def require_admin(x_admin_token: str | None) -> None:
    if not x_admin_token:
        raise HTTPException(status_code=401, detail="Unauthorized")

    if x_admin_token == ADMIN_TOKEN:
        return

    cleanup_expired_admin_sessions()
    expires_at = admin_sessions.get(x_admin_token)
    if not expires_at or expires_at <= datetime.now(UTC):
        raise HTTPException(status_code=401, detail="Unauthorized")


def cleanup_expired_admin_sessions() -> None:
    now = datetime.now(UTC)
    expired_tokens = [token for token, expires_at in admin_sessions.items() if expires_at <= now]
    for token in expired_tokens:
        del admin_sessions[token]


def create_admin_session_token() -> tuple[str, datetime]:
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(UTC) + timedelta(hours=ADMIN_SESSION_HOURS)
    admin_sessions[token] = expires_at
    return token, expires_at


def get_or_create_customer(payload: AppointmentRequestIn) -> dict:
    existing = next((c for c in customers if c["email"].lower() == payload.email.lower()), None)
    if existing:
        existing.update(
            {
                "first_name": payload.first_name,
                "last_name": payload.last_name,
                "phone": payload.phone,
                "address": payload.address,
                "updated_at": datetime.now(UTC),
            }
        )
        return existing

    customer = {
        "id": next(customer_id_sequence),
        "first_name": payload.first_name,
        "last_name": payload.last_name,
        "phone": payload.phone,
        "email": payload.email,
        "address": payload.address,
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    }
    customers.append(customer)
    return customer


def send_appointment_notification(appointment: dict) -> None:
    if not SMTP_HOST or not SMTP_USERNAME or not SMTP_PASSWORD or not SMTP_FROM_EMAIL:
        print(
            "[email] Skipping appointment notification: missing SMTP_HOST/SMTP_USERNAME/"
            "SMTP_PASSWORD/SMTP_FROM_EMAIL"
        )
        return

    windows_text = "\n".join(
        [f"- {window['start'].isoformat()} to {window['end'].isoformat()}" for window in appointment["preferred_windows"]]
    )

    message = EmailMessage()
    message["Subject"] = f"New Appointment Request #{appointment['id']}"
    message["From"] = SMTP_FROM_EMAIL
    message["To"] = APPOINTMENT_NOTIFICATION_TO
    message.set_content(
        "\n".join(
            [
                "A new appointment request was submitted.",
                "",
                f"Appointment ID: {appointment['id']}",
                f"Name: {appointment['customer_name']}",
                f"Email: {appointment['customer_email']}",
                f"Phone: {appointment['customer_phone']}",
                f"Address: {appointment['address']}",
                f"Service: {appointment['service_name']}",
                f"Recurrence: {appointment['recurrence']}",
                "Preferred windows (UTC):",
                windows_text,
                "",
                "Notes:",
                appointment.get("notes") or "(none)",
            ]
        )
    )

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as smtp:
            if SMTP_USE_TLS:
                smtp.starttls()
            smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
            smtp.send_message(message)
    except Exception as exc:
        print(f"[email] Failed to send appointment notification: {exc}")


def serialize_appointment(appointment: dict) -> dict:
    return {
        **appointment,
        "preferred_windows": [
            {"start": window["start"], "end": window["end"]} for window in appointment["preferred_windows"]
        ],
    }


@app.get("/")
def root() -> dict:
    return {"service": "larys-cleaning-backend", "status": "ok"}


@app.get("/health")
def health() -> dict:
    return {"healthy": True}


@app.get("/services")
def services() -> dict:
    return {"services": SERVICES}


@app.post("/admin/login")
def admin_login(payload: AdminLoginIn) -> dict:
    if payload.username != ADMIN_USERNAME or payload.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    cleanup_expired_admin_sessions()
    token, expires_at = create_admin_session_token()

    return {
        "message": "Login successful",
        "admin_token": token,
        "expires_at": expires_at,
    }


@app.post("/admin/logout")
def admin_logout(x_admin_token: str | None = Header(default=None)) -> dict:
    if x_admin_token and x_admin_token in admin_sessions:
        del admin_sessions[x_admin_token]
    return {"message": "Logged out"}


def create_appointment_request(payload: AppointmentRequestIn) -> dict:
    service = next((service for service in SERVICES if service["name"] == payload.service_name), None)
    if not service:
        raise HTTPException(status_code=400, detail="Unknown service_name")

    customer = get_or_create_customer(payload)
    default_duration_minutes = int(service["duration_minutes"])
    preferred_windows = []
    for window in payload.preferred_windows:
        start = to_utc(window.start)
        end = to_utc(window.end) if window.end else start + timedelta(minutes=default_duration_minutes)
        preferred_windows.append({"start": start, "end": end})

    appointment = {
        "id": next(appointment_id_sequence),
        "customer_id": customer["id"],
        "customer_name": f"{customer['first_name']} {customer['last_name']}",
        "customer_email": customer["email"],
        "customer_phone": customer["phone"],
        "address": customer["address"],
        "service_name": payload.service_name,
        "preferred_windows": preferred_windows,
        "scheduled_start": None,
        "scheduled_end": None,
        "status": "requested",
        "recurrence": payload.recurrence,
        "notes": payload.notes,
        "admin_notes": None,
        "decline_reason": None,
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    }
    appointments.append(appointment)
    send_appointment_notification(appointment)

    return {
        "message": "Appointment request received",
        "appointment": serialize_appointment(appointment),
    }


@app.post("/appointments/request")
def request_appointment(payload: AppointmentRequestIn) -> dict:
    return create_appointment_request(payload)


@app.post("/api/appointments/request")
def request_appointment_api_prefixed(payload: AppointmentRequestIn) -> dict:
    # Supports environments where reverse proxy may not strip /api before forwarding.
    return create_appointment_request(payload)


@app.get("/availability")
def get_availability(day: date) -> dict:
    opening_hour = 8
    closing_hour = 18
    slot_minutes = 60
    slots: list[dict] = []

    for hour in range(opening_hour, closing_hour):
        slot_start = datetime.combine(day, time(hour=hour, minute=0, tzinfo=UTC))
        slot_end = slot_start + timedelta(minutes=slot_minutes)

        if has_schedule_conflict(slot_start, slot_end):
            continue

        slots.append({"start": slot_start, "end": slot_end})

    return {
        "date": day,
        "timezone": "UTC",
        "slots": slots,
        "buffer_minutes": APPOINTMENT_BUFFER_MINUTES,
    }


@app.get("/admin/appointments")
def list_admin_appointments(
    status: str | None = None,
    x_admin_token: str | None = Header(default=None),
) -> dict:
    require_admin(x_admin_token)
    records = appointments
    if status:
        records = [appointment for appointment in appointments if appointment["status"] == status]
    return {"appointments": [serialize_appointment(appointment) for appointment in records]}


@app.patch("/admin/appointments/{appointment_id}/confirm")
def confirm_appointment(
    appointment_id: int,
    payload: ConfirmAppointmentIn,
    x_admin_token: str | None = Header(default=None),
) -> dict:
    require_admin(x_admin_token)
    appointment = next((item for item in appointments if item["id"] == appointment_id), None)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    scheduled_start = to_utc(payload.scheduled_start)
    scheduled_end = to_utc(payload.scheduled_end)

    if scheduled_end <= scheduled_start:
        raise HTTPException(status_code=400, detail="scheduled_end must be after scheduled_start")

    if has_schedule_conflict(scheduled_start, scheduled_end, ignore_appointment_id=appointment_id):
        raise HTTPException(status_code=409, detail="Time slot conflicts with another appointment or blocked time")

    appointment["scheduled_start"] = scheduled_start
    appointment["scheduled_end"] = scheduled_end
    appointment["status"] = "confirmed"
    appointment["admin_notes"] = payload.admin_notes
    appointment["updated_at"] = datetime.now(UTC)

    return {"message": "Appointment confirmed", "appointment": serialize_appointment(appointment)}


@app.patch("/admin/appointments/{appointment_id}/propose")
def propose_appointment_time(
    appointment_id: int,
    payload: ProposeAppointmentIn,
    x_admin_token: str | None = Header(default=None),
) -> dict:
    require_admin(x_admin_token)
    appointment = next((item for item in appointments if item["id"] == appointment_id), None)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    proposed_start = to_utc(payload.proposed_start)
    proposed_end = to_utc(payload.proposed_end)

    if proposed_end <= proposed_start:
        raise HTTPException(status_code=400, detail="proposed_end must be after proposed_start")

    if has_schedule_conflict(proposed_start, proposed_end, ignore_appointment_id=appointment_id):
        raise HTTPException(status_code=409, detail="Proposed time conflicts with another appointment or blocked time")

    appointment["scheduled_start"] = proposed_start
    appointment["scheduled_end"] = proposed_end
    appointment["status"] = "proposed_time"
    appointment["admin_notes"] = payload.admin_notes
    appointment["updated_at"] = datetime.now(UTC)

    return {"message": "New time proposed", "appointment": serialize_appointment(appointment)}


@app.patch("/admin/appointments/{appointment_id}/decline")
def decline_appointment(
    appointment_id: int,
    payload: DeclineAppointmentIn,
    x_admin_token: str | None = Header(default=None),
) -> dict:
    require_admin(x_admin_token)
    appointment = next((item for item in appointments if item["id"] == appointment_id), None)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    appointment["status"] = "declined"
    appointment["decline_reason"] = payload.reason
    appointment["updated_at"] = datetime.now(UTC)

    return {"message": "Appointment declined", "appointment": serialize_appointment(appointment)}


@app.patch("/admin/appointments/{appointment_id}/complete")
def complete_appointment(
    appointment_id: int,
    x_admin_token: str | None = Header(default=None),
) -> dict:
    require_admin(x_admin_token)
    appointment = next((item for item in appointments if item["id"] == appointment_id), None)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    appointment["status"] = "completed"
    appointment["updated_at"] = datetime.now(UTC)

    return {"message": "Appointment marked completed", "appointment": serialize_appointment(appointment)}


@app.post("/admin/availability/block")
def create_availability_block(
    payload: AvailabilityBlockIn,
    x_admin_token: str | None = Header(default=None),
) -> dict:
    require_admin(x_admin_token)

    start = to_utc(payload.start)
    end = to_utc(payload.end)
    if end <= start:
        raise HTTPException(status_code=400, detail="end must be after start")

    if has_schedule_conflict(start, end):
        raise HTTPException(status_code=409, detail="Block conflicts with an existing confirmed appointment")

    block = {
        "id": next(block_id_sequence),
        "start": start,
        "end": end,
        "reason": payload.reason,
    }
    availability_blocks.append(block)

    return {"message": "Availability blocked", "block": block}
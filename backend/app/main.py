from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="larys-cleaning-api", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://app.localhost",
        "http://localhost",
        "http://127.0.0.1",
        "https://laryscleaningservices.org",
        "https://www.laryscleaningservices.org",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict:
    return {"service": "larys-cleaning-backend", "status": "ok"}


@app.get("/health")
def health() -> dict:
    return {"healthy": True}


@app.get("/services")
def services() -> dict:
    return {
        "services": [
            {
                "name": "Standard Cleaning",
                "description": "Routine maintenance cleaning for kitchens, bathrooms, bedrooms, and common spaces.",
            },
            {
                "name": "Deep Cleaning",
                "description": "Detailed top-to-bottom cleaning for move-ins, move-outs, and seasonal resets.",
            },
            {
                "name": "Office Cleaning",
                "description": "Reliable recurring cleaning for offices and small business spaces.",
            },
        ]
    }
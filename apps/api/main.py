"""FastAPI main application for Genome Firewall.

Explainable antimicrobial-resistance evidence review platform API.
"""

import uuid
import json
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from apps.api.config import settings
from db.seed import seed_database
from apps.api.routes import (
    auth,
    scope,
    samples,
    analyses,
    ast,
    discordance,
    benchmarks,
    demo,
    methodology,
    health,
    amrfinder,
    ml,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure database seeded
    try:
        await seed_database()
        print("Database verification & seed completed.")
    except Exception as e:
        print(f"Warning: Database seeding encountered: {e}")
    yield
    # Shutdown
    print("Genome Firewall API shutting down.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Explainable antimicrobial-resistance evidence review and discordance platform API.",
    docs_url="/docs",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-Id"],
)


# Correlation / Request ID Middleware
@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-Id") or f"req_{uuid.uuid4().hex[:12]}"
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-Id"] = request_id
    return response


# Global Exception Handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": f"HTTP_{exc.status_code}",
            "detail": exc.detail,
            "fieldErrors": [],
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    field_errors = []
    for err in exc.errors():
        field_errors.append({
            "field": ".".join(str(loc) for loc in err.get("loc", [])),
            "message": err.get("msg", "Validation error"),
        })
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "code": "VALIDATION_ERROR",
            "detail": "Request body or parameter validation failed.",
            "fieldErrors": field_errors,
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    print(f"Unhandled server error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "code": "INTERNAL_SERVER_ERROR",
            "detail": "An internal error occurred during request processing.",
            "fieldErrors": [],
        },
    )


# Include API v1 Routers
app.include_router(health.router)
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(scope.router, prefix=settings.API_V1_PREFIX)
app.include_router(samples.router, prefix=settings.API_V1_PREFIX)
app.include_router(analyses.router, prefix=settings.API_V1_PREFIX)
app.include_router(ast.router, prefix=settings.API_V1_PREFIX)
app.include_router(discordance.router, prefix=settings.API_V1_PREFIX)
app.include_router(benchmarks.router, prefix=settings.API_V1_PREFIX)
app.include_router(demo.router, prefix=settings.API_V1_PREFIX)
app.include_router(methodology.router, prefix=settings.API_V1_PREFIX)
app.include_router(amrfinder.router, prefix=settings.API_V1_PREFIX)
app.include_router(ml.router, prefix=settings.API_V1_PREFIX)


def export_openapi_schema(target_path: str = "contracts/openapi.json"):
    """Dumps current OpenAPI specification to target JSON file."""
    p = Path(target_path).resolve()
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(app.openapi(), f, indent=2)
    print(f"OpenAPI schema successfully exported to {target_path}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("apps.api.main:app", host="0.0.0.0", port=8000, reload=True)

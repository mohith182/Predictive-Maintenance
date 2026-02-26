"""
UptimeAI - FastAPI Backend
AI-Powered Predictive Maintenance Dashboard

Main application entry point
"""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import uvicorn
import logging
import sys

from config import settings

# Configure structured logging
logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('app.log') if not settings.DEBUG else logging.NullHandler()
    ]
)
logger = logging.getLogger(__name__)
from database import init_db, close_db
from routes.auth_routes import router as auth_router
from routes.prediction_routes import router as prediction_router
from routes.machine_routes import router as machine_router
from routes.advanced_routes import router as advanced_router
from ml_model import load_model, train_model
import os


# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting UptimeAI Backend...")
    logger.info(f"Environment: {settings.APP_ENV}")
    logger.info(f"Debug: {settings.DEBUG}")
    
    # Validate secrets in production
    if settings.APP_ENV == "production":
        try:
            settings.validate_secrets()
            logger.info("Secret validation passed")
        except ValueError as e:
            logger.error(f"Secret validation failed: {e}")
            raise
    
    # Initialize database
    try:
        await init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}", exc_info=True)
        if settings.APP_ENV == "production":
            raise
    
    # Load or train ML model
    try:
        model, scaler = load_model()
        if model is None:
            logger.warning("No trained model found. Training new model...")
            os.makedirs("ml", exist_ok=True)
            train_model()
        else:
            logger.info("ML models loaded successfully")
    except Exception as e:
        logger.error(f"ML model loading failed: {e}", exc_info=True)
        if settings.APP_ENV == "production":
            raise
    
    logger.info(f"Server ready at http://{settings.HOST}:{settings.PORT}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    await close_db()
    logger.info("Shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="UptimeAI API",
    description="AI-Powered Predictive Maintenance Dashboard API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware - Production-safe configuration
allowed_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
allowed_headers = [
    "Content-Type",
    "Authorization",
    "Accept",
    "Origin",
    "X-Requested-With",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=allowed_methods if settings.APP_ENV == "production" else ["*"],
    allow_headers=allowed_headers if settings.APP_ENV == "production" else ["*"],
    expose_headers=["X-Total-Count", "X-Request-ID"],
    max_age=3600,
)


# ====================
# Exception Handlers
# ====================

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors"""
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(x) for x in error["loc"]),
            "message": error["msg"]
        })
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Validation error", "errors": errors}
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected errors"""
    # Log the error
    logger.error(
        f"Unhandled exception: {exc}",
        exc_info=True,
        extra={"path": request.url.path, "method": request.method}
    )
    
    if settings.DEBUG:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": str(exc), "type": type(exc).__name__}
        )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"}
    )


# ====================
# Routes
# ====================

# Health check
@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "name": "UptimeAI API",
        "version": "1.0.0",
        "status": "running",
        "message": "AI-Powered Predictive Maintenance Dashboard"
    }


@app.get("/health")
async def health_check():
    """Detailed health check with dependency verification"""
    from ml_model import get_model_path
    import os
    from database import async_engine
    
    health_status = {
        "status": "healthy",
        "environment": settings.APP_ENV,
        "version": "1.0.0",
        "checks": {}
    }
    
    # Database check
    try:
        async with async_engine.begin() as conn:
            await conn.execute("SELECT 1")
        health_status["checks"]["database"] = "connected"
    except Exception as e:
        health_status["checks"]["database"] = f"error: {str(e)}"
        health_status["status"] = "degraded"
    
    # ML Model check
    try:
        model_path = get_model_path()
        if os.path.exists(model_path):
            health_status["checks"]["ml_model"] = "loaded"
        else:
            health_status["checks"]["ml_model"] = "using_simulation"
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["checks"]["ml_model"] = f"error: {str(e)}"
        health_status["status"] = "degraded"
    
    # Return appropriate status code
    status_code = 200 if health_status["status"] == "healthy" else 503
    
    return JSONResponse(content=health_status, status_code=status_code)


# Include routers
app.include_router(auth_router)
app.include_router(prediction_router)
app.include_router(machine_router)
app.include_router(advanced_router)


# ====================
# Run Server
# ====================

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        workers=1 if settings.DEBUG else 4,
        log_level="info" if settings.DEBUG else "warning"
    )

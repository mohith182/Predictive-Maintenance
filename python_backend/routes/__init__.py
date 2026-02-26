"""
Routes Package Init
"""

from routes.auth_routes import router as auth_router
from routes.prediction_routes import router as prediction_router
from routes.machine_routes import router as machine_router

__all__ = ["auth_router", "prediction_router", "machine_router"]

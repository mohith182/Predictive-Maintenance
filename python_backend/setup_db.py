"""
Database Initialization Script
Creates SQLite database and tables asynchronously
"""

import asyncio
from config import settings


async def create_database():
    """Create the database tables using async SQLAlchemy"""
    from database import async_engine, init_db
    
    print(f"📦 Database: {settings.DATABASE_URL}")
    await init_db()
    await async_engine.dispose()


if __name__ == "__main__":
    print("🚀 Setting up database...")
    
    try:
        asyncio.run(create_database())
        print("✅ Database setup complete!")
    except Exception as e:
        print(f"❌ Error: {e}")
        raise

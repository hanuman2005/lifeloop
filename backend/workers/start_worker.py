#!/usr/bin/env python3
"""
backend/workers/start_worker.py
Celery Worker Startup Script

This script starts the Celery worker with proper configuration and monitoring.
Usage: python start_worker.py
"""

import os
import sys
import subprocess
import logging
from pathlib import Path
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
project_root = Path(__file__).parent.parent.parent
env_file = project_root / '.env'
if env_file.exists():
    load_dotenv(env_file)
    logger.info(f"✅ Loaded environment from {env_file}")
else:
    logger.warning(f"⚠️ .env file not found at {env_file}")
    logger.info("Using default or system environment variables")

# Validate configuration
required_vars = {
    'CELERY_BROKER_URL': os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0'),
    'CELERY_RESULT_BACKEND': os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/1'),
    'MONGODB_URL': os.getenv('MONGODB_URL', 'mongodb://localhost:27017/lifeloop'),
}

logger.info("🔧 Celery Configuration:")
logger.info(f"   Broker: {required_vars['CELERY_BROKER_URL']}")
logger.info(f"   Backend: {required_vars['CELERY_RESULT_BACKEND']}")
logger.info(f"   MongoDB: {required_vars['MONGODB_URL']}")

# Verify Redis is accessible
def check_redis():
    """Test Redis connection"""
    try:
        import redis
        broker_url = required_vars['CELERY_BROKER_URL']
        client = redis.from_url(broker_url)
        client.ping()
        logger.info("✅ Redis broker is accessible")
        return True
    except Exception as e:
        logger.error(f"❌ Redis connection failed: {e}")
        logger.error("   Make sure Redis is running: redis-cli ping")
        return False

# Verify MongoDB is accessible
def check_mongodb():
    """Test MongoDB connection"""
    try:
        from pymongo import MongoClient
        db_url = required_vars['MONGODB_URL']
        client = MongoClient(db_url, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')
        logger.info("✅ MongoDB is accessible")
        return True
    except Exception as e:
        logger.error(f"❌ MongoDB connection failed: {e}")
        logger.error("   Make sure MongoDB is running: mongod")
        return False

def main():
    """Start the Celery worker"""
    logger.info("🚀 Starting LifeLoop Celery Worker...")
    
    # Validate connections
    logger.info("\n🔍 Checking external service connections...")
    redis_ok = check_redis()
    mongo_ok = check_mongodb()
    
    if not redis_ok or not mongo_ok:
        logger.error("\n❌ Critical services unavailable. Please start Redis and MongoDB.")
        sys.exit(1)
    
    logger.info("\n✅ All services available. Starting Celery worker...\n")
    
    # Prepare worker command
    worker_args = [
        'celery',
        '-A', 'celery_config',  # Import from celery_config.py
        'worker',
        '--loglevel=info',
        '--concurrency=4',
        '--max-tasks-per-child=1000',
        '--time-limit=1800',  # 30 minutes
        '--soft-time-limit=1500',  # 25 minutes
        '--prefetch-multiplier=1',
        '--without-gossip',
        '--without-mingle',
        '--without-heartbeat',
    ]
    
    # Optional: Start Flower monitoring UI on port 5555
    flower_available = os.getenv('CELERY_FLOWER', 'false').lower() == 'true'
    if flower_available:
        logger.info("💐 Flower monitoring UI will be available at http://localhost:5555")
        worker_args.extend(['--logfile=-'])
    
    # Change to workers directory
    workers_dir = Path(__file__).parent
    os.chdir(workers_dir)
    
    logger.info(f"📁 Working directory: {os.getcwd()}")
    logger.info(f"🔨 Command: {' '.join(worker_args)}\n")
    
    try:
        # Start the worker
        subprocess.run(worker_args, check=True)
    except KeyboardInterrupt:
        logger.info("\n⏸️ Celery worker stopped by user")
        sys.exit(0)
    except subprocess.CalledProcessError as e:
        logger.error(f"\n❌ Celery worker failed with exit code {e.returncode}")
        sys.exit(e.returncode)
    except FileNotFoundError:
        logger.error("\n❌ Celery not found. Install it with: pip install celery redis pymongo beautifulsoup4 requests")
        sys.exit(1)
    except Exception as e:
        logger.error(f"\n❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()

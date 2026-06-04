import logging
from contextlib import contextmanager
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from psycopg2.extras import RealDictCursor
from database.config import db_config
# --------------------------------------------------
# Logging Configuration
# --------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)
logger = logging.getLogger(__name__)
# --------------------------------------------------
# Database Manager
# --------------------------------------------------
class DatabaseManager:
    """
    Handles PostgreSQL connection pooling
    and transaction management.
    """
    _pool = None

    @classmethod
    def initialize_pool(cls):
        """
        Initialize connection pool.
        Called once during application startup.
        """

        if cls._pool is None:
            try:
                cls._pool = SimpleConnectionPool(
                    minconn=db_config.MIN_CONNECTIONS,
                    maxconn=db_config.MAX_CONNECTIONS,
                    host=db_config.HOST,
                    port=db_config.PORT,
                    database=db_config.DATABASE,
                    user=db_config.USER,
                    password=db_config.PASSWORD
                )

                logger.info(
                    "PostgreSQL connection pool initialized successfully."
                )

            except Exception as e:
                logger.exception(
                    "Failed to initialize PostgreSQL pool."
                )
                raise e

    @classmethod
    def close_pool(cls):
        """
        Gracefully close all database connections.
        """

        if cls._pool:
            cls._pool.closeall()
            logger.info("Database connection pool closed.")

    @classmethod
    @contextmanager
    def get_connection(cls):
        """
        Context-managed database connection.

        Usage:
            with DatabaseManager.get_connection() as conn:
                ...
        """

        if cls._pool is None:
            cls.initialize_pool()

        connection = None

        try:
            connection = cls._pool.getconn()

            yield connection

            connection.commit()

        except Exception as e:

            if connection:
                connection.rollback()
            logger.exception(
                f"Database transaction failed: {e}"
            )
            raise

        finally:
            if connection:
                cls._pool.putconn(connection)

    @classmethod
    @contextmanager
    def get_cursor(cls):
        with cls.get_connection() as conn:
            cursor = conn.cursor(
                cursor_factory=RealDictCursor
            )
            try:
                yield cursor
            finally:
                cursor.close()


# --------------------------------------------------
# Utility Functions
# --------------------------------------------------

def test_connection(): 
    try:
        with DatabaseManager.get_cursor() as cursor:
            cursor.execute("SELECT version();")
            version = cursor.fetchone()
            logger.info(
                f"Database connected successfully."
            )
            return version

    except Exception as e:
        logger.exception(
            f"Database connection test failed: {e}"
        )
        return None

# --------------------------------------------------
# Entry Point Testing
# --------------------------------------------------
if __name__ == "__main__":
    DatabaseManager.initialize_pool()
    result = test_connection()
    print(result)
    DatabaseManager.close_pool()
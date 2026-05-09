"""
O2: Structured JSON Logging Module

Provides structured JSON logging for production environments.
All logs are output as JSON for easy parsing by log aggregators.
"""

import logging
import json
import sys
import os
from datetime import datetime


class JSONFormatter(logging.Formatter):
    """Format log records as JSON for structured logging"""

    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Add extra fields if present
        if hasattr(record, "extra"):
            log_data.update(record.extra)

        return json.dumps(log_data)


def setup_logging():
    """
    Setup structured JSON logging for production.

    Returns:
        logging.Logger: Configured logger instance
    """
    # Create handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())

    # Configure root logger
    logging.root.handlers = [handler]

    # Set log level based on DEBUG env var
    log_level = logging.DEBUG if os.getenv("DEBUG", "false").lower() == "true" else logging.INFO
    logging.root.setLevel(log_level)

    # Return logger for immediate use
    logger = logging.getLogger(__name__)
    logger.info(
        "Structured JSON logging initialized",
        extra={"log_level": logging.getLevelName(log_level)},
    )

    return logger


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the given name.

    Args:
        name: Logger name (typically __name__)

    Returns:
        logging.Logger: Logger instance
    """
    return logging.getLogger(name)

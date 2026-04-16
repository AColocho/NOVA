import logging
import os
from logging.config import dictConfig
from typing import Any


def configure_logging() -> None:
    """Configure application logging once for the whole process."""
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()

    dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "standard": {
                    "format": (
                        "%(asctime)s %(levelname)s [%(name)s] %(message)s"
                    )
                }
            },
            "handlers": {
                "default": {
                    "class": "logging.StreamHandler",
                    "formatter": "standard",
                    "level": log_level,
                }
            },
            "root": {"handlers": ["default"], "level": log_level},
        }
    )


def get_logger(name: str) -> logging.Logger:
    """Return a repo-standard module logger."""
    return logging.getLogger(name)


def _format_context(**context: Any) -> str:
    filtered_context = {
        key: value for key, value in context.items() if value is not None
    }
    if not filtered_context:
        return ""

    pairs = ", ".join(f"{key}={value!r}" for key, value in filtered_context.items())
    return f" | {pairs}"


def log_raise(
    logger: logging.Logger,
    message: str,
    *,
    level: int = logging.ERROR,
    **context: Any,
) -> None:
    """Log a direct raise site with the current stack."""
    logger.log(level, "%s%s", message, _format_context(**context), stack_info=True)


def log_caught_exception(
    logger: logging.Logger,
    message: str,
    **context: Any,
) -> None:
    """Log an active exception with its traceback."""
    logger.exception("%s%s", message, _format_context(**context))

import sys
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import inspect, text
from sqlalchemy.schema import CreateSchema

if __package__ in {None, ""}:
    sys.path.append(str(Path(__file__).resolve().parents[2]))

from backend.db_connector import ConnectionDB
from backend.db_management.internal import Base


LEGACY_COLUMNS = {
    ("recipe", "recipes"): {
        "home_id": (
            "UUID",
            "REFERENCES auth.homes(id) ON DELETE CASCADE",
        ),
        "created_by_user_id": (
            "UUID",
            "REFERENCES auth.users(id) ON DELETE SET NULL",
        ),
    },
    ("receipt", "receipts"): {
        "home_id": (
            "UUID",
            "REFERENCES auth.homes(id) ON DELETE CASCADE",
        ),
        "created_by_user_id": (
            "UUID",
            "REFERENCES auth.users(id) ON DELETE SET NULL",
        ),
    },
}

REQUIRED_INDEXES = {
    ("recipe", "recipes"): {
        "ix_recipe_recipes_home_id": ["home_id"],
        "ix_recipe_recipes_created_by_user_id": ["created_by_user_id"],
    },
    ("receipt", "receipts"): {
        "ix_receipt_receipts_home_id": ["home_id"],
        "ix_receipt_receipts_created_by_user_id": ["created_by_user_id"],
    },
}


def _ensure_schemas_exist(connection: ConnectionDB) -> None:
    schema_names = {
        table.schema for table in Base.metadata.tables.values() if table.schema is not None
    }

    with connection.engine.begin() as db_connection:
        inspector = inspect(db_connection)
        existing_schemas = set(inspector.get_schema_names())

        for schema_name in sorted(schema_names):
            if schema_name not in existing_schemas:
                db_connection.execute(CreateSchema(schema_name))


def _ensure_tables_exist(connection: ConnectionDB) -> None:
    Base.metadata.create_all(bind=connection.engine)


def _ensure_columns_exist(connection: ConnectionDB) -> None:
    with connection.engine.begin() as db_connection:
        inspector = inspect(db_connection)

        for (schema_name, table_name), columns in LEGACY_COLUMNS.items():
            existing_tables = set(inspector.get_table_names(schema=schema_name))
            if table_name not in existing_tables:
                continue

            existing_columns = {
                column["name"]
                for column in inspector.get_columns(table_name=table_name, schema=schema_name)
            }

            for column_name, (column_type, extra_sql) in columns.items():
                if column_name in existing_columns:
                    continue

                db_connection.execute(
                    text(
                        f"""
                        ALTER TABLE {schema_name}.{table_name}
                        ADD COLUMN {column_name} {column_type} {extra_sql}
                        """
                    )
                )


def _ensure_indexes_exist(connection: ConnectionDB) -> None:
    with connection.engine.begin() as db_connection:
        inspector = inspect(db_connection)

        for (schema_name, table_name), indexes in REQUIRED_INDEXES.items():
            existing_tables = set(inspector.get_table_names(schema=schema_name))
            if table_name not in existing_tables:
                continue

            existing_indexes = {
                index["name"]
                for index in inspector.get_indexes(table_name=table_name, schema=schema_name)
            }

            for index_name, columns in indexes.items():
                if index_name in existing_indexes:
                    continue

                db_connection.execute(
                    text(
                        f"""
                        CREATE INDEX {index_name}
                        ON {schema_name}.{table_name} ({", ".join(columns)})
                        """
                    )
                )


def create_schema_and_tables() -> None:
    """Ensure required schemas, tables, columns, and indexes exist."""
    load_dotenv()
    connection = ConnectionDB()
    _ensure_schemas_exist(connection)
    _ensure_tables_exist(connection)
    _ensure_columns_exist(connection)
    _ensure_indexes_exist(connection)


if __name__ == "__main__":
    create_schema_and_tables()
    print("Database schema and tables are ready.")

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
    ("auth", "homes"): {
        "name_normalized": (
            "VARCHAR(120)",
            "",
        ),
    },
    ("auth", "users"): {
        "login_name": (
            "VARCHAR(120)",
            "",
        ),
        "login_name_normalized": (
            "VARCHAR(120)",
            "",
        ),
        "password_plaintext": (
            "TEXT",
            "",
        ),
    },
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
    ("auth", "homes"): {
        "ix_auth_homes_name_normalized": ["name_normalized"],
    },
    ("auth", "users"): {
        "ix_auth_users_home_id": ["home_id"],
        "ix_auth_users_login_name_normalized": ["login_name_normalized"],
    },
    ("recipe", "recipes"): {
        "ix_recipe_recipes_home_id": ["home_id"],
        "ix_recipe_recipes_created_by_user_id": ["created_by_user_id"],
    },
    ("receipt", "receipts"): {
        "ix_receipt_receipts_home_id": ["home_id"],
        "ix_receipt_receipts_created_by_user_id": ["created_by_user_id"],
    },
}

REQUIRED_UNIQUE_INDEXES = {
    "uq_auth_homes_name_normalized": """
        CREATE UNIQUE INDEX uq_auth_homes_name_normalized
        ON auth.homes (name_normalized)
    """,
    "uq_auth_users_home_login_name": """
        CREATE UNIQUE INDEX uq_auth_users_home_login_name
        ON auth.users (home_id, login_name_normalized)
    """,
    "uq_auth_users_one_admin_per_home": """
        CREATE UNIQUE INDEX uq_auth_users_one_admin_per_home
        ON auth.users (home_id)
        WHERE is_home_admin
    """,
}


def _ensure_schemas_exist(connection: ConnectionDB) -> None:
    schema_names = {
        table.schema
        for table in Base.metadata.tables.values()
        if table.schema is not None
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
                for column in inspector.get_columns(
                    table_name=table_name, schema=schema_name
                )
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
                for index in inspector.get_indexes(
                    table_name=table_name, schema=schema_name
                )
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


def _ensure_auth_login_columns_populated(connection: ConnectionDB) -> None:
    with connection.engine.begin() as db_connection:
        inspector = inspect(db_connection)
        if "homes" not in set(inspector.get_table_names(schema="auth")):
            return
        if "users" not in set(inspector.get_table_names(schema="auth")):
            return

        db_connection.execute(
            text(
                """
                UPDATE auth.homes
                SET name_normalized = lower(btrim(name))
                WHERE name_normalized IS NULL OR btrim(name_normalized) = ''
                """
            )
        )

        duplicate_homes = db_connection.execute(
            text(
                """
                SELECT name_normalized
                FROM auth.homes
                GROUP BY name_normalized
                HAVING count(*) > 1
                """
            )
        ).all()
        if duplicate_homes:
            names = ", ".join(row[0] for row in duplicate_homes)
            raise RuntimeError(
                "Duplicate home names block auth migration. Rename duplicates first: "
                f"{names}"
            )

        db_connection.execute(
            text(
                """
                WITH base_names AS (
                    SELECT
                        id,
                        home_id,
                        COALESCE(
                            NULLIF(btrim(display_name), ''),
                            NULLIF(split_part(email, '@', 1), ''),
                            'user-' || left(id::text, 8)
                        ) AS base_login_name
                    FROM auth.users
                    WHERE login_name IS NULL OR btrim(login_name) = ''
                ),
                numbered_names AS (
                    SELECT
                        id,
                        CASE
                            WHEN row_number() OVER (
                                PARTITION BY home_id, lower(base_login_name)
                                ORDER BY id
                            ) = 1
                            THEN base_login_name
                            ELSE base_login_name || '-' || row_number() OVER (
                                PARTITION BY home_id, lower(base_login_name)
                                ORDER BY id
                            )
                        END AS migrated_login_name
                    FROM base_names
                )
                UPDATE auth.users
                SET login_name = numbered_names.migrated_login_name
                FROM numbered_names
                WHERE auth.users.id = numbered_names.id
                """
            )
        )
        db_connection.execute(
            text(
                """
                UPDATE auth.users
                SET login_name_normalized = lower(btrim(login_name))
                WHERE login_name_normalized IS NULL OR btrim(login_name_normalized) = ''
                """
            )
        )

        duplicate_users = db_connection.execute(
            text(
                """
                SELECT home_id, login_name_normalized
                FROM auth.users
                GROUP BY home_id, login_name_normalized
                HAVING count(*) > 1
                """
            )
        ).all()
        if duplicate_users:
            names = ", ".join(f"{row[0]}:{row[1]}" for row in duplicate_users)
            raise RuntimeError(
                "Duplicate user names block auth migration. Rename duplicates first: "
                f"{names}"
            )

        db_connection.execute(
            text(
                """
                WITH ranked_admins AS (
                    SELECT
                        id,
                        row_number() OVER (
                            PARTITION BY home_id
                            ORDER BY created_at ASC, id ASC
                        ) = 1 AS should_be_admin
                    FROM auth.users
                )
                UPDATE auth.users
                SET is_home_admin = ranked_admins.should_be_admin
                FROM ranked_admins
                WHERE auth.users.id = ranked_admins.id
                """
            )
        )


def _ensure_auth_constraints_exist(connection: ConnectionDB) -> None:
    with connection.engine.begin() as db_connection:
        inspector = inspect(db_connection)
        if "homes" not in set(inspector.get_table_names(schema="auth")):
            return
        if "users" not in set(inspector.get_table_names(schema="auth")):
            return

        existing_indexes = set()
        for table_name in ("homes", "users"):
            existing_indexes.update(
                index["name"]
                for index in inspector.get_indexes(table_name=table_name, schema="auth")
            )
            existing_indexes.update(
                constraint["name"]
                for constraint in inspector.get_unique_constraints(
                    table_name=table_name, schema="auth"
                )
            )

        for index_name, create_sql in REQUIRED_UNIQUE_INDEXES.items():
            if index_name in existing_indexes:
                continue
            db_connection.execute(text(create_sql))


def create_schema_and_tables() -> None:
    """Ensure required schemas, tables, columns, and indexes exist."""
    load_dotenv()
    connection = ConnectionDB()
    _ensure_schemas_exist(connection)
    _ensure_tables_exist(connection)
    _ensure_columns_exist(connection)
    _ensure_auth_login_columns_populated(connection)
    _ensure_indexes_exist(connection)
    _ensure_auth_constraints_exist(connection)


if __name__ == "__main__":
    create_schema_and_tables()
    print("Database schema and tables are ready.")

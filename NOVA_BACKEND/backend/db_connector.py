import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


class ConnectionDB:
    def __init__(self) -> None:
        connection_url = f"postgresql+psycopg://{os.environ['DB_USER']}:{os.environ['DB_PASS']}@{os.environ['DB_HOST']}/{os.environ['DB_NAME']}"

        self.engine = create_engine(connection_url)
        self.session = sessionmaker(bind=self.engine, expire_on_commit=False)

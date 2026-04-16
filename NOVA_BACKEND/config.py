import os

from backend.logging_utils import configure_logging
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


class DEV:
    def __init__(self):
        app = FastAPI(title="NOVA-DEV")
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["http://localhost:3000", "*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        self.app = app


class CONFIG:
    def __init__(self) -> None:
        load_dotenv()
        configure_logging()
        self.environment = os.environ["ENV"]

        self.app = DEV().app

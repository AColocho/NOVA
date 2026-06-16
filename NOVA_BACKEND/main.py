from config import CONFIG

app = CONFIG().app

from backend.auth import auth
from backend.bowel import bowel
from backend.movie import movie
from backend.receipt import receipt
from backend.recipe import recipe

app.include_router(router=auth.router, prefix="/api/v1")
app.include_router(router=bowel.router, prefix="/api/v1")
app.include_router(router=movie.router, prefix="/api/v1")
app.include_router(router=receipt.router, prefix="/api/v1")
app.include_router(router=recipe.router, prefix="/api/v1")

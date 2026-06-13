from typing import Annotated

from fastapi import APIRouter, Depends, Response

from ..auth.dependencies import get_current_user
from ..auth.logic import AuthenticatedUser
from .logic import Logic
from .model import (
    BowelMovementCreate,
    BowelMovementDelete,
    BowelMovementMonth,
    BowelMovementUpdate,
)

logic = Logic()
router = APIRouter(prefix="/bowel", tags=["bowel"])


@router.post("/create", status_code=201)
def create_bowel_movement(
    payload: BowelMovementCreate,
    response: Response,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    return logic.create(payload, response, current_user.user_id)


@router.get("/month", status_code=200)
def list_bowel_movements(
    payload: Annotated[BowelMovementMonth, Depends()],
    response: Response,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    return logic.list_month(payload, response, current_user.user_id)


@router.put("/update", status_code=200)
def update_bowel_movement(
    payload: BowelMovementUpdate,
    response: Response,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    return logic.update(payload, response, current_user.user_id)


@router.delete("/delete", status_code=200)
def delete_bowel_movement(
    payload: BowelMovementDelete,
    response: Response,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    return logic.delete(payload, response, current_user.user_id)


@router.post("/analyze", status_code=200)
def analyze_bowel_movements(
    payload: BowelMovementMonth,
    response: Response,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    return logic.analyze_month(payload, response, current_user.user_id)

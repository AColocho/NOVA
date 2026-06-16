import calendar
import json
import logging
import os
from collections import Counter
from datetime import date
from uuid import UUID

from fastapi import HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from ..db_connector import ConnectionDB
from ..db_management.internal import BowelMovement
from ..logging_utils import get_logger, log_caught_exception, log_raise
from ..nova.gpt import GPTClient
from .model import (
    BowelAnalysis,
    BowelMovementCreate,
    BowelMovementDelete,
    BowelMovementMonth,
    BowelMovementUpdate,
)

logger = get_logger(__name__)


class Logic(ConnectionDB):
    @staticmethod
    def _month_bounds(payload: BowelMovementMonth) -> tuple[date, date]:
        last_day = calendar.monthrange(payload.year, payload.month)[1]
        return date(payload.year, payload.month, 1), date(payload.year, payload.month, last_day)

    @staticmethod
    def _serialize(entry: BowelMovement) -> dict[str, object]:
        return {
            "bowel_movement_id": str(entry.id),
            "occurred_on": entry.occurred_on.isoformat(),
            "bristol_type": entry.bristol_type,
            "status": entry.status,
            "color": entry.color,
            "pain_level": entry.pain_level,
            "blood_present": entry.blood_present,
            "notes": entry.notes,
            "created_at": entry.created_at.isoformat(),
            "updated_at": entry.updated_at.isoformat(),
        }

    def _entries_for_month(
        self, payload: BowelMovementMonth, user_id: UUID
    ) -> list[BowelMovement]:
        start_date, end_date = self._month_bounds(payload)
        with self.session() as session:
            return list(
                session.scalars(
                    select(BowelMovement)
                    .where(
                        BowelMovement.user_id == user_id,
                        BowelMovement.occurred_on >= start_date,
                        BowelMovement.occurred_on <= end_date,
                    )
                    .order_by(BowelMovement.occurred_on.desc(), BowelMovement.created_at.desc())
                ).all()
            )

    def create(
        self, payload: BowelMovementCreate, response: Response, user_id: UUID
    ) -> dict[str, object]:
        entry = BowelMovement(user_id=user_id, **payload.model_dump())
        try:
            with self.session() as session:
                session.add(entry)
                session.commit()
                session.refresh(entry)
        except IntegrityError as exc:
            log_caught_exception(logger, "Unable to create bowel movement record")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to save the bowel movement entry.",
            ) from exc

        response.status_code = status.HTTP_201_CREATED
        return self._serialize(entry)

    def list_month(
        self, payload: BowelMovementMonth, response: Response, user_id: UUID
    ) -> dict[str, object]:
        entries = self._entries_for_month(payload, user_id)
        response.status_code = status.HTTP_200_OK
        return {
            "year": payload.year,
            "month": payload.month,
            "count": len(entries),
            "bowel_movements": [self._serialize(entry) for entry in entries],
        }

    def update(
        self, payload: BowelMovementUpdate, response: Response, user_id: UUID
    ) -> dict[str, object]:
        with self.session() as session:
            entry = session.scalar(
                select(BowelMovement).where(
                    BowelMovement.id == payload.bowel_movement_id,
                    BowelMovement.user_id == user_id,
                )
            )
            if entry is None:
                raise HTTPException(status_code=404, detail="Bowel movement entry not found.")

            for field in (
                "occurred_on",
                "bristol_type",
                "status",
                "color",
                "pain_level",
                "blood_present",
                "notes",
            ):
                if field in payload.model_fields_set:
                    value = getattr(payload, field)
                    if value is not None or field in {"color", "notes"}:
                        setattr(entry, field, value)
            session.commit()
            session.refresh(entry)

        response.status_code = status.HTTP_200_OK
        return self._serialize(entry)

    def delete(
        self, payload: BowelMovementDelete, response: Response, user_id: UUID
    ) -> dict[str, str]:
        with self.session() as session:
            entry = session.scalar(
                select(BowelMovement).where(
                    BowelMovement.id == payload.bowel_movement_id,
                    BowelMovement.user_id == user_id,
                )
            )
            if entry is None:
                raise HTTPException(status_code=404, detail="Bowel movement entry not found.")
            session.delete(entry)
            session.commit()

        response.status_code = status.HTTP_200_OK
        return {"bowel_movement_id": str(payload.bowel_movement_id)}

    @staticmethod
    def _stats(entries: list[BowelMovement]) -> dict[str, object]:
        type_counts = Counter(entry.bristol_type for entry in entries)
        status_counts = Counter(entry.status for entry in entries)
        blood_count = sum(entry.blood_present for entry in entries)
        high_pain_count = sum(entry.pain_level >= 7 for entry in entries)
        return {
            "entry_count": len(entries),
            "days_logged": len({entry.occurred_on for entry in entries}),
            "bristol_type_counts": {str(key): value for key, value in sorted(type_counts.items())},
            "status_counts": dict(status_counts),
            "constipation_pattern_count": sum(
                entry.bristol_type <= 2 for entry in entries
            ),
            "loose_stool_pattern_count": sum(
                entry.bristol_type >= 6 for entry in entries
            ),
            "blood_present_count": blood_count,
            "high_pain_count": high_pain_count,
            "urgent_attention_recommended": blood_count > 0 or high_pain_count > 0,
        }

    def analyze_month(
        self, payload: BowelMovementMonth, response: Response, user_id: UUID
    ) -> dict[str, object]:
        entries = self._entries_for_month(payload, user_id)
        if not entries:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Add at least one bowel movement for this month before analyzing it.",
            )

        stats = self._stats(entries)
        if os.getenv("OPENAI_API_KEY", "").strip() in {"", "replace-me"}:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Monthly analysis requires a valid OpenAI API key.",
            )

        analysis_input = [
            {
                "occurred_on": entry.occurred_on.isoformat(),
                "bristol_type": entry.bristol_type,
                "status": entry.status,
                "color": entry.color,
                "pain_level": entry.pain_level,
                "blood_present": entry.blood_present,
                "notes": entry.notes,
            }
            for entry in entries
        ]

        try:
            analysis = GPTClient().chat(
                prompt=json.dumps({"summary_stats": stats, "entries": analysis_input}),
                system_prompt=(
                    "You summarize a person's bowel movement log for general wellness tracking. "
                    "Do not diagnose disease, rule out conditions, or claim the person is healthy. "
                    "Describe observable patterns cautiously. Give low-risk general suggestions such "
                    "as hydration, fiber, activity, and discussing persistent changes with a clinician. "
                    "Put urgent warning signs in seek_care, especially blood, black/tarry stool, severe "
                    "pain, dehydration, fever, unexplained weight loss, or persistent major change. "
                    "The disclaimer must say this is not medical advice or a diagnosis."
                ),
                response_model=BowelAnalysis,
                temperature=0,
            )
        except HTTPException:
            raise
        except Exception as exc:
            log_caught_exception(logger, "Unable to analyze bowel movement month")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Unable to generate the monthly analysis right now.",
            ) from exc

        if not isinstance(analysis, BowelAnalysis):
            log_raise(logger, "Bowel analysis returned unexpected payload", level=logging.WARNING)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="The monthly analysis returned an unexpected response.",
            )

        response.status_code = status.HTTP_200_OK
        return {"stats": stats, "analysis": analysis.model_dump()}

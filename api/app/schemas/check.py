from __future__ import annotations

from typing import List

from pydantic import BaseModel

from .rules import GroupRule, ReservationWindow


class ReservationCheckRequest(BaseModel):
    rule: GroupRule
    reservation: ReservationWindow
    current_reservations: List[ReservationWindow] = []
    weekly_hours: float = 0.0

from __future__ import annotations

from datetime import datetime, time
from typing import Iterable, List, Optional, Tuple

from pydantic import BaseModel, Field


class TimeRange(BaseModel):
    """Represents an allowed time range for reservations."""

    start: time
    end: time


class ReservationWindow(BaseModel):
    """Simple start/end pair for reservation times."""

    start: datetime
    end: datetime


class GroupRule(BaseModel):
    """Rules that restrict how reservations can be made for a group."""

    reservation_open_days_before: Optional[int] = Field(
        None,
        ge=0,
        description="Maximum number of days in advance a reservation can be made.",
    )
    reservation_close_minutes_before: Optional[int] = Field(
        None,
        ge=0,
        description="Minimum minutes before start time after which reservations are blocked.",
    )
    max_simultaneous_reservations: Optional[int] = Field(
        None,
        ge=1,
        description="Maximum number of active reservations a user can hold simultaneously.",
    )
    max_weekly_hours: Optional[int] = Field(
        None,
        ge=0,
        description="Maximum total hours a user may reserve per week.",
    )
    allowed_time_ranges: Optional[List[TimeRange]] = Field(
        default=None,
        description="List of allowed daily time ranges for reservations.",
    )
    restricted_weekdays: List[int] = Field(
        default_factory=list,
        description="List of disallowed weekdays (0=Monday).",
    )
    requires_host_approval: bool = Field(
        False, description="Whether reservations require host approval."
    )

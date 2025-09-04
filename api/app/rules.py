from __future__ import annotations

from datetime import datetime, timedelta
from typing import Iterable, List, Tuple

from .schemas.rules import GroupRule, ReservationWindow, TimeRange


def check_reservation(
    rule: GroupRule,
    reservation: ReservationWindow,
    current_reservations: Iterable[ReservationWindow],
    weekly_hours: float,
) -> Tuple[bool, List[str]]:
    """Validate a reservation against the provided rules."""

    reasons: List[str] = []
    now = datetime.now(reservation.start.tzinfo)

    # Restrict how far in advance a reservation can be made.
    if rule.reservation_open_days_before is not None:
        max_start = now + timedelta(days=rule.reservation_open_days_before)
        if reservation.start > max_start:
            reasons.append("reservation too far in future")

    # Restrict late reservations close to the start time.
    if rule.reservation_close_minutes_before is not None:
        min_start = now + timedelta(minutes=rule.reservation_close_minutes_before)
        if reservation.start < min_start:
            reasons.append("reservation too close to start time")

    # Limit number of simultaneous reservations.
    if rule.max_simultaneous_reservations is not None:
        current_count = len(list(current_reservations))
        if current_count >= rule.max_simultaneous_reservations:
            reasons.append("too many active reservations")

    # Limit total weekly hours.
    if rule.max_weekly_hours is not None:
        duration_hours = (reservation.end - reservation.start).total_seconds() / 3600
        if weekly_hours + duration_hours > rule.max_weekly_hours:
            reasons.append("weekly hour limit exceeded")

    # Disallow specific weekdays.
    if rule.restricted_weekdays and reservation.start.weekday() in rule.restricted_weekdays:
        reasons.append("weekday not allowed")

    # Restrict daily time ranges.
    if rule.allowed_time_ranges:
        start_time = reservation.start.time()
        end_time = reservation.end.time()
        in_range = any(
            tr.start <= start_time and end_time <= tr.end for tr in rule.allowed_time_ranges
        )
        if not in_range:
            reasons.append("time outside allowed ranges")

    # Require host approval (informational).
    if rule.requires_host_approval:
        reasons.append("host approval required")

    allowed = not reasons
    return allowed, reasons

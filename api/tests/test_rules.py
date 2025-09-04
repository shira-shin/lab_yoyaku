import unittest
from datetime import datetime, timedelta

from app.rules import check_reservation
from app.schemas import GroupRule, ReservationWindow


class RuleTests(unittest.TestCase):
    def test_open_and_close_limits(self) -> None:
        now = datetime.now()
        rule = GroupRule(
            reservation_open_days_before=7, reservation_close_minutes_before=30
        )
        far_res = ReservationWindow(
            start=now + timedelta(days=8), end=now + timedelta(days=8, hours=1)
        )
        allowed, _ = check_reservation(rule, far_res, [], 0)
        self.assertFalse(allowed)

        near_res = ReservationWindow(
            start=now + timedelta(days=1), end=now + timedelta(days=1, hours=1)
        )
        allowed, _ = check_reservation(rule, near_res, [], 0)
        self.assertTrue(allowed)


if __name__ == "__main__":
    unittest.main()

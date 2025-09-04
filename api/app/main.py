from fastapi import FastAPI

from .rules import check_reservation
from .schemas import ReservationCheckRequest

app = FastAPI()


@app.get('/health')
async def health() -> dict[str, str]:
  return {'status': 'ok'}


@app.post('/rules/validate')
async def validate_reservation(
    req: ReservationCheckRequest,
) -> dict[str, object]:
  allowed, reasons = check_reservation(
      req.rule, req.reservation, req.current_reservations, req.weekly_hours
  )
  return {'allowed': allowed, 'reasons': reasons}

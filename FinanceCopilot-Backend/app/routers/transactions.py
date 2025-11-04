from fastapi import APIRouter
from pydantic import BaseModel
from typing import List


router = APIRouter(prefix="/transactions", tags=["transactions"])


class Transaction(BaseModel):
    id: int
    date: str
    description: str
    amount: float
    category: str | None = None


@router.get("/", response_model=List[Transaction])
def list_transactions():
    # Placeholder in-memory data
    return [
        Transaction(id=1, date="2025-01-01", description="Coffee", amount=-4.5, category="Food").model_dump(),
        Transaction(id=2, date="2025-01-02", description="Salary", amount=3500.0, category="Income").model_dump(),
    ]



"""Simple demo credit ledger (in-memory, per session)."""

from __future__ import annotations

DEFAULT_BALANCE = 10


class CreditStore:
    def __init__(self) -> None:
        self._balances: dict[str, int] = {}

    def balance(self, session_id: str) -> int:
        if session_id not in self._balances:
            self._balances[session_id] = DEFAULT_BALANCE
        return self._balances[session_id]

    def charge(self, session_id: str, amount: int = 1) -> int:
        current = self.balance(session_id)
        if current < amount:
            raise ValueError("insufficient_credits")
        self._balances[session_id] = current - amount
        return self._balances[session_id]

    def top_up(self, session_id: str, amount: int = 5) -> int:
        self._balances[session_id] = self.balance(session_id) + amount
        return self._balances[session_id]


credit_store = CreditStore()

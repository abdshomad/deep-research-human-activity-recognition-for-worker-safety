import asyncio
from typing import List

class SSEManager:
    def __init__(self):
        self.listeners: List[asyncio.Queue] = []

    def subscribe(self) -> asyncio.Queue:
        q = asyncio.Queue()
        self.listeners.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        if q in self.listeners:
            self.listeners.remove(q)

    def broadcast(self, event_data: str):
        """
        Broadcasts a message/HTML snippet to all active SSE subscribers.
        """
        for q in self.listeners:
            try:
                q.put_nowait(event_data)
            except Exception:
                pass

sse_manager = SSEManager()

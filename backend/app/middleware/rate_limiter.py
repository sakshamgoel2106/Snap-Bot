import time
from collections import defaultdict
from typing import Dict, List
from fastapi import Request, HTTPException, status
from app.config import settings

# In-memory sliding window rate limiter: client_ip -> list of request timestamps
_request_records: Dict[str, List[float]] = defaultdict(list)
_last_cleanup = time.time()


def check_rate_limit(request: Request):
    """
    In-memory IP-based rate limiter.
    Production Note: In multi-worker or multi-server deployments,
    use a distributed store like Redis (e.g. redis-py with token-bucket or sliding window).
    """
    global _last_cleanup

    client_ip = request.client.host if request.client else "127.0.0.1"
    now = time.time()
    window = settings.RATE_LIMIT_WINDOW_SECONDS
    max_requests = settings.RATE_LIMIT_REQUESTS

    # Periodic cleanup of expired records every 5 minutes to avoid memory accumulation
    if now - _last_cleanup > 300:
        for ip in list(_request_records.keys()):
            _request_records[ip] = [t for t in _request_records[ip] if now - t < window]
            if not _request_records[ip]:
                del _request_records[ip]
        _last_cleanup = now

    # Filter timestamps within current window
    timestamps = [t for t in _request_records[client_ip] if now - t < window]
    _request_records[client_ip] = timestamps

    if len(timestamps) >= max_requests:
        retry_after = int(window - (now - timestamps[0])) + 1
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Maximum {max_requests} requests per {window}s. Please retry in {retry_after}s.",
            headers={"Retry-After": str(retry_after)}
        )

    _request_records[client_ip].append(now)

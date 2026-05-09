# backend/app/limiter.py

from slowapi import Limiter
from slowapi.util import get_remote_address

from .config import get_settings

_s = get_settings()
_limiter_kw = {"key_func": get_remote_address}
if _s.redis_url:
    # Shared limit state across API replicas (required behind a load balancer).
    _limiter_kw["storage_uri"] = _s.redis_url

limiter = Limiter(**_limiter_kw)
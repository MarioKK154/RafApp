# backend/app/limiter.py

from slowapi import Limiter
from slowapi.util import get_remote_address

# This creates a single, shared limiter instance for our entire application.
limiter = Limiter(key_func=get_remote_address)
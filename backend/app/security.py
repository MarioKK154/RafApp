# backend/app/security.py
# ABSOLUTELY FINAL Meticulously Checked Uncondensed Version
from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional, List, Iterable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

# --- 1. REMOVE 'from . import crud' FROM HERE ---
from . import models, schemas
from .database import get_db


# --- Configuration ---
# For production, these should come from environment variables
# Generate a strong secret key, e.g., using: openssl rand -hex 32
SECRET_KEY = "YOUR_VERY_SECRET_KEY_SHOULD_BE_LONG_AND_RANDOM_AND_STORED_SAFELY"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # Token valid for 24 hours

# --- Password Hashing ---
# Using bcrypt as the scheme for password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against a hashed password."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hashes a plain password."""
    return pwd_context.hash(password)

# --- JWT Token Handling ---
# oauth2_scheme defines how clients will send the token (in Authorization header as Bearer token)
# tokenUrl points to the endpoint where the client can get the token (your login endpoint)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token") # Relative to how auth router is mounted in main.py

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Creates a new JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        # Default expiration time
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token_payload(token: str) -> Optional[dict]:
    """Decode JWT and return payload dict, or None if invalid."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None

async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)]
) -> models.User:
    """
    Dependency to get the current user from a JWT token.
    Decodes token, validates, and fetches user from DB.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: Optional[str] = payload.get("sub") # "sub" (subject) should be the user's email
        if email is None:
            raise credentials_exception
        # No need to create TokenData schema instance here if just using email
    except JWTError:
        raise credentials_exception
    from . import crud
    user = crud.get_user_by_email(db, email=email) # Fetch user by email from token
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(
    current_user: Annotated[models.User, Depends(get_current_user)]
) -> models.User:
    """
    Dependency to get the current active user.
    Relies on get_current_user and then checks if the user is active.
    """
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return current_user


def is_subcontractor(user: models.User) -> bool:
    """
    Helper to determine if a user is a limited-access subcontractor node.
    We use a simple convention: role string equals 'subcontractor'.
    """
    return (user.role or "").lower() == "subcontractor" and not user.is_superuser


async def block_subcontractor(
    current_user: Annotated[models.User, Depends(get_current_active_user)]
) -> models.User:
    """
    Dependency that blocks subcontractors from accessing certain routers entirely.
    Superusers bypass this check.
    """
    if is_subcontractor(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Limited-access subcontractor accounts cannot access this resource.",
        )
    return current_user

# --- Role- & Permission-Based Access Control (RBAC/PBAC) ---

def _normalize_permissions(raw: Optional[str | Iterable[str]]) -> List[str]:
    """
    Helper to normalize the stored extra_permissions field to a list of strings.
    DB stores JSON string or NULL; API may already have a list.
    """
    if raw is None:
        return []
    if isinstance(raw, list) or isinstance(raw, tuple):
        return [str(p) for p in raw]
    if isinstance(raw, str):
        raw = raw.strip()
        if not raw:
            return []
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return [str(p) for p in parsed]
        except Exception:
            # Fallback: comma-separated string
            return [p.strip() for p in raw.split(",") if p.strip()]
    return []


def user_has_permission(user: models.User, permission: str, allowed_roles: Optional[List[str]] = None) -> bool:
    """
    Check if a user has a given permission, either via:
    - superuser flag,
    - allowed role,
    - explicit granular permission in extra_permissions.
    """
    if user.is_superuser:
        return True
    if allowed_roles and user.role in allowed_roles:
        return True
    extra = _normalize_permissions(getattr(user, "extra_permissions", None))
    return permission in extra

def require_role(allowed_roles: List[str]):
    """
    Factory function for a dependency that checks if the current user has one of the allowed roles.
    Superusers bypass this role check.
    """
    async def role_checker(
        current_user: Annotated[models.User, Depends(get_current_active_user)]
    ):
        if current_user.is_superuser: # Superusers have all permissions
            return current_user
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Requires one of the following roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker


def require_permission(permission: str, allowed_roles: Optional[List[str]] = None):
    """
    Dependency factory that checks a named permission.
    - Superusers always allowed.
    - Users with role in allowed_roles are allowed.
    - Users whose extra_permissions contains permission are allowed.
    """
    if allowed_roles is None:
        allowed_roles = []

    async def permission_checker(
        current_user: Annotated[models.User, Depends(get_current_active_user)]
    ) -> models.User:
        if not user_has_permission(current_user, permission, allowed_roles=allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Requires permission '{permission}' or roles: {', '.join(allowed_roles) if allowed_roles else 'none'}",
            )
        return current_user

    return permission_checker

async def require_admin(
    current_user: Annotated[models.User, Depends(require_role(["admin"]))]
):
    """Dependency to ensure the current user is an admin (or superuser)."""
    return current_user

async def require_manager(
    current_user: Annotated[models.User, Depends(require_role(["admin", "project manager"]))]
):
    """Dependency to ensure the current user is an admin or project manager (or superuser)."""
    return current_user

async def require_superuser( # This was the function missing previously
    current_user: Annotated[models.User, Depends(get_current_active_user)]
):
    """Dependency to ensure the current user is a superuser."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation not permitted. Requires superuser privileges."
        )
    return current_user

# Typed dependency for TeamLeader or higher roles (Admin, PM, TL)
TeamLeaderOrHigher = Annotated[models.User, Depends(require_role(["admin", "project manager", "team leader"]))]
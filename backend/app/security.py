# backend/app/security.py
import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Annotated, List # Import List

from jose import JWTError, jwt
from passlib.context import CryptContext
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from . import crud, models, schemas
from .database import get_db

load_dotenv()

# --- Password Hashing ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# --- JWT Token Handling ---
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

if not SECRET_KEY:
    raise ValueError("No SECRET_KEY set in environment variables for JWT")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta: expire = datetime.now(timezone.utc) + expires_delta
    else: expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- Dependency for Getting Current User ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")
TokenDependency = Annotated[str, Depends(oauth2_scheme)]
DbDependency = Annotated[Session, Depends(get_db)]

async def get_current_user(token: TokenDependency, db: DbDependency) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: Optional[str] = payload.get("sub")
        if email is None: raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception
    user = crud.get_user_by_email(db, email=token_data.email)
    if user is None: raise credentials_exception
    return user

async def get_current_active_user(current_user: Annotated[models.User, Depends(get_current_user)]) -> models.User:
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return current_user

# --- NEW: Role Checking Dependency ---

def require_role(allowed_roles: List[str]):
    """
    Factory function that returns a dependency checker for specified roles.
    """
    class RoleChecker:
        def __init__(self, allowed_roles: List[str]):
            self.allowed_roles = allowed_roles

        async def __call__(self, user: Annotated[models.User, Depends(get_current_active_user)]):
            """
            This is the actual dependency function that will be called by FastAPI.
            It checks if the current active user's role is in the allowed list.
            """
            if user.role not in self.allowed_roles:
                print(f"User role '{user.role}' not in allowed roles: {self.allowed_roles}") # Debug log
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="The user doesn't have enough privileges"
                )
            return user # Return the user object if authorized

    return RoleChecker(allowed_roles)

# Specific role dependencies (examples)
require_admin = require_role(["admin"])
require_manager = require_role(["admin", "project manager"])
# require_employee = require_role(["admin", "manager", "employee"]) # Equivalent to get_current_active_user
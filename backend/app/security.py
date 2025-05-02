# backend/app/security.py
import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Annotated # Import Annotated

from jose import JWTError, jwt
from passlib.context import CryptContext
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status # Import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer # Import OAuth2PasswordBearer
from sqlalchemy.orm import Session # Import Session for DB access in dependency

# Import necessities from our app
from . import crud, models, schemas # Assuming schemas.py has TokenData
from .database import get_db # To get DB session in dependency

# Load environment variables (for SECRET_KEY etc.)
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
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- Dependency for Getting Current User ---

# OAuth2PasswordBearer requires the URL where the token is obtained (/auth/token)
# It extracts the token from the 'Authorization: Bearer <token>' header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

# Type hint for the token dependency
TokenDependency = Annotated[str, Depends(oauth2_scheme)]
# Type hint for the database session dependency
DbDependency = Annotated[Session, Depends(get_db)]


async def get_current_user(token: TokenDependency, db: DbDependency) -> models.User:
    """
    Dependency function to get the current user based on JWT token.
    Decodes token, validates credentials, fetches user from DB.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # 'sub' (subject) is the standard JWT claim for the user identifier
        email: Optional[str] = payload.get("sub")
        if email is None:
            raise credentials_exception
        # Store token data if needed (optional)
        token_data = schemas.TokenData(email=email)
        # Extract other payload data if added during token creation
        # user_id = payload.get("user_id")
        # role = payload.get("role")

    except JWTError:
        raise credentials_exception # If token is invalid or expired

    # Fetch user from database
    user = crud.get_user_by_email(db, email=token_data.email)
    if user is None:
        raise credentials_exception # If user associated with token doesn't exist

    return user


async def get_current_active_user(
    current_user: Annotated[models.User, Depends(get_current_user)]
) -> models.User:
    """
    Dependency function that builds on get_current_user.
    Checks if the user retrieved from the token is active.
    Use this dependency in path operations that require an active, logged-in user.
    """
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return current_user

# Optional: Dependency for superusers
# async def get_current_active_superuser(
#     current_user: Annotated[models.User, Depends(get_current_active_user)]
# ) -> models.User:
#     """Checks if the current user is also a superuser."""
#     if not current_user.is_superuser:
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN,
#             detail="The user doesn't have enough privileges"
#         )
#     return current_user
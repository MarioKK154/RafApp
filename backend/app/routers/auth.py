# backend/app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Annotated # Use Annotated for Depends in newer FastAPI/Python

from .. import crud, models, schemas, security # Use .. for parent directory imports
from ..database import get_db # Use .. for parent directory imports

router = APIRouter(
    tags=["Authentication"] # Tag for Swagger UI documentation
)

# Dependency type hint for database session
DbDependency = Annotated[Session, Depends(get_db)]
# Dependency type hint for OAuth2 form data
FormDependency = Annotated[OAuth2PasswordRequestForm, Depends()]

@router.post("/register", response_model=schemas.UserRead, status_code=status.HTTP_201_CREATED)
async def register_user(user: schemas.UserCreate, db: DbDependency):
    """
    Registers a new user.
    - Takes user email, password, full_name.
    - Checks if email already exists.
    - Hashes password and saves user to DB.
    - Returns created user data (excluding password).
    """
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    created_user = crud.create_user(db=db, user=user)
    return created_user


@router.post("/token", response_model=schemas.Token)
async def login_for_access_token(form_data: FormDependency, db: DbDependency):
    """
    Provides an access token for valid user credentials.
    - Takes 'username' (which is email here) and 'password' from form data.
    - Verifies user exists and password is correct.
    - Creates and returns a JWT access token.
    """
    user = crud.get_user_by_email(db, email=form_data.username) # form_data uses 'username' field for email
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"}, # Standard header for auth errors
        )
    
    # Data to include in the JWT payload (subject 'sub' is standard for user identifier)
    access_token_data = {"sub": user.email}
    # You could add more data here: e.g. "user_id": user.id, "role": user.role
    
    access_token = security.create_access_token(data=access_token_data)
    
    return {"access_token": access_token, "token_type": "bearer"}
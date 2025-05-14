# backend/app/routers/auth.py
# Final Uncondensed Version: /register endpoint removed
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Annotated # Import Annotated

from .. import crud, models, schemas, security # Use .. for parent directory imports
from ..database import get_db

router = APIRouter(
    tags=["Authentication"] # No prefix here, prefix is defined in main.py
)

# Dependency type hints
DbDependency = Annotated[Session, Depends(get_db)]
# Use Annotated for FormDependency as well for consistency
FormDependency = Annotated[OAuth2PasswordRequestForm, Depends()]


# Public registration endpoint (@router.post("/register", ...)) was REMOVED.
# User creation is now handled by an Admin via the POST /users/ endpoint.


@router.post("/token", response_model=schemas.Token)
async def login_for_access_token(
    form_data: FormDependency, # Using Annotated OAuth2PasswordRequestForm
    db: DbDependency
):
    """
    Provides an access token for a user after successful authentication.
    Accepts 'username' (which is the email) and 'password' in a form body.
    """
    user = crud.get_user_by_email(db, email=form_data.username) # form_data.username is the email

    # Check if user exists, is active, and password is correct
    if not user or not user.is_active or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password, or account is inactive.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Data to be encoded in the JWT: usually the user's unique identifier (email or ID)
    # "sub" (subject) is a standard claim for the principal that is the subject of the JWT.
    access_token_data = {"sub": user.email} 
    
    access_token = security.create_access_token(data=access_token_data)
    
    return {"access_token": access_token, "token_type": "bearer"}
# backend/app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Annotated

from .. import crud, models, schemas, security
from ..database import get_db

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

DbDependency = Annotated[Session, Depends(get_db)]
FormDependency = Annotated[OAuth2PasswordRequestForm, Depends()]

@router.post("/token", response_model=schemas.Token)
async def login_for_access_token(
    form_data: FormDependency,
    db: DbDependency
):
    user = crud.get_user_by_email(db, email=form_data.username)

    if not user or not user.is_active or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password, or account is inactive.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_data = {"sub": user.email} 
    access_token = security.create_access_token(data=access_token_data)
    
    return {"access_token": access_token, "token_type": "bearer"}
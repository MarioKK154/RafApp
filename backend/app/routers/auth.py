# backend/app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status, Request, Form
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Annotated

from .. import crud, models, schemas, security
from ..database import get_db
from ..limiter import limiter

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

DbDependency = Annotated[Session, Depends(get_db)]
FormDependency = Annotated[OAuth2PasswordRequestForm, Depends()]


@router.get("/login-tenants", response_model=list[schemas.LoginTenantOption])
@limiter.limit("60/minute")
async def get_login_tenants(request: Request, db: DbDependency):
    """Public tenant list for the login company picker."""
    tenants = crud.get_tenants(db=db, skip=0, limit=1000)
    return [
        schemas.LoginTenantOption(
            id=t.id,
            name=t.name,
            logo_url=t.logo_url,
        )
        for t in tenants
    ]


@router.post("/token", response_model=schemas.LoginTokenResponse)
@limiter.limit("20/minute")
async def login_for_access_token(
    request: Request,
    form_data: FormDependency,
    db: DbDependency,
    tenant_id: int = Form(...),
    keep_signed_in: bool = Form(False),
):
    user = crud.get_user_by_email_and_tenant(db, email=form_data.username, tenant_id=tenant_id)
    # Superadmins may exist without tenant binding (tenant_id is NULL).
    if not user:
        fallback = crud.get_user_by_email(db, email=form_data.username)
        if fallback and fallback.is_superuser:
            user = fallback

    if not user or not user.is_active or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect company, email, or password, or account is inactive.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    crud.update_user_last_login(db, user.id)

    remember_me = bool(keep_signed_in)

    if user.totp_enabled and user.totp_secret:
        temp_token = security.create_two_factor_pending_token(user.id, remember_me, tenant_id=user.tenant_id or -1)
        return schemas.LoginTokenResponse(
            two_factor_required=True,
            temp_token=temp_token,
            remember_me=remember_me,
        )

    access_token, expires_in_seconds = security.issue_access_token_for_user(user.id, remember_me)
    return schemas.LoginTokenResponse(
        access_token=access_token,
        remember_me=remember_me,
        expires_in_seconds=expires_in_seconds,
    )


@router.post("/token/complete-2fa", response_model=schemas.LoginTokenResponse)
@limiter.limit("30/minute")
async def complete_two_factor_login(request: Request, db: DbDependency, body: schemas.CompleteTwoFactorBody):
    payload = security.decode_token_payload(body.temp_token)
    if not payload or payload.get("scope") != security.SCOPE_2FA_PENDING:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired verification token.")

    sub = payload.get("sub")
    if sub is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid verification token.")
    tenant_id = payload.get("tid")
    if tenant_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid verification token.")

    user = None
    sub_str = str(sub).strip()
    if sub_str.isdigit():
        user = crud.get_user(db, user_id=int(sub_str))
    if user is None:
        # Legacy pending tokens stored email in sub
        email = sub_str
        if int(tenant_id) == -1:
            user = crud.get_user_by_email(db, email=email)
        else:
            user = crud.get_user_by_email_and_tenant(db, email=email, tenant_id=int(tenant_id))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive.")
    if not user.totp_enabled or not user.totp_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Two-factor authentication is not enabled for this account.")

    if not security.verify_totp_code(user.totp_secret, body.totp_code):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authenticator code.")

    crud.update_user_last_login(db, user.id)
    remember_me = bool(payload.get("rm", False))
    access_token, expires_in_seconds = security.issue_access_token_for_user(user.id, remember_me)
    return schemas.LoginTokenResponse(
        access_token=access_token,
        remember_me=remember_me,
        expires_in_seconds=expires_in_seconds,
    )


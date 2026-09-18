from fastapi import APIRouter, Depends, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .. import schemas
from ..core.rate_limit import limiter
from ..db.session import get_db
from ..services import auth_service

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])


@router.post("/login", response_model=schemas.TokenRespuesta)
@limiter.limit("5/minute")
def login(request: Request, form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # `username` del formulario OAuth2 se usa como email.
    token = auth_service.autenticar(db, form.username, form.password)
    return schemas.TokenRespuesta(access_token=token)

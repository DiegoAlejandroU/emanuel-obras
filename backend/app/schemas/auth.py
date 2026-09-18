from pydantic import BaseModel


class TokenRespuesta(BaseModel):
    access_token: str
    token_type: str = "bearer"

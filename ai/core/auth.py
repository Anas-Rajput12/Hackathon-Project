import secrets

from fastapi import Header, HTTPException, status

from core.config import get_settings

settings = get_settings()


async def verify_service_secret(x_ai_service_secret: str = Header(...)):
    if not settings.ai_service_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI service configuration error",
        )
    if not secrets.compare_digest(x_ai_service_secret, settings.ai_service_secret):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized AI service request",
        )
    return x_ai_service_secret

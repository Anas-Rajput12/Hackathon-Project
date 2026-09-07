from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import get_settings
from routers.health import router as health_router
from routers.analyze import router as analyze_router

settings = get_settings()
app = FastAPI(title="AquaTrace AI Service", version="0.1.0")


@app.get("/")
async def root():
    return {"service": "aquatrace-ai", "status": "ok", "health": "/health"}


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-AI-Service-Secret"],
)

app.include_router(health_router)
app.include_router(analyze_router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=settings.port, reload=True)

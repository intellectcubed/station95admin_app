from fastapi import FastAPI, Request, Depends, Form
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
import httpx, os
from dotenv import load_dotenv

load_dotenv()

from .supabase_auth import verify_user

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

CALENDAR_URL = os.getenv("CALENDAR_URL", "http://localhost:8000")


@app.get("/", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})


@app.post("/login", response_class=RedirectResponse)
async def login(email: str = Form(...), password: str = Form(...)):
    """Authenticate using Supabase and redirect."""
    if await verify_user(email, password):
        response = RedirectResponse(url="/admin", status_code=302)
        response.set_cookie("user", email)
        return response
    return RedirectResponse(url="/?error=Invalid login", status_code=302)


@app.get("/admin", response_class=HTMLResponse)
async def admin_page(request: Request):
    """Serve the admin panel."""
    user = request.cookies.get("user")
    if not user:
        return RedirectResponse(url="/")
    return templates.TemplateResponse("admin.html", {"request": request, "user": user})


@app.get("/api")
async def api_proxy(request: Request):
    """Proxy API requests to the calendar_commands service."""
    async with httpx.AsyncClient() as client:
        res = await client.get(CALENDAR_URL, params=request.query_params)
    if "application/json" in res.headers.get("content-type", ""):
        return JSONResponse(res.json())
    return HTMLResponse(res.text)


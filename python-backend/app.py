import inspect
import os
import sqlite3

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Depends, Form, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.responses import RedirectResponse, JSONResponse

from cred import is_permitted, change_cred
from init import make_comments, make_login
from record import create_record, get_all_records, purge_all_records
from schemas import StatusResponse, GetRecordsResponse

# -------------------------------
# Load database
# -------------------------------
is_reset_password_file = os.path.join(os.path.dirname(__file__), 'is_reset_password.txt')
dbfile = os.path.join(os.path.dirname(__file__), 'data.db')

# -----------
# Load env
# -----------
load_dotenv()
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', '*')
origins = [origin.strip() for origin in ALLOWED_ORIGINS.split(",") if origin.strip()] if ALLOWED_ORIGINS != '*' else ["*"]
SECRET_KEY = os.getenv('SECRET_KEY')
BEARER_TOKEN = os.getenv('BEARER_TOKEN')

# ----------------
# FastAPI setup
# ----------------
app = FastAPI(
    title="Public Comment Backend",
    description="Backend for Public Comment service.",
    version="1.1",
    openapi_url="/api/v1/openapi.json",
    docs_url="/api/v1/docs",
    root_path="/api/v1",
)

app.add_middleware(
    SessionMiddleware,
    secret_key=SECRET_KEY,
    max_age=1800,  # In seconds
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)

bearer_scheme = HTTPBearer(auto_error=False)


async def verify_bearer_token(
        credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
):
    if credentials and credentials.scheme == "Bearer" and credentials.credentials == BEARER_TOKEN:
        return True
    else:
        return False


class SessionData(BaseModel):
    permitted: bool


# ---------
# Routes
# ---------
@app.get(
    "/status",
    response_model=StatusResponse,
    summary="Status of backend",
    description="Get the statistics of backend.",
    tags=["Status"],
)
def status_route():
    return JSONResponse({
        "status": True,
        "message": "It's alive!",
        "data": None,
    })


@app.post(
    "/logout",
    response_model=StatusResponse,
    summary="Logout",
    description="Logout the current logged in user.",
    tags=["Authentication"],
)
def logout_route(request: Request):
    request.session.pop("user", None)
    return JSONResponse({
        "status": True,
        "message": "Logged out!",
        "data": None,
    })


@app.post(
    "/login",
    response_model=StatusResponse,
    summary="Login",
    description="Login with username and password.",
    tags=["Authentication"],
)
async def login_route(request: Request, username: str = Form(...), password: str = Form(...)):
    if not is_permitted(username, password):
        request.session.pop("user", None)
        return JSONResponse({
            "status": False,
            "message": "Invalid credentials!",
            "data": None,
        })

    request.session["user"] = SessionData(permitted=True).model_dump()
    return JSONResponse({
        "status": True,
        "message": "Logged in!",
        "data": None,
    })


@app.get(
    "/admin_check",
    response_model=StatusResponse,
    summary="Admin check",
    description="Check if the current session is an admin or not.",
    tags=["Authentication"],
)
async def check_user_route(request: Request):
    session_data = request.session.get("user", {"permitted": False})

    if not session_data.get("permitted"):
        return JSONResponse({
            "status": False,
            "message": "Log in first!",
            "data": None,
        })

    return JSONResponse({
        "status": True,
        "message": "User permitted!",
        "data": None,
    })


@app.post(
    "/change_pass",
    response_model=StatusResponse,
    summary="Change password",
    description="Change admin password with new password.",
    tags=["Authentication"],
)
async def change_pass_route(
        request: Request,
        new_pass: str = Form(..., description="The new password"),
        bypass: bool = Depends(verify_bearer_token),
):
    session_data = request.session.get("user", {"permitted": False})

    if not (bypass or session_data.get("permitted")):
        return JSONResponse({
            "status": False,
            "message": "Login first!",
            "data": None,
        })

    change_cred(new_pass)
    return JSONResponse({
        "status": True,
        "message": "Password changed!",
        "data": None,
    })


@app.post(
    "/create_record",
    response_model=StatusResponse,
    summary="Create a record",
    description="Create a comment record with the given text.",
    tags=["Record"],
)
async def create_record_route(
        comment_text: str = Form(..., description="Comment text to store", examples=[""]),
):
    create_record(comment_text)
    return JSONResponse({
        "status": True,
        "message": "Comment created!",
        "data": None,
    })




@app.get(
    "/get_all_records",
    response_model=GetRecordsResponse,
    summary="Get all records",
    description="Get all records from the database.",
    tags=["Record"],
)
def get_all_records_route():

    return JSONResponse({
        "status": True,
        "message": "Success!",
        "data": {
            "records": get_all_records()
        },
    })


@app.delete(
    "/purge_all_records",
    response_model=StatusResponse,
    summary="Purge all records",
    description="Purge all records from the database.",
    tags=["Record"],
)
def purge_all_records_route(
        request: Request,
        bypass: bool = Depends(verify_bearer_token)
):
    session_data = request.session.get("user", {"permitted": False})
    if not (bypass or session_data.get("permitted")):
        return RedirectResponse(url="/login/", status_code=302)

    purge_all_records()
    return JSONResponse({
        "status": True,
        "message": "All records deleted!",
        "data": None,
    })


def init():
    """
    Initialize the database.
    """
    with sqlite3.connect(dbfile) as con:
        cur = con.cursor()
        make_comments(con.commit, cur)
        make_login(con.commit, cur)


if __name__ == "__main__":
    # Initialize database if not exists
    if not os.path.exists(dbfile):
        print("Initializing database...")
        init()
        exit()

    # Reset password if file is_reset_password.txt is 1
    # The file is set by either user manually or by the setup.sh script
    with open(is_reset_password_file, 'r+') as f:
        if f.read().strip() == '1':
            with sqlite3.connect(dbfile) as con:
                cur = con.cursor()
                make_login(con.commit, cur)
                print("Password reset sucessfully!")
            f.seek(0)
            f.write('0')
            f.truncate()

    uvicorn.run("app:app", host="0.0.0.0", port=8000)
    # uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True, log_level="trace") # for debugging

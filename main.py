from datetime import datetime, timedelta, timezone
from typing import Optional

from models import User, Company, Invoice

import jwt
from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from pwdlib import PasswordHash
from database import Base, engine, get_db, SessionLocal
from sqlalchemy.orm import Session

app = FastAPI()


SECRET_KEY = "change-this-secret-key-later"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

password_hash = PasswordHash.recommended()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

def hash_password(password: str):
    return password_hash.hash(password)


def verify_password(plain_password: str, hashed_password: str):
    return password_hash.verify(plain_password, hashed_password)

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first() 


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    payload = data.copy()

    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    payload.update({"exp": expire})
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")

        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")

    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = get_user_by_email(db, email)

    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    return user

def seed_database(db: Session):
    existing_admin = db.query(User).filter(User.email == "terrance@example.com").first()

    if existing_admin:
        return

    admin_user = User(
        name="Terrance",
        email="terrance@example.com",
        role="admin",
        hashed_password=hash_password("password123")
    )

    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    company = Company(
        name="Silence Security",
        owner_id=admin_user.id
    )

    db.add(company)
    db.commit()
    db.refresh(company)

    invoice = Invoice(
        company_id=company.id,
        amount=2500,
        status="paid"
    )

    db.add(invoice)
    db.commit()

Base.metadata.create_all(bind=engine)

with SessionLocal() as db: 
    seed_database(db)


@app.get("/")
def home():
    return {
        "message": "Resonance API Playground is running",
        "status": "ok"
    }


@app.post("/auth/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    existing_user = get_user_by_email(db, request.email)

    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
    name=request.name,
    email=request.email,
    role="user",
    hashed_password=hash_password(request.pasword)
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)


    return {
        "message": "User registered successfully",
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
            "role": new_user.role
        }
    }


@app.post("/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = get_user_by_email(db, form_data.username)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token(data={"sub": user["email"]})

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@app.get("/users/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role
    }


@app.get("/users")
def get_users(db: Session = Depends(get_db)):
    users = db.query(User).all() 

    return [
    {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role
    }
    for user in users
]

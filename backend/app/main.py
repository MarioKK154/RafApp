# backend/app/main.py
from fastapi import FastAPI

app = FastAPI(title="RafApp API")

@app.get("/")
def read_root():
    return {"message": "Welcome to RafApp API"}
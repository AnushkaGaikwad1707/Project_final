from operational.operational_routes import router as operational_router
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import pandas as pd
from pathlib import Path

from database import engine, Base, get_db
from models import Component
from schemas import ComponentCreate


Base.metadata.create_all(bind=engine)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(operational_router)

# ============================================================
# FILE PATH
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"

EXPLAINABILITY_FILE = DATA_DIR / "explainability_report.csv"


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():
    return {
        "message": "SIH26170 Backend is running"
    }


# ============================================================
# CREATE COMPONENT
# ============================================================

@app.post("/components")
def create_component(
    component: ComponentCreate,
    db: Session = Depends(get_db)
):
    new_component = Component(
        component_id=component.component_id,
        lot_id=component.lot_id,
        device_variant=component.device_variant,
        iddq_0h=component.iddq_0h,
        iddq_24h=component.iddq_24h
    )

    db.add(new_component)
    db.commit()
    db.refresh(new_component)

    return {
        "message": "Component saved successfully",
        "component_id": new_component.component_id
    }


# ============================================================
# GET COMPLETE ANALYSIS
# ============================================================

@app.get("/analysis")
def get_analysis():

    report = pd.read_csv(EXPLAINABILITY_FILE)

    # Convert NaN values to None so FastAPI can return valid JSON
    report = report.astype(object).where(pd.notna(report), None)

    return {
        "total_components": len(report),
        "decision_counts": report["final_decision"].value_counts().to_dict(),
        "components": report.to_dict(orient="records")
    }


# ============================================================
# GET ANALYSIS FOR ONE COMPONENT
# ============================================================

@app.get("/analysis/{component_id}")
def get_component_analysis(component_id: str):

    report = pd.read_csv(EXPLAINABILITY_FILE)

    result = report[
        report["component_id"].astype(str) == component_id
    ]

    if result.empty:
        return {
            "error": "Component not found"
        }

    # Convert NaN values to None
    result = result.astype(object).where(pd.notna(result), None)

    return result.iloc[0].to_dict()

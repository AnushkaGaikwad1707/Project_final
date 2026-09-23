from pathlib import Path
from fastapi import FastAPI, Depends, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import math

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"

# Use our new pandas-based data loader
import data_loader
from operational.operational_routes import router as operational_router

app = FastAPI(title="SIH26170 Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Keep the operational routes intact at standard /api paths and /api/operational fallback
app.include_router(operational_router)

@app.get("/")
def health_check(request: Request):
    accept = request.headers.get("accept", "")
    if "text/html" in accept and FRONTEND_DIST.exists():
        index_file = FRONTEND_DIST / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
    return {"status": "ok", "message": "SIH26170 Backend is running"}

@app.get("/api/analysis/search")
def search_components(q: str = Query(..., min_length=1)):
    results = data_loader.search_components(q)
    formatted = []
    for r in results:
        formatted.append({
            "component_id": r.get("component_id"),
            "disposition": r.get("module_a_disposition"),
            "module_a_disposition": r.get("module_a_disposition"),
            "evidence_tier": r.get("module_a_evidence_tier"),
            "module_a_evidence_tier": r.get("module_a_evidence_tier"),
            "score": r.get("module_a_score"),
            "module_a_score": r.get("module_a_score"),
            "primary_parameter": r.get("module_a_primary_parameter") or r.get("module_b_primary_parameter"),
            "module_b_primary_parameter": r.get("module_b_primary_parameter"),
        })
    return formatted

@app.get("/api/analysis/summary")
def get_summary():
    return data_loader.get_summary_counts()

@app.get("/api/analysis/{component_id}")
def get_analysis_detail(component_id: str):
    analysis = data_loader.get_component_analysis(component_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Component not found")
    return analysis

@app.get("/api/analysis/{component_id}/module-a")
def get_module_a_epochs(component_id: str):
    epochs_data = {}
    for epoch, df in data_loader.module_a_dfs.items():
        if component_id in df.index:
            epochs_data[epoch] = df.loc[component_id].to_dict()
        else:
            epochs_data[epoch] = None
            
    if all(v is None for v in epochs_data.values()):
        raise HTTPException(status_code=404, detail="Component not found in Module A data")
        
    return {"epochs": epochs_data}

@app.get("/api/analysis/{component_id}/module-b")
def get_module_b_detail(component_id: str):
    if component_id not in data_loader.module_b_df.index:
        raise HTTPException(status_code=404, detail="Component not found in Module B data")
    return data_loader.module_b_df.loc[component_id].to_dict()

@app.get("/api/components")
def get_components_list(
    page: int = 1,
    per_page: int = 50,
    disposition: str = None,
    verdict: str = None,
    variant: str = None,
    lot: str = None,
    q: str = None
):
    df = data_loader.fusion_df
    
    if q:
        q = q.upper()
        mask = df["component_id"].str.upper().str.contains(q, na=False)
        if "lot_id" in df.columns:
            mask = mask | df["lot_id"].str.upper().str.contains(q, na=False)
        df = df[mask]
        
    if verdict:
        if "fused_verdict" in df.columns:
            df = df[df["fused_verdict"].str.upper() == verdict.upper()]
        elif "module_a_disposition" in df.columns:
            df = df[df["module_a_disposition"].str.upper() == verdict.upper()]
            
    if disposition:
        if "module_a_disposition" in df.columns:
            df = df[df["module_a_disposition"].str.upper() == disposition.upper()]
            
    if variant:
        var_col = "device_variant" if "device_variant" in df.columns else ("variant" if "variant" in df.columns else None)
        if var_col:
            df = df[df[var_col].str.upper() == variant.upper()]

    if lot:
        if "lot_id" in df.columns:
            df = df[df["lot_id"].str.upper() == lot.upper()]
            
    total = len(df)
    total_pages = math.ceil(total / per_page) if per_page > 0 else 1
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    
    rows = df.iloc[start_idx:end_idx].to_dict(orient="records")
    paginated = []
    for r in rows:
        paginated.append({
            **r,
            "fused_verdict": r.get("fused_verdict", r.get("module_a_disposition", "PASS")),
            "disposition": r.get("module_a_disposition"),
            "evidence_tier": r.get("module_a_evidence_tier"),
            "score": r.get("module_a_score"),
            "primary_parameter": r.get("module_a_primary_parameter") or r.get("module_b_primary_parameter"),
            "variant": r.get("device_variant") or r.get("variant"),
        })
    
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1,
        "data": paginated
    }

@app.get("/api/models/info")
def get_models_info():
    return data_loader.get_models_info()

@app.get("/api/models/evaluation")
def get_models_evaluation():
    return data_loader.get_evaluation_metrics()

@app.get("/api/lots")
def get_lots():
    return data_loader.get_lots_summary()

@app.get("/api/pipeline/architecture")
def get_pipeline_architecture():
    return data_loader.get_pipeline_architecture()

@app.get("/api/system/status")
def system_status():
    ds_info = data_loader.dataset_version or {}
    return {
        "status": "ok",
        "api": "online",
        "api_status": "ok",
        "data_loaded": True,
        "data_files_ok": len(data_loader.fusion_df) > 0,
        "db_status": "ok",
        "operational_db": "online",
        "fusion_records": len(data_loader.fusion_df),
        "module_a_records_168h": len(data_loader.module_a_dfs.get(168, [])),
        "module_b_records": len(data_loader.module_b_df),
        "dataset_info": {
            "id": ds_info.get("dataset_id", "SIH26170-FINAL-01"),
            "status": ds_info.get("status", "AUTHORITATIVE_FROZEN_FINAL"),
            "rows": ds_info.get("total_rows", 5400),
            "lots": ds_info.get("total_lots", 72)
        },
        "environment": "prototype-production",
        "version": "1.0.0-final"
    }

@app.get("/api/reference/specs")
def get_device_specs():
    return data_loader.device_specs_df.to_dict(orient="records")

@app.get("/api/reference/dictionary")
def get_data_dictionary():
    return data_loader.schema_dictionary_df.to_dict(orient="records")

# Mount static assets if frontend production build exists
if FRONTEND_DIST.exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend_spa(request: Request, full_path: str):
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            raise HTTPException(status_code=404, detail="Not Found")
        
        target = FRONTEND_DIST / full_path
        if target.exists() and target.is_file():
            return FileResponse(target)
        
        index_file = FRONTEND_DIST / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Frontend build not found")


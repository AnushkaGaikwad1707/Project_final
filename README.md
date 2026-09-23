# SIH26170 — Semiconductor Reliability Analysis Application

**Smart India Hackathon 2026** | **Problem Statement 26170 (ISRO)**  
**Domain:** AI-Driven Anomaly Detection and Prognostic Drift Modeling in Component Burn-in and Screening  
**Prototype Status:** Production-Ready Analytical Console (FastAPI `:8001` + React `:5174`)  

---

## Overview

The **SIH26170 Application** is a specialized quality assurance and degradation monitoring platform designed for space-grade semiconductor qualification. It evaluates electronic components across multi-epoch burn-in stress testing (0h, 24h, 96h, 168h) by coupling **Module A** (multi-epoch observed-anomaly detection using lot-relative Mahalanobis scoring) with **Module B** (early 168h wearout drift forecasting using Huber robust regression on 0h and 24h data).

A deterministic, rule-based **Decision Fusion Layer** synthesizes multi-module evidence into a tri-state reliability disposition: **PASS**, **MONITOR**, or **REJECT**, with complete physical explainability, attribution margins, and strict separation between frozen qualification benchmarks and operational test floor records.

---

## Key Metrics & Results (Frozen Benchmark `SIH26170-FINAL-01`)

- **Authoritative Fleet Population:** `1,343` components across `18` whole production lots (`LOTSPLIT-05`).
- **Fused Reliability Verdicts:**
  - `PASS`: **1,113** components ($82.87\%$)
  - `MONITOR`: **202** components ($15.04\%$)
  - `REJECT`: **28** components ($2.09\%$) — 23 confirmed hard spec breaches + 5 early wearout breaches.
- **Authoritative Model Performance (1% False Positive Rate Budget):**
  - $\text{True Positives (TP)} = 65, \quad \text{True Negatives (TN)} = 1,240$
  - $\text{False Positives (FP)} = 13, \quad \text{False Negatives (FN)} = 25$
  - $\text{Recall} = \mathbf{72.22\%}, \quad \text{Precision} = \mathbf{83.33\%}, \quad \text{Specificity} = \mathbf{98.96\%}$
  - $\mathbf{F_2 \text{ Utility Score}} = \mathbf{74.20\%}$ (Prioritizing space-grade defect escape prevention)
- **Decision D2 Sensitivity Proof:** Catching 1 additional defect ($25 \to 24$ FN) requires accepting 5 extra false alarms ($13 \to 18$ FP), yielding only a $+0.12\%$ change in $F_2$, mathematically justifying the conservative 1% FPR freeze.

---

## Complete Project Documentation

Exhaustive, verifiable engineering documentation is organized into two dedicated reports:

1. **SIH26170 Prototype & System Documentation**  
   - Formats: [Markdown](docs/SIH26170_Prototype_Documentation.md) | [Word Document (.docx)](docs/SIH26170_Prototype_Documentation.docx) | [PDF Document (.pdf)](docs/SIH26170_Prototype_Documentation.pdf)
   - Executive summary, ISRO problem statement breakdown, and technical requirements.
   - Screen-by-screen guide for all 7 frontend views (`Overview`, `Analyze`, `Component Detail`, `Components`, `Models`, `Data`, `System`).
   - Detailed mathematical and algorithmic explanation of Module A, Module B, and Decision Fusion.
   - Forensic explainability engine, plain-English reason codes, and attribution margins.
   - Model evaluation matrices, epoch evolution, and Decision D2 sensitivity analysis.
   - Relevance to ISRO, limitations, 5–10 minute demonstration sequence, and 15 technical judge Q&As.

2. **SIH26170 File Structure & Data Documentation**  
   - Formats: [Markdown](docs/SIH26170_File_and_Data_Documentation.md) | [Word Document (.docx)](docs/SIH26170_File_and_Data_Documentation.docx) | [PDF Document (.pdf)](docs/SIH26170_File_and_Data_Documentation.pdf)
   - Verified ASCII directory tree of the complete repository.
   - File-by-file technical reference for every backend, frontend, and operational script.
   - Complete inventory and data dictionary for all datasets in `data/final/`, `data/reference/`, and `data/operational/`.
   - Data lineage map from raw archives (`incoming/`) down to React UI components.
   - Operational database schema (`operational.db`) and benchmark isolation firewall.
   - Reproducibility guide, test suite documentation, and troubleshooting notes.

3. **Implementation Walkthrough & Verification Record**  
   - Format: [Markdown](docs/walkthrough.md)
   - Chronological engineering log, automated test results, and live endpoint verification matrix.

---

## Architecture Summary

```
[Raw Incoming Data] ──► [LOTSPLIT-05 Partition (1,343 Parts)]
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
   [Module A: Screening]                 [Module B: Prognosis]
   (Observed Outliers & Specs)           (Huber Regressors 0h+24h)
            │                                     │
            └──────────────────┬──────────────────┘
                               │
                               ▼
                    [Decision Fusion Engine]
                    (PASS / MONITOR / REJECT)
                               │
                               ▼
                   [FastAPI REST API (:8001)] ◄──► [operational.db]
                               │
                               ▼
                   [React Console UI (:5174)]
```

---

## Quick Start & Setup Instructions

### 1. Prerequisites
- Python 3.11+ (Python 3.13 tested)
- Node.js 20+ and npm

### 2. Backend Startup
```powershell
cd C:\Users\admin\Desktop\sih26170\backend
pip install fastapi uvicorn pandas numpy scikit-learn
python test_integration.py
python -m uvicorn main:app --host 127.0.0.1 --port 8001
```

### 3. Frontend Startup
```powershell
cd C:\Users\admin\Desktop\sih26170\frontend
cmd.exe /c npm install
cmd.exe /c npm run dev -- --port 5174 --host
```

### 4. Access the Live Application
- **Analytical Web Console:** [http://localhost:5174](http://localhost:5174)
- **FastAPI Backend Root:** [http://127.0.0.1:8001](http://127.0.0.1:8001)
- **Interactive Swagger Docs:** [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs)

---

## Live Demonstration Flow (5 Minutes)

1. **Overview Dashboard (`/`):** Review fleet KPIs (`1,343` parts, `1,113` PASS, `202` MONITOR, `28` REJECT) and live model metrics ($F_2 = 74.20\%$).
2. **Conforming Component (`/analyze`):** Quick-select `C00158` to view nominal physical parameters and green `PASS` clearance.
3. **Catastrophic Spec Breach (`/analyze`):** Search `C00198` to inspect hard dielectric breakdown ($I_{\text{DDQ}} = 5.42 \ \mu\text{A}$ vs $2.50 \ \mu\text{A}$ limit) triggering `REJECT`.
4. **Prognostic Wearout Rejection (`/analyze`):** Search `C05046` to show how Module B's 24h forecast caught an impending propagation delay breach ($4.15 \text{ ns}$ P95 bound vs $4.10 \text{ ns}$ limit) that passed static screening.
5. **Fleet Filter (`/components`):** Filter by `REJECT` and inspect batch defect clustering in production lot `C_L24`.
6. **Model Studio (`/models`):** Toggle the interactive 2x2 confusion matrix between Baseline and Relaxed Cutoff to demonstrate the mathematical proof of Decision D2.
7. **Operational Data Studio (`/data`):** Add a live test floor measurement via the 4-step wizard into SQLite `operational.db`, demonstrating zero leakage into the frozen benchmark.
8. **Lineage Command Center (`/system`):** Inspect the 7-stage interactive pipeline flow and explore the 18 device physical specifications.

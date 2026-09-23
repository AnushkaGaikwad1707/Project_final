from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from .operational_db import get_connection


router = APIRouter(
    prefix="/api",
    tags=["Operational Demo"]
)


# ============================================================
# REQUEST SCHEMA
# ============================================================

class MeasurementInput(BaseModel):
    component_id: str
    lot_id: Optional[str] = None
    device_variant: Optional[str] = None

    epoch_h: int = Field(..., description="Allowed values: 0, 24, 96, 168")

    IDDQ: Optional[float] = None
    Input_Leakage_Current: Optional[float] = None
    Active_Supply_Current: Optional[float] = None
    Propagation_Delay: Optional[float] = None
    Output_Rise_Time: Optional[float] = None
    Output_Fall_Time: Optional[float] = None
    measurements: Optional[dict] = None

    measured_at: Optional[str] = None


# ============================================================
# VALIDATION
# ============================================================

ALLOWED_EPOCHS = {0, 24, 96, 168}

ALLOWED_VARIANTS = {
    "CMOS_A",
    "CMOS_B",
    "CMOS_C"
}


def validate_measurement(data: MeasurementInput):

    if not data.component_id.strip():
        raise HTTPException(
            status_code=400,
            detail="component_id is required"
        )

    if data.epoch_h not in ALLOWED_EPOCHS:
        raise HTTPException(
            status_code=400,
            detail="epoch_h must be 0, 24, 96, or 168"
        )

    # Support nested measurements if provided
    if data.measurements and isinstance(data.measurements, dict):
        for k in ["IDDQ", "Input_Leakage_Current", "Active_Supply_Current", "Propagation_Delay", "Output_Rise_Time", "Output_Fall_Time"]:
            if getattr(data, k) is None and k in data.measurements:
                setattr(data, k, float(data.measurements[k]))

    measurements = {
        "IDDQ": data.IDDQ,
        "Input_Leakage_Current": data.Input_Leakage_Current,
        "Active_Supply_Current": data.Active_Supply_Current,
        "Propagation_Delay": data.Propagation_Delay,
        "Output_Rise_Time": data.Output_Rise_Time,
        "Output_Fall_Time": data.Output_Fall_Time,
    }

    for parameter, value in measurements.items():
        if value is None:
            raise HTTPException(
                status_code=400,
                detail=f"{parameter} is required"
            )
        if value <= 0:
            raise HTTPException(
                status_code=400,
                detail=f"{parameter} must be greater than 0"
            )

    if data.device_variant is not None:
        if data.device_variant not in ALLOWED_VARIANTS:
            raise HTTPException(
                status_code=400,
                detail="device_variant must be CMOS_A, CMOS_B, or CMOS_C"
            )


# ============================================================
# ADD ONE MEASUREMENT
# ============================================================

@router.post("/measurements")
def add_measurement(data: MeasurementInput):

    validate_measurement(data)

    connection = get_connection()

    try:

        # ----------------------------------------------------
        # Check whether component already exists
        # ----------------------------------------------------

        component = connection.execute(
            """
            SELECT *
            FROM components
            WHERE component_id = ?
            """,
            (data.component_id,)
        ).fetchone()

        # ----------------------------------------------------
        # New component
        # ----------------------------------------------------

        if component is None:

            if not data.lot_id:
                raise HTTPException(
                    status_code=400,
                    detail="lot_id is required for a new component"
                )

            if not data.device_variant:
                raise HTTPException(
                    status_code=400,
                    detail="device_variant is required for a new component"
                )

            connection.execute(
                """
                INSERT INTO components
                (
                    component_id,
                    lot_id,
                    device_variant
                )
                VALUES (?, ?, ?)
                """,
                (
                    data.component_id,
                    data.lot_id,
                    data.device_variant
                )
            )

        # ----------------------------------------------------
        # Existing component
        # ----------------------------------------------------

        else:

            if data.lot_id and data.lot_id != component["lot_id"]:
                raise HTTPException(
                    status_code=400,
                    detail="lot_id does not match existing component"
                )

            if (
                data.device_variant
                and data.device_variant != component["device_variant"]
            ):
                raise HTTPException(
                    status_code=400,
                    detail="device_variant does not match existing component"
                )

        # ----------------------------------------------------
        # Check duplicate component + epoch
        # ----------------------------------------------------

        existing_measurement = connection.execute(
            """
            SELECT measurement_id
            FROM measurements
            WHERE component_id = ?
            AND epoch_h = ?
            """,
            (
                data.component_id,
                data.epoch_h
            )
        ).fetchone()

        if existing_measurement:

            raise HTTPException(
                status_code=409,
                detail=(
                    "Measurement already exists for this "
                    "component and epoch. Explicit replace/confirm "
                    "is required."
                )
            )

        # ----------------------------------------------------
        # Insert measurement
        # ----------------------------------------------------

        cursor = connection.execute(
            """
            INSERT INTO measurements
            (
                component_id,
                epoch_h,
                IDDQ,
                Input_Leakage_Current,
                Active_Supply_Current,
                Propagation_Delay,
                Output_Rise_Time,
                Output_Fall_Time,
                measured_at,
                source
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), 'manual')
            """,
            (
                data.component_id,
                data.epoch_h,
                data.IDDQ,
                data.Input_Leakage_Current,
                data.Active_Supply_Current,
                data.Propagation_Delay,
                data.Output_Rise_Time,
                data.Output_Fall_Time,
                data.measured_at
            )
        )

        connection.commit()

        return {
            "message": "Measurement stored successfully",
            "component_id": data.component_id,
            "epoch_h": data.epoch_h,
            "measurement_id": cursor.lastrowid
        }

    except HTTPException:
        connection.rollback()
        raise

    except Exception as error:
        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Could not store measurement: {str(error)}"
        )

    finally:
        connection.close()

# ============================================================
# GET COMPONENT DETAIL + MEASUREMENT HISTORY
# ============================================================

@router.get("/components/{component_id}")
def get_component_detail(component_id: str):

    connection = get_connection()

    try:
        # ----------------------------------------------------
        # Get component information
        # ----------------------------------------------------

        component = connection.execute(
            """
            SELECT
                component_id,
                lot_id,
                device_variant,
                device_family,
                created_at,
                updated_at
            FROM components
            WHERE component_id = ?
            """,
            (component_id,)
        ).fetchone()

        if component is None:
            raise HTTPException(
                status_code=404,
                detail="Component not found"
            )

        # ----------------------------------------------------
        # Get all measurements for this component
        # ----------------------------------------------------

        measurements = connection.execute(
            """
            SELECT
                measurement_id,
                component_id,
                epoch_h,
                IDDQ,
                Input_Leakage_Current,
                Active_Supply_Current,
                Propagation_Delay,
                Output_Rise_Time,
                Output_Fall_Time,
                measured_at,
                source
            FROM measurements
            WHERE component_id = ?
            ORDER BY epoch_h ASC
            """,
            (component_id,)
        ).fetchall()

        # ----------------------------------------------------
        # Convert SQLite rows to dictionaries
        # ----------------------------------------------------

        component_data = dict(component)

        measurement_data = [
            dict(row)
            for row in measurements
        ]

        # ----------------------------------------------------
        # Return component + history
        # ----------------------------------------------------

        return {
            "component": component_data,
            "measurement_count": len(measurement_data),
            "measurements": measurement_data
        }

    finally:
        connection.close()

# ============================================================
# GET COMPONENT PARAMETER TRAJECTORY
# ============================================================

@router.get("/components/{component_id}/trajectory")
def get_component_trajectory(component_id: str):

    connection = get_connection()

    try:
        # ----------------------------------------------------
        # Check component exists
        # ----------------------------------------------------

        component = connection.execute(
            """
            SELECT component_id
            FROM components
            WHERE component_id = ?
            """,
            (component_id,)
        ).fetchone()

        if component is None:
            raise HTTPException(
                status_code=404,
                detail="Component not found"
            )

        # ----------------------------------------------------
        # Get measurements in chronological order
        # ----------------------------------------------------

        measurements = connection.execute(
            """
            SELECT
                epoch_h,
                IDDQ,
                Input_Leakage_Current,
                Active_Supply_Current,
                Propagation_Delay,
                Output_Rise_Time,
                Output_Fall_Time,
                measured_at
            FROM measurements
            WHERE component_id = ?
            ORDER BY epoch_h ASC
            """,
            (component_id,)
        ).fetchall()

        # ----------------------------------------------------
        # Build trajectory response
        # ----------------------------------------------------

        trajectory = {
            "IDDQ": [],
            "Input_Leakage_Current": [],
            "Active_Supply_Current": [],
            "Propagation_Delay": [],
            "Output_Rise_Time": [],
            "Output_Fall_Time": []
        }

        for row in measurements:

            for parameter in trajectory:
                trajectory[parameter].append({
                    "epoch_h": row["epoch_h"],
                    "value": row[parameter],
                    "measured_at": row["measured_at"]
                })

        return {
            "component_id": component_id,
            "measurement_count": len(measurements),
            "trajectory": trajectory
        }

    finally:
        connection.close()

# ============================================================
# GET OPERATIONAL DASHBOARD SUMMARY
# ============================================================

@router.get("/dashboard/summary")
def get_dashboard_summary():

    connection = get_connection()

    try:
        # ----------------------------------------------------
        # Total operational components
        # ----------------------------------------------------

        total_components = connection.execute(
            """
            SELECT COUNT(*) AS count
            FROM components
            """
        ).fetchone()["count"]

        # ----------------------------------------------------
        # Total measurements
        # ----------------------------------------------------

        total_measurements = connection.execute(
            """
            SELECT COUNT(*) AS count
            FROM measurements
            """
        ).fetchone()["count"]

        # ----------------------------------------------------
        # Latest measurement
        # ----------------------------------------------------

        latest_measurement = connection.execute(
            """
            SELECT
                measurement_id,
                component_id,
                epoch_h,
                measured_at,
                source
            FROM measurements
            ORDER BY measured_at DESC, measurement_id DESC
            LIMIT 1
            """
        ).fetchone()

        # ----------------------------------------------------
        # Recent measurements
        # ----------------------------------------------------

        recent_measurements = connection.execute(
            """
            SELECT
                measurement_id,
                component_id,
                epoch_h,
                measured_at,
                source
            FROM measurements
            ORDER BY measured_at DESC, measurement_id DESC
            LIMIT 10
            """
        ).fetchall()

        # ----------------------------------------------------
        # Components with latest measurement
        # ----------------------------------------------------

        components_with_latest_update = connection.execute(
            """
            SELECT
                c.component_id,
                c.lot_id,
                c.device_variant,
                MAX(m.measured_at) AS latest_measurement_at
            FROM components c
            LEFT JOIN measurements m
                ON c.component_id = m.component_id
            GROUP BY
                c.component_id,
                c.lot_id,
                c.device_variant
            ORDER BY latest_measurement_at DESC
            LIMIT 10
            """
        ).fetchall()

        return {
            "total_components": total_components,
            "total_measurements": total_measurements,

            "latest_measurement": (
                dict(latest_measurement)
                if latest_measurement
                else None
            ),

            "recent_measurements": [
                dict(row)
                for row in recent_measurements
            ],

            "recently_updated_components": [
                dict(row)
                for row in components_with_latest_update
            ]
        }

    finally:
        connection.close()
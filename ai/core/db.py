import json
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any

import psycopg
from psycopg.rows import dict_row

from core.config import get_settings

settings = get_settings()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def get_connection():
    conn = psycopg.connect(settings.database_connection_url, row_factory=dict_row)
    try:
        yield conn
    finally:
        conn.close()


def get_incident(incident_id: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT i.*, wb.name as water_body_name, wb.type as water_body_type
                FROM "Incident" i
                LEFT JOIN "WaterBody" wb ON i."waterBodyId" = wb.id
                WHERE i.id = %s
                """,
                (incident_id,),
            )
            return cur.fetchone()


def get_evidence(incident_id: str) -> list[dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT e.*, u.name as uploaded_by_name
                FROM "Evidence" e
                JOIN "User" u ON e."uploadedById" = u.id
                WHERE e."incidentId" = %s
                ORDER BY e."uploadedAt" DESC
                """,
                (incident_id,),
            )
            return cur.fetchall()


def get_recent_incidents(limit: int = 10) -> list[dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, description, "pollutionType", severity, status, "reportedAt"
                FROM "Incident"
                ORDER BY "reportedAt" DESC
                LIMIT %s
                """,
                (limit,),
            )
            return cur.fetchall()


def has_running_analysis(incident_id: str) -> bool:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT 1 FROM "AgentAnalysis"
                WHERE "incidentId" = %s
                  AND status = 'RUNNING'
                  AND "runAt" > NOW() - INTERVAL '5 minutes'
                  AND NOT EXISTS (
                    SELECT 1
                    FROM "AgentAnalysis" AS final_analysis
                    WHERE final_analysis."incidentId" = %s
                      AND final_analysis."agentName" = 'final'
                      AND final_analysis.status = 'FAILED'
                  )
                LIMIT 1
                """,
                (incident_id, incident_id),
            )
            return cur.fetchone() is not None


def fail_running_analyses(incident_id: str, error: str) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE "AgentAnalysis"
                SET status = 'FAILED',
                    output = %s,
                    "runAt" = %s
                WHERE "incidentId" = %s AND status = 'RUNNING'
                """,
                (
                    json.dumps({"error": error}),
                    _now(),
                    incident_id,
                ),
            )
        conn.commit()


def clear_agent_analyses(incident_id: str) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM "AgentAnalysis"
                WHERE "incidentId" = %s
                """,
                (incident_id,),
            )
        conn.commit()


def save_agent_analysis(
    incident_id: str,
    agent_name: str,
    status: str,
    input_data: dict[str, Any],
    output_data: dict[str, Any] | None,
    confidence: float | None,
) -> str:
    analysis_id = str(uuid.uuid4())
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO "AgentAnalysis" (id, "agentName", status, input, output, confidence, "runAt", "incidentId")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    status = EXCLUDED.status,
                    input = EXCLUDED.input,
                    output = EXCLUDED.output,
                    confidence = EXCLUDED.confidence,
                    "runAt" = EXCLUDED."runAt"
                """,
                (
                    analysis_id,
                    agent_name,
                    status,
                    json.dumps(input_data),
                    json.dumps(output_data) if output_data is not None else None,
                    confidence,
                    _now(),
                    incident_id,
                ),
            )
        conn.commit()
    return analysis_id


def update_agent_analysis(
    analysis_id: str,
    status: str,
    output_data: dict[str, Any] | None,
    confidence: float | None,
) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE "AgentAnalysis"
                SET status = %s, output = %s, confidence = %s, "runAt" = %s
                WHERE id = %s
                """,
                (
                    status,
                    json.dumps(output_data) if output_data is not None else None,
                    confidence,
                    _now(),
                    analysis_id,
                ),
            )
        conn.commit()


def get_agent_analyses(incident_id: str) -> list[dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, "agentName" as agent_name, status, input, output, confidence, "runAt" as run_at
                FROM "AgentAnalysis"
                WHERE "incidentId" = %s
                ORDER BY "runAt" ASC
                """,
                (incident_id,),
            )
            rows = cur.fetchall()
            for row in rows:
                row["input"] = row["input"] if isinstance(row["input"], dict) else json.loads(row["input"]) if row["input"] else {}
                row["output"] = row["output"] if isinstance(row["output"], dict) else json.loads(row["output"]) if row["output"] else {}
            return rows


def get_authority_admin_users() -> list[dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, role FROM "User"
                WHERE role IN ('AUTHORITY', 'ADMIN')
                """
            )
            return cur.fetchall()


def create_alert(user_id: str, alert_type: str, title: str, message: str, incident_id: str | None) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO "Alert" (id, type, title, message, "isRead", "createdAt", "incidentId", "userId")
                VALUES (%s, %s, %s, %s, false, %s, %s, %s)
                """,
                (str(uuid.uuid4()), alert_type, title, message, _now(), incident_id, user_id),
            )
        conn.commit()

"""Initial production schema.

Revision ID: 20260605_0001
Revises:
Create Date: 2026-06-05
"""

from alembic import op
import sqlalchemy as sa

revision = "20260605_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("role", sa.String(), nullable=False, server_default="operator"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "devices",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("location", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="healthy"),
        sa.Column("health", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("failure_prob", sa.Float(), nullable=False, server_default="0"),
        sa.Column("rul", sa.Integer(), nullable=False, server_default="180"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "telemetry",
        sa.Column("telemetry_id", sa.Integer(), primary_key=True),
        sa.Column("device_id", sa.String(), sa.ForeignKey("devices.id", ondelete="CASCADE"), nullable=False),
        sa.Column("vibration_mps2", sa.Float(), nullable=False),
        sa.Column("temperature_c", sa.Float(), nullable=False),
        sa.Column("runtime", sa.Float(), nullable=False, server_default="0"),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_telemetry_device_recorded_at", "telemetry", ["device_id", "recorded_at"])

    op.create_table(
        "predictions",
        sa.Column("prediction_id", sa.Integer(), primary_key=True),
        sa.Column("device_id", sa.String(), sa.ForeignKey("devices.id", ondelete="CASCADE"), nullable=False),
        sa.Column("telemetry_id", sa.Integer(), sa.ForeignKey("telemetry.telemetry_id", ondelete="SET NULL"), nullable=True),
        sa.Column("ml_model_used", sa.String(), nullable=False),
        sa.Column("predicted_state", sa.String(), nullable=False),
        sa.Column("predicted_code", sa.Integer(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="0"),
        sa.Column("time_to_failure_sec", sa.Float(), nullable=True),
        sa.Column("failure_probability", sa.Float(), nullable=True),
        sa.Column("remaining_useful_life", sa.Float(), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_predictions_device_recorded_at", "predictions", ["device_id", "recorded_at"])

    op.create_table(
        "alerts",
        sa.Column("alert_id", sa.Integer(), primary_key=True),
        sa.Column("device_id", sa.String(), sa.ForeignKey("devices.id", ondelete="CASCADE"), nullable=False),
        sa.Column("prediction_id", sa.Integer(), sa.ForeignKey("predictions.prediction_id", ondelete="SET NULL"), nullable=True),
        sa.Column("alert_type", sa.String(), nullable=False),
        sa.Column("llm_remediation_guide", sa.Text(), nullable=True),
        sa.Column("severity", sa.String(), nullable=False, server_default="warning"),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_alerts_device_status", "alerts", ["device_id", "status"])

    op.create_table(
        "maintenance_logs",
        sa.Column("log_id", sa.Integer(), primary_key=True),
        sa.Column("device_id", sa.String(), sa.ForeignKey("devices.id", ondelete="CASCADE"), nullable=False),
        sa.Column("alert_id", sa.Integer(), sa.ForeignKey("alerts.alert_id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.Text(), nullable=False),
        sa.Column("technician", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="planned"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("maintenance_logs")
    op.drop_index("ix_alerts_device_status", table_name="alerts")
    op.drop_table("alerts")
    op.drop_index("ix_predictions_device_recorded_at", table_name="predictions")
    op.drop_table("predictions")
    op.drop_index("ix_telemetry_device_recorded_at", table_name="telemetry")
    op.drop_table("telemetry")
    op.drop_table("devices")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")


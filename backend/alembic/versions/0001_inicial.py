"""esquema inicial — usuarios, obras, actividades, bitacoras, alertas

Migracion escrita a mano a partir de los modelos SQLAlchemy vigentes
(app/models/*.py) en vez de autogenerada, porque no hay una base Postgres
disponible en el entorno donde se preparo el despliegue. Antes de aplicarla
en un Postgres real, revisa que coincida con los modelos (o genera una
nueva con `alembic revision --autogenerate` una vez tengas una base viva y
usa esta como punto de partida/backup).

Revision ID: 0001_inicial
Revises:
Create Date: 2026-09-23

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0001_inicial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "usuarios",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nombre", sa.String(length=200), nullable=False),
        sa.Column("email", sa.String(length=200), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("rol", sa.String(length=30), nullable=False, server_default="residente_obra"),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_usuarios_email", "usuarios", ["email"], unique=True)

    op.create_table(
        "obras",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nombre", sa.String(length=200), nullable=False),
        sa.Column("contratista", sa.String(length=200)),
        sa.Column("ubicacion", sa.String(length=200)),
        sa.Column("fecha_inicio", sa.Date()),
        sa.Column("fecha_fin_estimada", sa.Date()),
        sa.Column("presupuesto_total", sa.Float(), server_default="0"),
        sa.Column("estado", sa.String(length=30), server_default="planificada"),
    )

    op.create_table(
        "actividades",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("obra_id", sa.Integer(), sa.ForeignKey("obras.id"), nullable=False),
        sa.Column("nombre", sa.String(length=200), nullable=False),
        sa.Column("descripcion", sa.Text()),
        sa.Column("peso_porcentual", sa.Float(), server_default="0"),
        sa.Column("costo_presupuestado", sa.Float(), server_default="0"),
        sa.Column("fecha_inicio_programada", sa.Date()),
        sa.Column("fecha_fin_programada", sa.Date()),
        sa.Column("estado", sa.String(length=30), server_default="pendiente"),
    )

    op.create_table(
        "bitacoras_diarias",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("obra_id", sa.Integer(), sa.ForeignKey("obras.id"), nullable=False),
        sa.Column("fecha", sa.Date(), nullable=False, server_default=sa.text("CURRENT_DATE")),
        sa.Column("responsable_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("clima", sa.String(length=100)),
        sa.Column("personal_en_obra", sa.Integer(), server_default="0"),
        sa.Column("resumen", sa.Text()),
        sa.Column("estado", sa.String(length=20), nullable=False, server_default="borrador"),
        sa.Column("aprobado_por_id", sa.Integer(), sa.ForeignKey("usuarios.id"), nullable=True),
        sa.Column("aprobado_en", sa.DateTime(timezone=True), nullable=True),
        sa.Column("motivo_rechazo", sa.Text(), nullable=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    op.create_table(
        "registros_avance_actividad",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("bitacora_id", sa.Integer(), sa.ForeignKey("bitacoras_diarias.id"), nullable=False),
        sa.Column("actividad_id", sa.Integer(), sa.ForeignKey("actividades.id"), nullable=False),
        sa.Column("avance_del_dia", sa.Float(), server_default="0"),
        sa.Column("observaciones", sa.Text()),
    )

    op.create_table(
        "registros_personal",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("bitacora_id", sa.Integer(), sa.ForeignKey("bitacoras_diarias.id"), nullable=False),
        sa.Column("cargo", sa.String(length=120), nullable=False),
        sa.Column("cantidad", sa.Integer(), server_default="1"),
        sa.Column("horas_trabajadas", sa.Float(), server_default="0"),
    )

    op.create_table(
        "registros_material",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("bitacora_id", sa.Integer(), sa.ForeignKey("bitacoras_diarias.id"), nullable=False),
        sa.Column("material", sa.String(length=200), nullable=False),
        sa.Column("cantidad", sa.Float(), server_default="0"),
        sa.Column("unidad", sa.String(length=30)),
    )

    op.create_table(
        "incidentes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("bitacora_id", sa.Integer(), sa.ForeignKey("bitacoras_diarias.id"), nullable=False),
        sa.Column("tipo", sa.String(length=30), nullable=False, server_default="otro"),
        sa.Column("descripcion", sa.Text(), nullable=False),
        sa.Column("gravedad", sa.String(length=10), nullable=False, server_default="baja"),
        sa.Column("acciones_tomadas", sa.Text()),
    )

    op.create_table(
        "alertas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("obra_id", sa.Integer(), sa.ForeignKey("obras.id"), nullable=False),
        sa.Column("tipo", sa.String(length=30), nullable=False),
        sa.Column("mensaje", sa.Text(), nullable=False),
        sa.Column("fecha_generacion", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("estado", sa.String(length=10), nullable=False, server_default="activa"),
    )


def downgrade() -> None:
    op.drop_table("alertas")
    op.drop_table("incidentes")
    op.drop_table("registros_material")
    op.drop_table("registros_personal")
    op.drop_table("registros_avance_actividad")
    op.drop_table("bitacoras_diarias")
    op.drop_table("actividades")
    op.drop_table("obras")
    op.drop_index("ix_usuarios_email", table_name="usuarios")
    op.drop_table("usuarios")

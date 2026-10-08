"""Script temporal (NO versionar): crea bitácoras de demostración en la obra
"Placa Huella" para ver el flujo desde la interfaz:

  - una en estado `borrador`  -> el administrador (o el residente) le da "Enviar"
  - una en estado `enviada`   -> el interventor le da "Aprobar" / "Rechazar"

Uso (desde backend/): python -m scripts._bitacora_demo_placa_huella  (con el python del .venv)
Opciones: --solo-borrador | --solo-enviada | --yes (sin pedir confirmación)

Pide la URL de Neon con getpass (no se muestra ni se guarda en ningún archivo).
Usa los mismos servicios de la API (crear_bitacora + cambiar_estado_bitacora),
así que respeta las reglas R1, R2, R5, R6 y R10.
"""

import getpass
import os
import ssl
import sys
from datetime import date, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import models, schemas
from app.exceptions import AppError
from app.services import bitacoras_service


def pedir_url() -> str:
    url = os.environ.get("EO_DB_URL") or getpass.getpass("Pega la DATABASE_URL de Neon (no se ve al pegar) y Enter: ")
    url = url.strip().strip('"').strip("'")
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if not url:
        sys.exit("No pegaste ninguna URL.")
    return url


def construir_engine(url: str):
    """psycopg2 si carga; si Windows lo bloquea (Control de aplicaciones), usa pg8000 (puro Python)."""
    if not url.startswith("postgresql"):
        return create_engine(url)
    try:
        import psycopg2  # noqa: F401

        return create_engine(url)
    except ImportError:
        pass
    try:
        import pg8000  # noqa: F401
    except ImportError:
        sys.exit(
            "\npsycopg2 está bloqueado por Windows y falta el driver alterno. Instálalo con:\n"
            "  .venv\\Scripts\\python.exe -m pip install pg8000\n"
            "y vuelve a correr el script."
        )
    from sqlalchemy.engine import make_url

    u = make_url(url).set(drivername="postgresql+pg8000")
    query = dict(u.query)
    sslmode = query.pop("sslmode", None)
    query.pop("channel_binding", None)
    u = u.set(query=query)
    connect_args = {}
    if sslmode and sslmode != "disable":
        connect_args["ssl_context"] = ssl.create_default_context()
    print("(psycopg2 bloqueado por Windows: usando el driver alterno pg8000)")
    return create_engine(u, connect_args=connect_args)


def armar_datos(variante: str, fecha: date, responsable_id: int, actividades: list) -> schemas.BitacoraCrear:
    """Contenido de la bitácora según la variante ('enviada' o 'borrador')."""
    if variante == "enviada":
        avance = [3.0, 2.0]
        return schemas.BitacoraCrear(
            fecha=fecha,
            responsable_id=responsable_id,
            clima="Soleado, lluvia leve en la tarde",
            personal_en_obra=6,
            resumen="[Demo] Se continuó con la fundida de placa huella en el tramo programado; curado del concreto y control de niveles.",
            registros_avance=[
                schemas.RegistroAvanceActividadCrear(
                    actividad_id=a.id, avance_del_dia=avance[i], observaciones="Avance normal según programación."
                )
                for i, a in enumerate(actividades[:2])
            ],
            registros_personal=[
                schemas.RegistroPersonalCrear(cargo="Maestro de obra", cantidad=1, horas_trabajadas=8),
                schemas.RegistroPersonalCrear(cargo="Oficial", cantidad=2, horas_trabajadas=8),
                schemas.RegistroPersonalCrear(cargo="Ayudante", cantidad=3, horas_trabajadas=8),
            ],
            registros_material=[
                schemas.RegistroMaterialCrear(material="Cemento gris", cantidad=40, unidad="bultos"),
                schemas.RegistroMaterialCrear(material="Gravilla", cantidad=3, unidad="m3"),
                schemas.RegistroMaterialCrear(material="Arena", cantidad=2, unidad="m3"),
            ],
            incidentes=[
                schemas.IncidenteCrear(
                    tipo="clima",
                    descripcion="Lluvia leve en la tarde que retrasó el curado por una hora.",
                    gravedad="baja",
                    acciones_tomadas="Se cubrió el tramo con plástico.",
                )
            ],
        )
    avance = [4.0, 1.5]
    return schemas.BitacoraCrear(
        fecha=fecha,
        responsable_id=responsable_id,
        clima="Nublado, sin lluvia",
        personal_en_obra=5,
        resumen="[Demo] Armado de formaleta y refuerzo para el siguiente tramo de placa huella; pendiente de enviar a revisión.",
        registros_avance=[
            schemas.RegistroAvanceActividadCrear(
                actividad_id=a.id, avance_del_dia=avance[i], observaciones="Pendiente de revisión por el residente."
            )
            for i, a in enumerate(actividades[:2])
        ],
        registros_personal=[
            schemas.RegistroPersonalCrear(cargo="Maestro de obra", cantidad=1, horas_trabajadas=8),
            schemas.RegistroPersonalCrear(cargo="Oficial", cantidad=1, horas_trabajadas=8),
            schemas.RegistroPersonalCrear(cargo="Ayudante", cantidad=3, horas_trabajadas=7),
        ],
        registros_material=[
            schemas.RegistroMaterialCrear(material="Varilla corrugada 3/8", cantidad=25, unidad="unidades"),
            schemas.RegistroMaterialCrear(material="Madera para formaleta", cantidad=18, unidad="tablas"),
        ],
        incidentes=[],
    )


def main() -> None:
    quiere_borrador = "--solo-enviada" not in sys.argv
    quiere_enviada = "--solo-borrador" not in sys.argv
    plan = (["borrador"] if quiere_borrador else []) + (["enviada"] if quiere_enviada else [])

    engine = construir_engine(pedir_url())
    db = sessionmaker(bind=engine)()
    try:
        # ---- 1. Obras ----
        obras = db.query(models.Obra).order_by(models.Obra.id).all()
        print("\n=== Obras ===")
        for o in obras:
            print(f"  id={o.id} estado={o.estado} inicio={o.fecha_inicio} nombre={o.nombre}")
        candidatas = [o for o in obras if "placa" in o.nombre.lower() and "huella" in o.nombre.lower()]
        if not candidatas:
            sys.exit("\nNo encontré ninguna obra con 'placa' y 'huella' en el nombre.")
        en_ejecucion = [o for o in candidatas if o.estado == "en_ejecucion"]
        obra = (en_ejecucion or candidatas)[0]
        print(f"\n-> Obra elegida: id={obra.id} '{obra.nombre}' (estado={obra.estado})")
        if obra.estado != "en_ejecucion":
            sys.exit(
                "\nLa obra NO está 'en_ejecucion'. La regla R2 no permite bitácoras así.\n"
                "Cámbiale el estado a 'En ejecución' desde la pestaña Obras y vuelve a correr el script."
            )

        # ---- 2. Usuarios ----
        usuarios = db.query(models.Usuario).order_by(models.Usuario.id).all()
        print("\n=== Usuarios ===")
        for u in usuarios:
            print(f"  id={u.id} rol={u.rol} activo={u.activo}")
        if "enviada" in plan and not any(u.rol == "interventor" and u.activo for u in usuarios):
            print("  AVISO: no hay ningún interventor activo -> nadie podrá aprobar. Créalo en la pestaña Usuarios.")

        # ---- 3. Actividades y bitácoras existentes ----
        actividades = (
            db.query(models.Actividad).filter(models.Actividad.obra_id == obra.id).order_by(models.Actividad.id).all()
        )
        print("\n=== Actividades de la obra ===")
        for a in actividades:
            print(f"  id={a.id} {a.nombre}")
        if not actividades:
            print("  AVISO: la obra no tiene actividades -> las bitácoras se crean sin avance por actividad.")
        existentes = bitacoras_service.listar_bitacoras(db, obra.id)
        print("\n=== Bitácoras existentes ===")
        for b in existentes:
            print(f"  id={b.id} fecha={b.fecha} estado={b.estado} responsable_id={b.responsable_id}")
        ocupadas = {b.fecha for b in existentes}

        # ---- 4. Fechas libres (R5/R6): las más recientes <= hoy sin bitácora ----
        hoy = date.today()
        libres = []
        for atras in range(0, 120):
            d = hoy - timedelta(days=atras)
            if obra.fecha_inicio and d < obra.fecha_inicio:
                break
            if d not in ocupadas:
                libres.append(d)
            if len(libres) == len(plan):
                break
        if len(libres) < len(plan):
            sys.exit("\nNo hay suficientes fechas libres entre el inicio de la obra y hoy.")

        # ---- 5. Responsable: residente activo (si no hay, un administrador) ----
        residentes = [u for u in usuarios if u.rol == "residente_obra" and u.activo]
        por_id = {u.id: u for u in usuarios}
        responsable = None
        for b in existentes:  # el responsable de la bitácora más reciente, si es residente activo
            if b.responsable_id in {r.id for r in residentes}:
                responsable = por_id[b.responsable_id]
                break
        responsable = responsable or (
            residentes[0] if residentes else next((u for u in usuarios if u.rol == "administrador"), None)
        )
        if responsable is None:
            sys.exit("\nNo hay residente ni administrador para asignar como responsable.")

        print("\n=== Se va a crear ===")
        print(f"  Obra: {obra.nombre} (id={obra.id}) | Responsable: id={responsable.id} ({responsable.rol})")
        for variante, fecha in zip(plan, libres):
            print(f"  - {fecha}: estado final '{variante}'")
        if "--yes" not in sys.argv and input("\n¿Crear? (s/n): ").strip().lower() != "s":
            sys.exit("Cancelado, no se escribió nada.")

        # ---- 6. Crear (mismos servicios que la API) ----
        for variante, fecha in zip(plan, libres):
            datos = armar_datos(variante, fecha, responsable.id, actividades)
            b = bitacoras_service.crear_bitacora(db, obra.id, datos, responsable)
            if variante == "enviada":
                b = bitacoras_service.cambiar_estado_bitacora(db, b.id, "enviada", responsable)
            print(f"Creada: bitácora id={b.id} fecha={b.fecha} estado={b.estado}")

        print("\nListo.")
        if "borrador" in plan:
            print("- La de 'borrador': entra como administrador -> Bitácora -> esa fecha -> Enviar.")
        if "enviada" in plan:
            print("- La de 'enviada': entra como interventor -> Bitácora -> esa fecha -> Aprobar / Rechazar.")
    except AppError as e:
        db.rollback()
        sys.exit(f"\nLa regla de negocio rechazó la operación: {e}")
    finally:
        db.close()
        engine.dispose()


if __name__ == "__main__":
    main()

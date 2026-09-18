"""Genera alertas de retraso comparando avance real vs. programado (regla R9).

Pensado para ejecutarse periódicamente desde un cron (Linux) o el Programador
de tareas de Windows — no expuesto por la API a propósito, para que ninguna
alerta se pueda crear con un POST directo del usuario. Corre desde `backend/`:

    python -m scripts.generar_alertas
"""

import sys

sys.path.insert(0, ".")

from app.db.session import SessionLocal  # noqa: E402
from app.models.obra import Obra  # noqa: E402
from app.services.alertas_service import generar_alertas_retraso  # noqa: E402


def main():
    db = SessionLocal()
    try:
        obras_en_ejecucion = db.query(Obra).filter(Obra.estado == "en_ejecucion").all()
        total_nuevas = 0
        for obra in obras_en_ejecucion:
            nuevas = generar_alertas_retraso(db, obra.id)
            total_nuevas += len(nuevas)
            for alerta in nuevas:
                print(f"[{obra.nombre}] {alerta.tipo}: {alerta.mensaje}")
        print(f"Listo. {total_nuevas} alerta(s) nueva(s) generada(s).")
    finally:
        db.close()


if __name__ == "__main__":
    main()

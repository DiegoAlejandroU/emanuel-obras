"""Crea el primer usuario administrador (bootstrap).

RBAC exige que solo un `administrador` pueda crear usuarios vía la API
(`POST /api/usuarios`), así que el primer administrador se crea con este
script, corrido una sola vez desde `backend/`:

    python -m scripts.crear_usuario_admin
"""

import getpass
import sys

sys.path.insert(0, ".")

from app.db.session import SessionLocal  # noqa: E402
from app.services.auth_service import crear_usuario  # noqa: E402


def main():
    nombre = input("Nombre completo: ").strip()
    email = input("Correo: ").strip()
    password = getpass.getpass("Contraseña (mín. 8 caracteres): ")

    db = SessionLocal()
    try:
        usuario = crear_usuario(db, nombre, email, password, "administrador")
        print(f"Usuario administrador creado: {usuario.email} (id={usuario.id})")
    finally:
        db.close()


if __name__ == "__main__":
    main()

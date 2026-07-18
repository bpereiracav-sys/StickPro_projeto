import mimetypes
import os
import re
import uuid

from pathlib import Path
from typing import Dict, Optional, Set

from fastapi import HTTPException, UploadFile


# ============================================================
# STORAGE CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

UPLOADS_DIR = Path(
    os.getenv(
        "UPLOADS_DIR",
        str(BASE_DIR / "uploads"),
    )
)

PUBLIC_UPLOAD_PREFIX = os.getenv(
    "PUBLIC_UPLOAD_PREFIX",
    "/api/uploads",
).rstrip("/")


# ============================================================
# STORAGE FOLDERS
# ============================================================

ALLOWED_FOLDERS: Set[str] = {
    "images",
    "library",
    "matches",
    "evaluations",
    "feedback",
    "clubs",
    "users",
    "other",
}


# ============================================================
# MIME TYPE POLICIES
# ============================================================

IMAGE_MIME_TYPES: Set[str] = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
}

DOCUMENT_MIME_TYPES: Set[str] = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "text/plain",
}

VIDEO_MIME_TYPES: Set[str] = {
    "video/mp4",
    "video/webm",
    "video/quicktime",
}

AUDIO_MIME_TYPES: Set[str] = {
    "audio/mpeg",
    "audio/mp4",
    "audio/wav",
    "audio/x-wav",
    "audio/webm",
}

ALL_ALLOWED_MIME_TYPES: Set[str] = (
    IMAGE_MIME_TYPES
    | DOCUMENT_MIME_TYPES
    | VIDEO_MIME_TYPES
    | AUDIO_MIME_TYPES
)


# ============================================================
# FILE SIZE LIMITS
# ============================================================

MEGABYTE = 1024 * 1024

DEFAULT_MAX_FILE_SIZE = 10 * MEGABYTE
IMAGE_MAX_FILE_SIZE = 10 * MEGABYTE
DOCUMENT_MAX_FILE_SIZE = 25 * MEGABYTE
VIDEO_MAX_FILE_SIZE = 150 * MEGABYTE
AUDIO_MAX_FILE_SIZE = 50 * MEGABYTE


# ============================================================
# EXTENSION POLICIES
# ============================================================

ALLOWED_EXTENSIONS: Set[str] = {
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".csv",
    ".txt",
    ".mp4",
    ".webm",
    ".mov",
    ".mp3",
    ".m4a",
    ".wav",
}


class StorageService:
    """
    Serviço centralizado de armazenamento da StickPro.

    Atualmente utiliza armazenamento local.

    A restante aplicação deve depender apenas desta classe,
    permitindo substituir futuramente o armazenamento local por
    S3, Cloudinary, Supabase Storage ou outro fornecedor sem
    alterar os módulos consumidores.
    """

    def __init__(
        self,
        uploads_dir: Path = UPLOADS_DIR,
        public_prefix: str = PUBLIC_UPLOAD_PREFIX,
    ):
        self.uploads_dir = Path(uploads_dir)
        self.public_prefix = public_prefix.rstrip("/")

        self.ensure_storage_structure()

    # ========================================================
    # STORAGE INITIALIZATION
    # ========================================================

    def ensure_storage_structure(self) -> None:
        """
        Cria o diretório principal e todos os subdiretórios
        permitidos, caso ainda não existam.
        """

        self.uploads_dir.mkdir(
            parents=True,
            exist_ok=True,
        )

        for folder in ALLOWED_FOLDERS:
            folder_path = self.uploads_dir / folder

            folder_path.mkdir(
                parents=True,
                exist_ok=True,
            )

    # ========================================================
    # NORMALIZATION
    # ========================================================

    def normalize_folder(
        self,
        folder: Optional[str],
    ) -> str:
        """
        Valida e normaliza o diretório lógico do upload.
        """

        normalized_folder = (
            folder or "other"
        ).strip().lower()

        normalized_folder = re.sub(
            r"[^a-z0-9_-]",
            "",
            normalized_folder,
        )

        if normalized_folder not in ALLOWED_FOLDERS:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Diretório de armazenamento inválido."
                ),
            )

        return normalized_folder

    def sanitize_original_filename(
        self,
        filename: Optional[str],
    ) -> str:
        """
        Remove caminhos e caracteres inseguros do nome original.
        """

        if not filename:
            return "ficheiro"

        safe_name = Path(filename).name.strip()

        safe_name = re.sub(
            r"[^A-Za-z0-9À-ÿ._ -]",
            "_",
            safe_name,
        )

        safe_name = re.sub(
            r"\s+",
            " ",
            safe_name,
        ).strip()

        return safe_name or "ficheiro"

    # ========================================================
    # FILE TYPE DETECTION
    # ========================================================

    def get_extension(
        self,
        filename: Optional[str],
    ) -> str:
        """
        Obtém a extensão normalizada do ficheiro.
        """

        if not filename:
            return ""

        return Path(filename).suffix.lower()

    def get_mime_type(
        self,
        file: UploadFile,
    ) -> str:
        """
        Obtém o MIME type informado pelo cliente ou tenta
        inferi-lo através da extensão.
        """

        declared_mime = (
            file.content_type or ""
        ).lower().strip()

        if declared_mime:
            return declared_mime

        guessed_mime, _ = mimetypes.guess_type(
            file.filename or ""
        )

        return (
            guessed_mime
            or "application/octet-stream"
        ).lower()

    def get_file_category(
        self,
        mime_type: str,
    ) -> str:
        """
        Classifica o ficheiro de acordo com o MIME type.
        """

        if mime_type in IMAGE_MIME_TYPES:
            return "image"

        if mime_type in DOCUMENT_MIME_TYPES:
            return "document"

        if mime_type in VIDEO_MIME_TYPES:
            return "video"

        if mime_type in AUDIO_MIME_TYPES:
            return "audio"

        return "other"

    def get_max_file_size(
        self,
        mime_type: str,
    ) -> int:
        """
        Retorna o limite máximo de tamanho segundo o tipo.
        """

        if mime_type in IMAGE_MIME_TYPES:
            return IMAGE_MAX_FILE_SIZE

        if mime_type in DOCUMENT_MIME_TYPES:
            return DOCUMENT_MAX_FILE_SIZE

        if mime_type in VIDEO_MIME_TYPES:
            return VIDEO_MAX_FILE_SIZE

        if mime_type in AUDIO_MIME_TYPES:
            return AUDIO_MAX_FILE_SIZE

        return DEFAULT_MAX_FILE_SIZE

    # ========================================================
    # VALIDATION
    # ========================================================

    def validate_file_identity(
        self,
        file: UploadFile,
        allowed_mime_types: Optional[Set[str]] = None,
    ) -> Dict:
        """
        Valida nome, extensão e MIME type antes da leitura.
        """

        original_filename = (
            self.sanitize_original_filename(
                file.filename
            )
        )

        extension = self.get_extension(
            original_filename
        )

        mime_type = self.get_mime_type(file)

        effective_allowed_mimes = (
            allowed_mime_types
            if allowed_mime_types is not None
            else ALL_ALLOWED_MIME_TYPES
        )

        if extension not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Extensão de ficheiro não permitida."
                ),
            )

        if mime_type not in effective_allowed_mimes:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Tipo de ficheiro não permitido."
                ),
            )

        return {
            "original_filename": original_filename,
            "extension": extension,
            "mime_type": mime_type,
            "file_category": self.get_file_category(
                mime_type
            ),
        }

    def validate_content_size(
        self,
        content: bytes,
        mime_type: str,
        custom_max_size: Optional[int] = None,
    ) -> int:
        """
        Valida se o ficheiro está vazio e se respeita
        o limite máximo configurado.
        """

        file_size = len(content)

        if file_size == 0:
            raise HTTPException(
                status_code=400,
                detail="O ficheiro está vazio.",
            )

        max_size = (
            custom_max_size
            if custom_max_size is not None
            else self.get_max_file_size(
                mime_type
            )
        )

        if file_size > max_size:
            max_size_mb = round(
                max_size / MEGABYTE
            )

            raise HTTPException(
                status_code=400,
                detail=(
                    "Ficheiro demasiado grande. "
                    f"O limite é {max_size_mb} MB."
                ),
            )

        return file_size

    # ========================================================
    # PATH SECURITY
    # ========================================================

    def resolve_storage_path(
        self,
        folder: str,
        stored_filename: str,
    ) -> Path:
        """
        Constrói um caminho seguro e impede directory traversal.
        """

        normalized_folder = self.normalize_folder(
            folder
        )

        safe_filename = Path(
            stored_filename
        ).name

        target_path = (
            self.uploads_dir
            / normalized_folder
            / safe_filename
        ).resolve()

        allowed_root = (
            self.uploads_dir
            / normalized_folder
        ).resolve()

        if (
            allowed_root not in target_path.parents
        ):
            raise HTTPException(
                status_code=400,
                detail="Caminho de ficheiro inválido.",
            )

        return target_path

    # ========================================================
    # FILE CREATION
    # ========================================================

    def generate_stored_filename(
        self,
        extension: str,
    ) -> str:
        """
        Gera um nome físico único para armazenamento.
        """

        safe_extension = (
            extension.lower()
            if extension
            else ""
        )

        return (
            f"{uuid.uuid4().hex}"
            f"{safe_extension}"
        )

    async def save_upload(
        self,
        file: UploadFile,
        folder: str = "other",
        allowed_mime_types: Optional[Set[str]] = None,
        custom_max_size: Optional[int] = None,
    ) -> Dict:
        """
        Valida e guarda um UploadFile.

        Retorna todos os metadados necessários para persistência
        posterior na base de dados.
        """

        normalized_folder = self.normalize_folder(
            folder
        )

        identity = self.validate_file_identity(
            file,
            allowed_mime_types=allowed_mime_types,
        )

        try:
            content = await file.read()
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Não foi possível ler o ficheiro."
                ),
            ) from exc

        file_size = self.validate_content_size(
            content,
            identity["mime_type"],
            custom_max_size=custom_max_size,
        )

        stored_filename = (
            self.generate_stored_filename(
                identity["extension"]
            )
        )

        target_path = self.resolve_storage_path(
            normalized_folder,
            stored_filename,
        )

        target_path.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        try:
            with open(target_path, "wb") as output_file:
                output_file.write(content)
        except OSError as exc:
            raise HTTPException(
                status_code=500,
                detail=(
                    "Não foi possível guardar o ficheiro."
                ),
            ) from exc
        finally:
            await file.close()

        public_url = self.build_public_url(
            normalized_folder,
            stored_filename,
        )

        return {
            "folder": normalized_folder,
            "original_filename": identity[
                "original_filename"
            ],
            "stored_filename": stored_filename,
            "filename": stored_filename,
            "extension": identity["extension"],
            "mime_type": identity["mime_type"],
            "file_category": identity[
                "file_category"
            ],
            "file_size": file_size,
            "url": public_url,
        }

    # ========================================================
    # FILE DELETION
    # ========================================================

    def delete_file(
        self,
        folder: str,
        stored_filename: str,
        ignore_missing: bool = False,
    ) -> bool:
        """
        Elimina um ficheiro físico.
        """

        target_path = self.resolve_storage_path(
            folder,
            stored_filename,
        )

        if not target_path.exists():
            if ignore_missing:
                return False

            raise HTTPException(
                status_code=404,
                detail="Ficheiro não encontrado.",
            )

        if not target_path.is_file():
            raise HTTPException(
                status_code=400,
                detail=(
                    "O caminho indicado não corresponde "
                    "a um ficheiro."
                ),
            )

        try:
            target_path.unlink()
        except OSError as exc:
            raise HTTPException(
                status_code=500,
                detail=(
                    "Não foi possível eliminar o ficheiro."
                ),
            ) from exc

        return True

    # ========================================================
    # PUBLIC URLS
    # ========================================================

    def build_public_url(
        self,
        folder: str,
        stored_filename: str,
    ) -> str:
        """
        Constrói a URL pública relativa do ficheiro.
        """

        normalized_folder = self.normalize_folder(
            folder
        )

        safe_filename = Path(
            stored_filename
        ).name

        return (
            f"{self.public_prefix}/"
            f"{normalized_folder}/"
            f"{safe_filename}"
        )


storage_service = StorageService()

"""Private filesystem storage manager for Genome Firewall.

Enforces:
- Server-generated storage keys (no path traversal).
- Streaming upload with streaming SHA-256 calculation.
- Size limits.
- Pre-analysis integrity verification (checksum mismatch -> FILE_TAMPERED).
"""

import os
import hashlib
import uuid
from pathlib import Path
from typing import Tuple, BinaryIO


class StorageManager:
    def __init__(self, base_dir: str = "data/storage"):
        self.base_dir = Path(base_dir).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def generate_storage_key(self, lab_id: str, sample_id: str, original_filename: str) -> str:
        safe_suffix = Path(original_filename).suffix.lower()
        if safe_suffix not in [".fa", ".fasta", ".fna", ".gz"]:
            safe_suffix = ".fasta"
        unique_token = uuid.uuid4().hex[:12]
        # Lab-partitioned directory structure
        return f"{lab_id}/{sample_id}_{unique_token}{safe_suffix}"

    def get_absolute_path(self, storage_key: str) -> Path:
        # Prevent directory traversal
        target_path = (self.base_dir / storage_key).resolve()
        if not str(target_path).startswith(str(self.base_dir)):
            raise ValueError("Path traversal detected in storage key")
        return target_path

    async def save_stream(
        self,
        stream,
        lab_id: str,
        sample_id: str,
        original_filename: str,
        max_bytes: int = 50 * 1024 * 1024,
    ) -> Tuple[str, str, int]:
        """Streams content from an async generator / upload stream to disk while computing SHA-256.

        Returns:
            (storage_key, sha256_hex, total_bytes)
        """
        storage_key = self.generate_storage_key(lab_id, sample_id, original_filename)
        dest_path = self.get_absolute_path(storage_key)
        dest_path.parent.mkdir(parents=True, exist_ok=True)

        hasher = hashlib.sha256()
        total_bytes = 0

        # Write to temporary file first then atomic rename
        temp_path = dest_path.with_suffix(dest_path.suffix + ".tmp")
        try:
            with open(temp_path, "wb") as f:
                while True:
                    chunk = await stream.read(65536)
                    if not chunk:
                        break
                    total_bytes += len(chunk)
                    if total_bytes > max_bytes:
                        raise ValueError(f"File exceeds maximum allowed size of {max_bytes} bytes")
                    hasher.update(chunk)
                    f.write(chunk)
            
            temp_path.replace(dest_path)
        except Exception:
            if temp_path.exists():
                temp_path.unlink()
            raise

        return storage_key, hasher.hexdigest(), total_bytes

    def save_bytes(
        self,
        content: bytes,
        lab_id: str,
        sample_id: str,
        original_filename: str,
        max_bytes: int = 50 * 1024 * 1024,
    ) -> Tuple[str, str, int]:
        """Synchronous byte saving (useful for testing and seed fixtures)."""
        if len(content) > max_bytes:
            raise ValueError(f"File exceeds maximum allowed size of {max_bytes} bytes")
        storage_key = self.generate_storage_key(lab_id, sample_id, original_filename)
        dest_path = self.get_absolute_path(storage_key)
        dest_path.parent.mkdir(parents=True, exist_ok=True)

        hasher = hashlib.sha256(content)
        with open(dest_path, "wb") as f:
            f.write(content)

        return storage_key, hasher.hexdigest(), len(content)

    def verify_integrity(self, storage_key: str, expected_sha256: str) -> bool:
        """Verifies stored file checksum matches expected SHA-256."""
        path = self.get_absolute_path(storage_key)
        if not path.is_file():
            return False
        hasher = hashlib.sha256()
        with open(path, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        return hasher.hexdigest() == expected_sha256

    def read_bytes(self, storage_key: str) -> bytes:
        path = self.get_absolute_path(storage_key)
        if not path.is_file():
            raise FileNotFoundError(f"Stored file not found: {storage_key}")
        with open(path, "rb") as f:
            return f.read()

    def delete(self, storage_key: str) -> bool:
        try:
            path = self.get_absolute_path(storage_key)
            if path.is_file():
                path.unlink()
                return True
        except Exception:
            pass
        return False

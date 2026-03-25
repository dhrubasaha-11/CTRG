"""
Encrypted file storage for proposal documents.

Uses Fernet (AES-128-CBC) symmetric encryption to encrypt files at rest.
Files are encrypted on save and decrypted on read, transparently.

Configuration:
    Set FILE_ENCRYPTION_KEY in your .env file. Generate one with:
        python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

    If FILE_ENCRYPTION_KEY is not set, files are stored unencrypted (development fallback).
"""
import io
import logging

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import FileSystemStorage

logger = logging.getLogger(__name__)


def _get_fernet():
    """Return a Fernet instance if encryption key is configured, else None."""
    key = getattr(settings, 'FILE_ENCRYPTION_KEY', None)
    if not key:
        return None
    try:
        from cryptography.fernet import Fernet
        return Fernet(key.encode() if isinstance(key, str) else key)
    except Exception:
        logger.exception("Invalid FILE_ENCRYPTION_KEY – files will NOT be encrypted")
        return None


class EncryptedFileStorage(FileSystemStorage):
    """
    A Django storage backend that encrypts file contents on save
    and decrypts on open.

    Falls back to plain storage when FILE_ENCRYPTION_KEY is not set,
    making it safe for local development without extra configuration.
    """

    def _save(self, name, content):
        """Encrypt file content before writing to disk."""
        fernet = _get_fernet()
        if fernet is None:
            return super()._save(name, content)

        # Read entire file into memory for encryption
        raw_data = content.read()
        encrypted_data = fernet.encrypt(raw_data)
        encrypted_content = ContentFile(encrypted_data)
        return super()._save(name, encrypted_content)

    def open(self, name, mode='rb'):
        """Decrypt file content when reading from disk."""
        fernet = _get_fernet()
        if fernet is None:
            return super().open(name, mode)

        # Read the encrypted file
        f = super().open(name, 'rb')
        encrypted_data = f.read()
        f.close()

        try:
            decrypted_data = fernet.decrypt(encrypted_data)
        except Exception as e:
            logger.critical("Failed to decrypt file %s: %s", name, e)
            raise IOError(f"Failed to decrypt file: {name}") from e

        return ContentFile(decrypted_data, name=name)

import os
import logging
import requests
from pathlib import Path
from typing import Optional
from .config import get_settings

logger = logging.getLogger(__name__)


def upload_file(
    content: bytes,
    filename: str,
    folder: str,
    content_type: str = "application/octet-stream"
) -> str:
    """
    Uploads file content to Supabase Storage in the 'rafapp-uploads' bucket.
    If Supabase credentials are missing or the upload fails, it falls back
    to saving the file locally on the server under static/folder/filename.
    
    Returns:
        The URL/path string to store in the database.
    """
    settings = get_settings()
    url = settings.supabase_url
    key = settings.supabase_service_key

    if url and key:
        # Sanitize credentials and format base URL
        supabase_url = url.strip().rstrip("/")
        supabase_key = key.strip()
        bucket = "rafapp-uploads"
        
        # Path inside the bucket
        file_path = f"{folder}/{filename}".lstrip("/")
        upload_endpoint = f"{supabase_url}/storage/v1/object/{bucket}/{file_path}"
        
        headers = {
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": content_type,
            "x-upsert": "true",  # Overwrite existing files of same name
        }
        
        try:
            r = requests.post(upload_endpoint, data=content, headers=headers, timeout=15)
            if r.status_code == 200:
                # Return the public access URL
                public_url = f"{supabase_url}/storage/v1/object/public/{bucket}/{file_path}"
                logger.info(f"Successfully uploaded {filename} to Supabase Storage: {public_url}")
                return public_url
            else:
                logger.error(
                    f"Supabase Storage upload failed with status {r.status_code}: {r.text}. "
                    "Falling back to local disk storage."
                )
        except Exception as e:
            logger.error(f"Error during Supabase Storage upload: {e}. Falling back to local disk storage.")

    # FALLBACK: Store locally on disk
    try:
        app_dir = Path(__file__).resolve().parent
        static_dir = app_dir / "static"
        target_dir = static_dir / folder
        target_dir.mkdir(parents=True, exist_ok=True)
        
        out_path = target_dir / filename
        with open(out_path, "wb") as f:
            f.write(content)
            
        relative_path = f"/static/{folder}/{filename}"
        logger.info(f"Saved upload locally to {relative_path}")
        return relative_path
    except Exception as e:
        logger.error(f"Failed to save upload locally: {e}")
        # Return fallback path anyway
        return f"/static/{folder}/{filename}"

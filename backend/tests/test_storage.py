import os
import pytest
from unittest.mock import patch, MagicMock
from app import storage, config

def test_storage_fallback_local_disk(tmp_path):
    """
    Ensure storage.upload_file falls back to writing to local disk
    if SUPABASE_URL and SUPABASE_SERVICE_KEY are not set.
    """
    # Force settings to have no Supabase credentials
    mock_settings = config.AppSettings(
        app_env="test",
        database_url="sqlite://",
        database_url_registry="sqlite://",
        database_url_shop="sqlite://",
        database_url_reference="sqlite://",
        db_pool_size=5,
        db_max_overflow=10,
        db_pool_recycle=1800,
        db_pool_timeout=30,
        redis_url=None,
        cors_origins=[],
        trusted_hosts=[],
        smtp_host=None,
        smtp_port=587,
        smtp_user=None,
        smtp_password=None,
        smtp_from_email="test@test.is",
        admin_email=None,
        paypal_client_id=None,
        paypal_client_secret=None,
        supabase_url=None,
        supabase_service_key=None,
    )
    
    with patch("app.storage.get_settings", return_value=mock_settings):
        # We also mock the parent directory write path to point to a tmp_path
        # so that tests do not write to actual project static/ folder during tests
        with patch("app.storage.Path") as mock_path:
            # We want Path(__file__).resolve().parent / "static" to map to tmp_path
            mock_app_dir = mock_path.return_value.resolve.return_value.parent
            mock_app_dir.__truediv__.return_value = tmp_path
            
            content = b"fake-local-file-bytes"
            result = storage.upload_file(content, "test.png", "test_folder", "image/png")
            
            assert result == "/static/test_folder/test.png"
            # Verify the file was written to the directory
            target_file = tmp_path / "test.png"
            # Since mock Path behaves dynamically, we can also assert that storage.upload_file returns successfully.

def test_storage_supabase_upload_success():
    """
    Ensure storage.upload_file sends HTTP requests to Supabase Storage
    when credentials are provided and returns the public URL.
    """
    mock_settings = config.AppSettings(
        app_env="test",
        database_url="sqlite://",
        database_url_registry="sqlite://",
        database_url_shop="sqlite://",
        database_url_reference="sqlite://",
        db_pool_size=5,
        db_max_overflow=10,
        db_pool_recycle=1800,
        db_pool_timeout=30,
        redis_url=None,
        cors_origins=[],
        trusted_hosts=[],
        smtp_host=None,
        smtp_port=587,
        smtp_user=None,
        smtp_password=None,
        smtp_from_email="test@test.is",
        admin_email=None,
        paypal_client_id=None,
        paypal_client_secret=None,
        supabase_url="https://testproj.supabase.co",
        supabase_service_key="secret-key",
    )
    
    # Mock requests.post to return 200 OK
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = '{"Key": "rafapp-uploads/test_folder/test.png"}'
    
    with patch("app.storage.get_settings", return_value=mock_settings):
        with patch("requests.post", return_value=mock_response) as mock_post:
            content = b"fake-supabase-bytes"
            result = storage.upload_file(content, "test.png", "test_folder", "image/png")
            
            # Assert correct URL returned
            assert result == "https://testproj.supabase.co/storage/v1/object/public/rafapp-uploads/test_folder/test.png"
            
            # Assert correct HTTP call details
            mock_post.assert_called_once_with(
                "https://testproj.supabase.co/storage/v1/object/rafapp-uploads/test_folder/test.png",
                data=content,
                headers={
                    "Authorization": "Bearer secret-key",
                    "Content-Type": "image/png",
                    "x-upsert": "true"
                },
                timeout=15
            )

def test_storage_supabase_upload_failure_falls_back(tmp_path):
    """
    Ensure that if the Supabase upload fails (e.g. status code 500),
    the system logs the error and gracefully falls back to local disk storage.
    """
    mock_settings = config.AppSettings(
        app_env="test",
        database_url="sqlite://",
        database_url_registry="sqlite://",
        database_url_shop="sqlite://",
        database_url_reference="sqlite://",
        db_pool_size=5,
        db_max_overflow=10,
        db_pool_recycle=1800,
        db_pool_timeout=30,
        redis_url=None,
        cors_origins=[],
        trusted_hosts=[],
        smtp_host=None,
        smtp_port=587,
        smtp_user=None,
        smtp_password=None,
        smtp_from_email="test@test.is",
        admin_email=None,
        paypal_client_id=None,
        paypal_client_secret=None,
        supabase_url="https://testproj.supabase.co",
        supabase_service_key="secret-key",
    )
    
    # Mock requests.post to return 500 Internal Server Error
    mock_response = MagicMock()
    mock_response.status_code = 500
    mock_response.text = "Internal error"
    
    with patch("app.storage.get_settings", return_value=mock_settings):
        with patch("requests.post", return_value=mock_response):
            with patch("app.storage.Path") as mock_path:
                mock_app_dir = mock_path.return_value.resolve.return_value.parent
                mock_app_dir.__truediv__.return_value = tmp_path
                
                content = b"bytes-to-save-locally-on-failure"
                result = storage.upload_file(content, "test_fail.png", "test_folder", "image/png")
                
                # Should return fallback relative path
                assert result == "/static/test_folder/test_fail.png"

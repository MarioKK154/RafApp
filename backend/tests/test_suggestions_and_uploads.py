# backend/tests/test_suggestions_and_uploads.py

import io
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from typing import Dict, Any

from app import crud, schemas, models

def test_suggestions_flow(client: TestClient, authenticated_user_token: Dict[str, Any], db: Session):
    """
    Verifies the user suggestions lifecycle:
    1. Submitting feedback/suggestions.
    2. Listing suggestions (restricted to superusers).
    3. Running the AI suggestions clustering and recommendations scanner.
    4. Dismissing suggestions.
    """
    token = authenticated_user_token["token"]
    user = authenticated_user_token["user"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Submit suggestions
    suggestion_1 = {
        "category": "Improvement",
        "content": "The dashboard calendar load speed is slow."
    }
    suggestion_2 = {
        "category": "Bug",
        "content": "Calendar is loading slow on mobile."
    }
    suggestion_3 = {
        "category": "Feature Request",
        "content": "Add Procore integration."
    }

    # Submit feedback (requires authenticated user)
    res1 = client.post("/system/suggestions", headers=headers, json=suggestion_1)
    assert res1.status_code == 201, res1.text
    res2 = client.post("/system/suggestions", headers=headers, json=suggestion_2)
    assert res2.status_code == 201, res2.text
    res3 = client.post("/system/suggestions", headers=headers, json=suggestion_3)
    assert res3.status_code == 201, res3.text

    # 2. Get suggestions list (must fail for normal admin/user without superuser flag)
    res_list_fail = client.get("/admin/super/suggestions", headers=headers)
    assert res_list_fail.status_code == 403

    # Upgrade user to superuser
    user.is_superuser = True
    db.commit()

    # Now get suggestions list (should succeed)
    res_list = client.get("/admin/super/suggestions", headers=headers)
    assert res_list.status_code == 200
    data_list = res_list.json()
    assert len(data_list) == 3
    contents = [s["content"] for s in data_list]
    assert "The dashboard calendar load speed is slow." in contents
    assert "Add Procore integration." in contents

    # 3. Test AI Analysis Clustering
    res_analyze = client.post("/admin/super/suggestions/analyze", headers=headers)
    assert res_analyze.status_code == 200
    analysis = res_analyze.json()
    assert analysis["total_count"] == 3
    
    clusters = analysis["clusters"]
    assert len(clusters) > 0
    
    # Verify keyword-based clustering clustered "slow" & "calendar" together
    perf_cluster = next((c for c in clusters if c["theme"] == "App Performance & Latency"), None)
    assert perf_cluster is not None
    assert perf_cluster["count"] == 2
    
    integration_cluster = next((c for c in clusters if c["theme"] == "Third-party Integrations"), None)
    assert integration_cluster is not None
    assert integration_cluster["count"] == 1

    # Verify insights are returned
    assert len(analysis["insights"]) > 0

    # Verify default is_read is False
    target_suggestion = data_list[0]
    assert target_suggestion["is_read"] is False

    # Toggle read status -> True
    res_toggle_1 = client.put(f"/admin/super/suggestions/{target_suggestion['id']}/read", headers=headers)
    assert res_toggle_1.status_code == 200
    assert res_toggle_1.json()["is_read"] is True

    # Toggle read status -> False
    res_toggle_2 = client.put(f"/admin/super/suggestions/{target_suggestion['id']}/read", headers=headers)
    assert res_toggle_2.status_code == 200
    assert res_toggle_2.json()["is_read"] is False

    # 4. Dismiss a suggestion
    suggestion_id_to_delete = data_list[0]["id"]
    res_delete = client.delete(f"/admin/super/suggestions/{suggestion_id_to_delete}", headers=headers)
    assert res_delete.status_code == 204

    # Verify count is now 2
    res_list_after = client.get("/admin/super/suggestions", headers=headers)
    assert len(res_list_after.json()) == 2


def test_catalog_material_image_upload(client: TestClient, authenticated_user_token: Dict[str, Any], db: Session):
    """
    Verifies that the catalog material image upload endpoint works.
    """
    # ARRANGE: Upgrade user to superuser
    user = authenticated_user_token["user"]
    user.is_superuser = True
    db.commit()

    token = authenticated_user_token["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Simulate an image file upload
    file_content = b"fake-image-bytes"
    file_data = {
        "file": ("test_cable.png", io.BytesIO(file_content), "image/png")
    }

    response = client.post(
        "/inventory/catalog/upload-image",
        headers=headers,
        files=file_data
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert "url" in data
    assert data["url"].startswith("/static/inventory_images/mat_")
    assert data["url"].endswith(".png")

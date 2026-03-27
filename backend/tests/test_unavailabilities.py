"""
Test suite for Unavailabilities Module
Tests the profile unavailability management feature:
- GET /api/unavailabilities/my - Get current user's unavailabilities
- POST /api/unavailabilities - Create new unavailability
- PUT /api/unavailabilities/{id} - Update unavailability
- DELETE /api/unavailabilities/{id} - Delete unavailability
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestUnavailabilitiesModule:
    """Test unavailabilities CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "test123456"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.user = login_response.json().get("user")
        else:
            pytest.skip("Authentication failed - skipping tests")
    
    def test_01_get_my_unavailabilities_empty(self):
        """Test GET /api/unavailabilities/my returns list (may be empty)"""
        response = self.session.get(f"{BASE_URL}/api/unavailabilities/my")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/unavailabilities/my - 200 OK, found {len(data)} unavailabilities")
    
    def test_02_create_unavailability_ferias(self):
        """Test POST /api/unavailabilities - Create vacation unavailability"""
        start_date = (datetime.now() + timedelta(days=7)).isoformat()
        end_date = (datetime.now() + timedelta(days=14)).isoformat()
        
        payload = {
            "start_date": start_date,
            "end_date": end_date,
            "reason": "ferias",
            "notes": "Férias de verão - teste automatizado"
        }
        
        response = self.session.post(f"{BASE_URL}/api/unavailabilities", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "id" in data, "Response should contain id"
        assert data["reason"] == "ferias", "Reason should be 'ferias'"
        assert data["notes"] == "Férias de verão - teste automatizado", "Notes should match"
        
        # Store for later tests
        self.__class__.created_unavailability_id = data["id"]
        print(f"✓ POST /api/unavailabilities - 200 OK, created unavailability {data['id']}")
    
    def test_03_create_unavailability_doenca(self):
        """Test POST /api/unavailabilities - Create illness unavailability"""
        start_date = (datetime.now() + timedelta(days=20)).isoformat()
        end_date = (datetime.now() + timedelta(days=22)).isoformat()
        
        payload = {
            "start_date": start_date,
            "end_date": end_date,
            "reason": "doenca",
            "notes": "Consulta médica"
        }
        
        response = self.session.post(f"{BASE_URL}/api/unavailabilities", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["reason"] == "doenca", "Reason should be 'doenca'"
        self.__class__.doenca_unavailability_id = data["id"]
        print(f"✓ POST /api/unavailabilities (doenca) - 200 OK")
    
    def test_04_create_unavailability_escola(self):
        """Test POST /api/unavailabilities - Create school unavailability"""
        start_date = (datetime.now() + timedelta(days=30)).isoformat()
        end_date = (datetime.now() + timedelta(days=31)).isoformat()
        
        payload = {
            "start_date": start_date,
            "end_date": end_date,
            "reason": "escola",
            "notes": "Exames escolares"
        }
        
        response = self.session.post(f"{BASE_URL}/api/unavailabilities", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["reason"] == "escola", "Reason should be 'escola'"
        self.__class__.escola_unavailability_id = data["id"]
        print(f"✓ POST /api/unavailabilities (escola) - 200 OK")
    
    def test_05_create_unavailability_outro(self):
        """Test POST /api/unavailabilities - Create other reason unavailability"""
        start_date = (datetime.now() + timedelta(days=40)).isoformat()
        end_date = (datetime.now() + timedelta(days=42)).isoformat()
        
        payload = {
            "start_date": start_date,
            "end_date": end_date,
            "reason": "outro",
            "notes": "Compromisso familiar"
        }
        
        response = self.session.post(f"{BASE_URL}/api/unavailabilities", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["reason"] == "outro", "Reason should be 'outro'"
        self.__class__.outro_unavailability_id = data["id"]
        print(f"✓ POST /api/unavailabilities (outro) - 200 OK")
    
    def test_06_get_my_unavailabilities_with_data(self):
        """Test GET /api/unavailabilities/my returns created unavailabilities"""
        response = self.session.get(f"{BASE_URL}/api/unavailabilities/my")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        assert len(data) >= 4, f"Should have at least 4 unavailabilities, got {len(data)}"
        
        # Verify all 4 reasons are present
        reasons = [u["reason"] for u in data]
        assert "ferias" in reasons, "Should have 'ferias' unavailability"
        assert "doenca" in reasons, "Should have 'doenca' unavailability"
        assert "escola" in reasons, "Should have 'escola' unavailability"
        assert "outro" in reasons, "Should have 'outro' unavailability"
        
        print(f"✓ GET /api/unavailabilities/my - 200 OK, found {len(data)} unavailabilities with all 4 reasons")
    
    def test_07_update_unavailability(self):
        """Test PUT /api/unavailabilities/{id} - Update unavailability"""
        unavailability_id = getattr(self.__class__, 'created_unavailability_id', None)
        if not unavailability_id:
            pytest.skip("No unavailability created to update")
        
        new_start_date = (datetime.now() + timedelta(days=8)).isoformat()
        new_end_date = (datetime.now() + timedelta(days=15)).isoformat()
        
        payload = {
            "start_date": new_start_date,
            "end_date": new_end_date,
            "reason": "ferias",
            "notes": "Férias de verão - ATUALIZADO"
        }
        
        response = self.session.put(f"{BASE_URL}/api/unavailabilities/{unavailability_id}", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "message" in data, "Response should contain message"
        print(f"✓ PUT /api/unavailabilities/{unavailability_id} - 200 OK")
    
    def test_08_verify_update_persisted(self):
        """Verify update was persisted by fetching unavailabilities"""
        response = self.session.get(f"{BASE_URL}/api/unavailabilities/my")
        
        assert response.status_code == 200
        data = response.json()
        
        unavailability_id = getattr(self.__class__, 'created_unavailability_id', None)
        if unavailability_id:
            updated = next((u for u in data if u["id"] == unavailability_id), None)
            if updated:
                assert "ATUALIZADO" in updated.get("notes", ""), "Notes should be updated"
                print(f"✓ Update verified - notes contain 'ATUALIZADO'")
    
    def test_09_create_invalid_dates(self):
        """Test POST /api/unavailabilities - Invalid dates (start >= end)"""
        start_date = (datetime.now() + timedelta(days=10)).isoformat()
        end_date = (datetime.now() + timedelta(days=5)).isoformat()  # Before start
        
        payload = {
            "start_date": start_date,
            "end_date": end_date,
            "reason": "ferias",
            "notes": "Invalid dates test"
        }
        
        response = self.session.post(f"{BASE_URL}/api/unavailabilities", json=payload)
        
        assert response.status_code == 400, f"Expected 400 for invalid dates, got {response.status_code}"
        print(f"✓ POST /api/unavailabilities (invalid dates) - 400 Bad Request as expected")
    
    def test_10_delete_unavailability(self):
        """Test DELETE /api/unavailabilities/{id} - Delete unavailability"""
        unavailability_id = getattr(self.__class__, 'doenca_unavailability_id', None)
        if not unavailability_id:
            pytest.skip("No unavailability to delete")
        
        response = self.session.delete(f"{BASE_URL}/api/unavailabilities/{unavailability_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "message" in data, "Response should contain message"
        print(f"✓ DELETE /api/unavailabilities/{unavailability_id} - 200 OK")
    
    def test_11_verify_delete_persisted(self):
        """Verify delete was persisted"""
        response = self.session.get(f"{BASE_URL}/api/unavailabilities/my")
        
        assert response.status_code == 200
        data = response.json()
        
        unavailability_id = getattr(self.__class__, 'doenca_unavailability_id', None)
        if unavailability_id:
            deleted = next((u for u in data if u["id"] == unavailability_id), None)
            assert deleted is None, "Deleted unavailability should not be found"
            print(f"✓ Delete verified - unavailability not found in list")
    
    def test_12_delete_nonexistent(self):
        """Test DELETE /api/unavailabilities/{id} - Nonexistent ID"""
        response = self.session.delete(f"{BASE_URL}/api/unavailabilities/nonexistent-id-12345")
        
        assert response.status_code == 404, f"Expected 404 for nonexistent, got {response.status_code}"
        print(f"✓ DELETE /api/unavailabilities (nonexistent) - 404 Not Found as expected")
    
    def test_13_update_nonexistent(self):
        """Test PUT /api/unavailabilities/{id} - Nonexistent ID"""
        payload = {
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=1)).isoformat(),
            "reason": "ferias",
            "notes": "Test"
        }
        
        response = self.session.put(f"{BASE_URL}/api/unavailabilities/nonexistent-id-12345", json=payload)
        
        assert response.status_code == 404, f"Expected 404 for nonexistent, got {response.status_code}"
        print(f"✓ PUT /api/unavailabilities (nonexistent) - 404 Not Found as expected")
    
    def test_14_cleanup_test_data(self):
        """Cleanup: Delete remaining test unavailabilities"""
        ids_to_delete = [
            getattr(self.__class__, 'created_unavailability_id', None),
            getattr(self.__class__, 'escola_unavailability_id', None),
            getattr(self.__class__, 'outro_unavailability_id', None),
        ]
        
        deleted_count = 0
        for unavailability_id in ids_to_delete:
            if unavailability_id:
                response = self.session.delete(f"{BASE_URL}/api/unavailabilities/{unavailability_id}")
                if response.status_code == 200:
                    deleted_count += 1
        
        print(f"✓ Cleanup complete - deleted {deleted_count} test unavailabilities")


class TestUnavailabilitiesWithoutNotes:
    """Test unavailabilities without optional notes field"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "test123456"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed")
    
    def test_create_without_notes(self):
        """Test creating unavailability without optional notes"""
        start_date = (datetime.now() + timedelta(days=50)).isoformat()
        end_date = (datetime.now() + timedelta(days=52)).isoformat()
        
        payload = {
            "start_date": start_date,
            "end_date": end_date,
            "reason": "ferias"
            # No notes field
        }
        
        response = self.session.post(f"{BASE_URL}/api/unavailabilities", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "id" in data, "Response should contain id"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/unavailabilities/{data['id']}")
        print(f"✓ POST /api/unavailabilities (without notes) - 200 OK")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

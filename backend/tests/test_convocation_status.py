"""
Test Convocation Status Endpoints
- GET /api/events/{event_id}/convocation-status
- PUT /api/events/{event_id}/convocation-status
- POST /api/events/{event_id}/send-reminder
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestConvocationStatusEndpoints:
    """Test convocation status management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "test123456"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        token = login_response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get events to find one with attendance records
        events_response = self.session.get(f"{BASE_URL}/api/events")
        assert events_response.status_code == 200
        events = events_response.json()
        
        # Find an event with attendance records (treino type usually has them)
        self.event_with_attendance = None
        self.event_without_attendance = None
        
        for event in events:
            status_response = self.session.get(f"{BASE_URL}/api/events/{event['id']}/convocation-status")
            if status_response.status_code == 200:
                status_data = status_response.json()
                if status_data.get('total', 0) > 0:
                    self.event_with_attendance = event
                else:
                    self.event_without_attendance = event
                    
            if self.event_with_attendance and self.event_without_attendance:
                break
    
    def test_get_convocation_status_success(self):
        """GET /api/events/{event_id}/convocation-status returns correct structure"""
        if not self.event_with_attendance:
            pytest.skip("No event with attendance records found")
        
        response = self.session.get(f"{BASE_URL}/api/events/{self.event_with_attendance['id']}/convocation-status")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "event_id" in data
        assert "event_title" in data
        assert "present" in data
        assert "absent" in data
        assert "pending" in data
        assert "total" in data
        assert "confirmed_count" in data
        assert "event_passed" in data
        
        # Verify data types
        assert isinstance(data["present"], list)
        assert isinstance(data["absent"], list)
        assert isinstance(data["pending"], list)
        assert isinstance(data["total"], int)
        assert isinstance(data["confirmed_count"], int)
        assert isinstance(data["event_passed"], bool)
        
        # Verify total matches sum of lists
        assert data["total"] == len(data["present"]) + len(data["absent"]) + len(data["pending"])
        
        # Verify confirmed_count matches present list
        assert data["confirmed_count"] == len(data["present"])
    
    def test_get_convocation_status_player_structure(self):
        """GET /api/events/{event_id}/convocation-status returns correct player structure"""
        if not self.event_with_attendance:
            pytest.skip("No event with attendance records found")
        
        response = self.session.get(f"{BASE_URL}/api/events/{self.event_with_attendance['id']}/convocation-status")
        
        assert response.status_code == 200
        data = response.json()
        
        # Find a player in any list
        all_players = data["present"] + data["absent"] + data["pending"]
        if not all_players:
            pytest.skip("No players in convocation status")
        
        player = all_players[0]
        
        # Verify player structure
        assert "id" in player
        assert "name" in player
        assert "status" in player
        assert "attendance_id" in player
        
        # Status should be one of valid values
        assert player["status"] in ["confirmado", "ausente", "pendente", "faltou_sem_aviso"]
    
    def test_get_convocation_status_event_not_found(self):
        """GET /api/events/{event_id}/convocation-status returns 404 for non-existent event"""
        response = self.session.get(f"{BASE_URL}/api/events/non-existent-event-id/convocation-status")
        
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
    
    def test_get_convocation_status_empty_event(self):
        """GET /api/events/{event_id}/convocation-status returns empty lists for event without attendance"""
        if not self.event_without_attendance:
            pytest.skip("No event without attendance records found")
        
        response = self.session.get(f"{BASE_URL}/api/events/{self.event_without_attendance['id']}/convocation-status")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["total"] == 0
        assert data["confirmed_count"] == 0
        assert len(data["present"]) == 0
        assert len(data["absent"]) == 0
        assert len(data["pending"]) == 0
    
    def test_update_convocation_status_to_confirmado(self):
        """PUT /api/events/{event_id}/convocation-status updates player to confirmado"""
        if not self.event_with_attendance:
            pytest.skip("No event with attendance records found")
        
        # Get current status
        status_response = self.session.get(f"{BASE_URL}/api/events/{self.event_with_attendance['id']}/convocation-status")
        status_data = status_response.json()
        
        # Find a pending player to update
        if not status_data["pending"]:
            pytest.skip("No pending players to update")
        
        player = status_data["pending"][0]
        
        # Update to confirmado
        response = self.session.put(
            f"{BASE_URL}/api/events/{self.event_with_attendance['id']}/convocation-status",
            json={"player_id": player["id"], "status": "confirmado"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Estado atualizado"
        assert data["status"] == "confirmado"
        
        # Verify the change persisted
        verify_response = self.session.get(f"{BASE_URL}/api/events/{self.event_with_attendance['id']}/convocation-status")
        verify_data = verify_response.json()
        
        # Player should now be in present list
        present_ids = [p["id"] for p in verify_data["present"]]
        assert player["id"] in present_ids
    
    def test_update_convocation_status_to_ausente(self):
        """PUT /api/events/{event_id}/convocation-status updates player to ausente"""
        if not self.event_with_attendance:
            pytest.skip("No event with attendance records found")
        
        # Get current status
        status_response = self.session.get(f"{BASE_URL}/api/events/{self.event_with_attendance['id']}/convocation-status")
        status_data = status_response.json()
        
        # Find a player to update (from present or pending)
        player = None
        if status_data["present"]:
            player = status_data["present"][0]
        elif status_data["pending"]:
            player = status_data["pending"][0]
        
        if not player:
            pytest.skip("No players to update")
        
        # Update to ausente
        response = self.session.put(
            f"{BASE_URL}/api/events/{self.event_with_attendance['id']}/convocation-status",
            json={"player_id": player["id"], "status": "ausente"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ausente"
        
        # Verify the change persisted
        verify_response = self.session.get(f"{BASE_URL}/api/events/{self.event_with_attendance['id']}/convocation-status")
        verify_data = verify_response.json()
        
        # Player should now be in absent list
        absent_ids = [p["id"] for p in verify_data["absent"]]
        assert player["id"] in absent_ids
    
    def test_update_convocation_status_to_pendente(self):
        """PUT /api/events/{event_id}/convocation-status updates player to pendente"""
        if not self.event_with_attendance:
            pytest.skip("No event with attendance records found")
        
        # Get current status
        status_response = self.session.get(f"{BASE_URL}/api/events/{self.event_with_attendance['id']}/convocation-status")
        status_data = status_response.json()
        
        # Find a player to update (from present or absent)
        player = None
        if status_data["present"]:
            player = status_data["present"][0]
        elif status_data["absent"]:
            player = status_data["absent"][0]
        
        if not player:
            pytest.skip("No players to update")
        
        # Update to pendente
        response = self.session.put(
            f"{BASE_URL}/api/events/{self.event_with_attendance['id']}/convocation-status",
            json={"player_id": player["id"], "status": "pendente"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "pendente"
        
        # Verify the change persisted
        verify_response = self.session.get(f"{BASE_URL}/api/events/{self.event_with_attendance['id']}/convocation-status")
        verify_data = verify_response.json()
        
        # Player should now be in pending list
        pending_ids = [p["id"] for p in verify_data["pending"]]
        assert player["id"] in pending_ids
    
    def test_update_convocation_status_invalid_status(self):
        """PUT /api/events/{event_id}/convocation-status rejects invalid status"""
        if not self.event_with_attendance:
            pytest.skip("No event with attendance records found")
        
        # Get a player
        status_response = self.session.get(f"{BASE_URL}/api/events/{self.event_with_attendance['id']}/convocation-status")
        status_data = status_response.json()
        
        all_players = status_data["present"] + status_data["absent"] + status_data["pending"]
        if not all_players:
            pytest.skip("No players to update")
        
        player = all_players[0]
        
        # Try invalid status
        response = self.session.put(
            f"{BASE_URL}/api/events/{self.event_with_attendance['id']}/convocation-status",
            json={"player_id": player["id"], "status": "invalid_status"}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
    
    def test_update_convocation_status_player_not_found(self):
        """PUT /api/events/{event_id}/convocation-status returns 404 for non-existent player"""
        if not self.event_with_attendance:
            pytest.skip("No event with attendance records found")
        
        response = self.session.put(
            f"{BASE_URL}/api/events/{self.event_with_attendance['id']}/convocation-status",
            json={"player_id": "non-existent-player-id", "status": "confirmado"}
        )
        
        assert response.status_code == 404
    
    def test_send_reminder_success(self):
        """POST /api/events/{event_id}/send-reminder sends reminders to pending players"""
        if not self.event_with_attendance:
            pytest.skip("No event with attendance records found")
        
        # First ensure there are pending players
        status_response = self.session.get(f"{BASE_URL}/api/events/{self.event_with_attendance['id']}/convocation-status")
        status_data = status_response.json()
        
        if not status_data["pending"]:
            pytest.skip("No pending players to send reminders to")
        
        response = self.session.post(f"{BASE_URL}/api/events/{self.event_with_attendance['id']}/send-reminder")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert "sent_count" in data
        assert isinstance(data["sent_count"], int)
        assert data["sent_count"] >= 0
    
    def test_send_reminder_no_pending_players(self):
        """POST /api/events/{event_id}/send-reminder returns 0 when no pending players"""
        if not self.event_without_attendance:
            pytest.skip("No event without attendance records found")
        
        response = self.session.post(f"{BASE_URL}/api/events/{self.event_without_attendance['id']}/send-reminder")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["sent_count"] == 0
    
    def test_send_reminder_event_not_found(self):
        """POST /api/events/{event_id}/send-reminder returns 404 for non-existent event"""
        response = self.session.post(f"{BASE_URL}/api/events/non-existent-event-id/send-reminder")
        
        assert response.status_code == 404


class TestConvocationStatusUnauthorized:
    """Test convocation status endpoints without authentication"""
    
    def test_get_convocation_status_unauthorized(self):
        """GET /api/events/{event_id}/convocation-status requires authentication"""
        response = requests.get(f"{BASE_URL}/api/events/any-event-id/convocation-status")
        
        # Accept both 401 (Unauthorized) and 403 (Forbidden) as valid auth rejection
        assert response.status_code in [401, 403]
    
    def test_update_convocation_status_unauthorized(self):
        """PUT /api/events/{event_id}/convocation-status requires authentication"""
        response = requests.put(
            f"{BASE_URL}/api/events/any-event-id/convocation-status",
            json={"player_id": "any-player-id", "status": "confirmado"}
        )
        
        # Accept both 401 (Unauthorized) and 403 (Forbidden) as valid auth rejection
        assert response.status_code in [401, 403]
    
    def test_send_reminder_unauthorized(self):
        """POST /api/events/{event_id}/send-reminder requires authentication"""
        response = requests.post(f"{BASE_URL}/api/events/any-event-id/send-reminder")
        
        # Accept both 401 (Unauthorized) and 403 (Forbidden) as valid auth rejection
        assert response.status_code in [401, 403]

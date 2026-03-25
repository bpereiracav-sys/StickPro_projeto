"""
Phase 4 - Advanced Calendar Tests
Tests for:
- Event CRUD (Create, Read, Update, Delete)
- Event types (treino, jogo_campeonato, jogo_amigavel, torneio, outro)
- Event status (scheduled, postponed, cancelled)
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPhase4Calendar:
    """Phase 4 - Advanced Calendar API Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.admin_email = "admin@example.com"
        self.admin_password = "test123456"
        self.user_email = "test@example.com"
        self.user_password = "test123456"
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_admin_token(self):
        """Get admin authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.admin_email,
            "password": self.admin_password
        })
        if response.status_code == 200:
            return response.json().get("token")
        # Try to register admin if not exists
        response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.admin_email,
            "password": self.admin_password,
            "name": "Admin User",
            "role": "admin"
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def get_user_token(self):
        """Get regular user authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.user_email,
            "password": self.user_password
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def get_or_create_team(self, token):
        """Get existing team or create one for testing"""
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        response = self.session.get(f"{BASE_URL}/api/teams")
        if response.status_code == 200 and len(response.json()) > 0:
            return response.json()[0]
        
        # Create a team
        response = self.session.post(f"{BASE_URL}/api/teams", json={
            "name": "TEST_Team_Calendar",
            "category": "Sub-18",
            "season": "2024/2025"
        })
        if response.status_code == 200:
            return response.json()
        return None
    
    # ==================== EVENT CRUD TESTS ====================
    
    def test_create_event_treino(self):
        """Test creating a training event (treino)"""
        token = self.get_admin_token()
        assert token is not None, "Failed to get admin token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        team = self.get_or_create_team(token)
        assert team is not None, "Failed to get/create team"
        
        event_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%dT18:00:00")
        event_end = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%dT20:00:00")
        
        response = self.session.post(f"{BASE_URL}/api/events", json={
            "team_id": team["id"],
            "event_type": "treino",
            "title": "TEST_Treino Técnico",
            "description": "Treino de técnica individual",
            "location": "Pavilhão Municipal",
            "start_time": event_date,
            "end_time": event_end,
            "status": "scheduled"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["event_type"] == "treino"
        assert data["title"] == "TEST_Treino Técnico"
        assert data["status"] == "scheduled"
        print(f"✓ Created treino event: {data['id']}")
        return data
    
    def test_create_event_jogo_campeonato(self):
        """Test creating a championship game event"""
        token = self.get_admin_token()
        assert token is not None, "Failed to get admin token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        team = self.get_or_create_team(token)
        assert team is not None, "Failed to get/create team"
        
        event_date = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%dT15:00:00")
        
        response = self.session.post(f"{BASE_URL}/api/events", json={
            "team_id": team["id"],
            "event_type": "jogo_campeonato",
            "title": "TEST_Jogo vs Benfica",
            "location": "Pavilhão Casa",
            "start_time": event_date,
            "opponent": "Benfica",
            "status": "scheduled"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["event_type"] == "jogo_campeonato"
        assert data["opponent"] == "Benfica"
        print(f"✓ Created jogo_campeonato event: {data['id']}")
        return data
    
    def test_create_event_jogo_amigavel(self):
        """Test creating a friendly game event"""
        token = self.get_admin_token()
        assert token is not None, "Failed to get admin token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        team = self.get_or_create_team(token)
        
        event_date = (datetime.now() + timedelta(days=21)).strftime("%Y-%m-%dT16:00:00")
        
        response = self.session.post(f"{BASE_URL}/api/events", json={
            "team_id": team["id"],
            "event_type": "jogo_amigavel",
            "title": "TEST_Amigável vs Porto",
            "location": "Pavilhão Fora",
            "start_time": event_date,
            "opponent": "Porto",
            "status": "scheduled"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["event_type"] == "jogo_amigavel"
        print(f"✓ Created jogo_amigavel event: {data['id']}")
        return data
    
    def test_create_event_torneio(self):
        """Test creating a tournament event"""
        token = self.get_admin_token()
        assert token is not None, "Failed to get admin token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        team = self.get_or_create_team(token)
        
        event_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%dT09:00:00")
        
        response = self.session.post(f"{BASE_URL}/api/events", json={
            "team_id": team["id"],
            "event_type": "torneio",
            "title": "TEST_Torneio de Verão",
            "description": "Torneio anual de verão",
            "location": "Complexo Desportivo",
            "start_time": event_date,
            "status": "scheduled"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["event_type"] == "torneio"
        print(f"✓ Created torneio event: {data['id']}")
        return data
    
    def test_create_event_outro(self):
        """Test creating an 'outro' (other) type event"""
        token = self.get_admin_token()
        assert token is not None, "Failed to get admin token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        team = self.get_or_create_team(token)
        
        event_date = (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%dT19:00:00")
        
        response = self.session.post(f"{BASE_URL}/api/events", json={
            "team_id": team["id"],
            "event_type": "outro",
            "title": "TEST_Reunião de Pais",
            "description": "Reunião com os pais dos atletas",
            "location": "Sala de Reuniões",
            "start_time": event_date,
            "status": "scheduled"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["event_type"] == "outro"
        print(f"✓ Created outro event: {data['id']}")
        return data
    
    def test_get_events(self):
        """Test getting all events"""
        token = self.get_admin_token()
        assert token is not None, "Failed to get admin token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/events")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} events")
        return data
    
    def test_update_event_put(self):
        """Test updating an event via PUT /api/events/{id}"""
        token = self.get_admin_token()
        assert token is not None, "Failed to get admin token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # First create an event
        team = self.get_or_create_team(token)
        event_date = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%dT18:00:00")
        
        create_response = self.session.post(f"{BASE_URL}/api/events", json={
            "team_id": team["id"],
            "event_type": "treino",
            "title": "TEST_Event to Update",
            "location": "Original Location",
            "start_time": event_date,
            "status": "scheduled"
        })
        assert create_response.status_code == 200
        event = create_response.json()
        event_id = event["id"]
        
        # Update the event
        update_response = self.session.put(f"{BASE_URL}/api/events/{event_id}", json={
            "title": "TEST_Updated Event Title",
            "location": "Updated Location",
            "description": "Updated description"
        })
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        print(f"✓ Updated event {event_id}")
        
        # Verify update by getting the event
        get_response = self.session.get(f"{BASE_URL}/api/events/{event_id}")
        assert get_response.status_code == 200
        updated_event = get_response.json()
        assert updated_event["title"] == "TEST_Updated Event Title"
        assert updated_event["location"] == "Updated Location"
        print(f"✓ Verified event update persisted")
        
        return event_id
    
    def test_postpone_event(self):
        """Test postponing an event (status: postponed)"""
        token = self.get_admin_token()
        assert token is not None, "Failed to get admin token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Create an event
        team = self.get_or_create_team(token)
        event_date = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%dT18:00:00")
        
        create_response = self.session.post(f"{BASE_URL}/api/events", json={
            "team_id": team["id"],
            "event_type": "treino",
            "title": "TEST_Event to Postpone",
            "location": "Pavilhão",
            "start_time": event_date,
            "status": "scheduled"
        })
        assert create_response.status_code == 200
        event = create_response.json()
        event_id = event["id"]
        
        # Postpone the event
        update_response = self.session.put(f"{BASE_URL}/api/events/{event_id}", json={
            "status": "postponed"
        })
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        # Verify status change
        get_response = self.session.get(f"{BASE_URL}/api/events/{event_id}")
        assert get_response.status_code == 200
        updated_event = get_response.json()
        assert updated_event["status"] == "postponed"
        print(f"✓ Event {event_id} postponed successfully")
        
        return event_id
    
    def test_cancel_event(self):
        """Test cancelling an event (status: cancelled)"""
        token = self.get_admin_token()
        assert token is not None, "Failed to get admin token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Create an event
        team = self.get_or_create_team(token)
        event_date = (datetime.now() + timedelta(days=4)).strftime("%Y-%m-%dT18:00:00")
        
        create_response = self.session.post(f"{BASE_URL}/api/events", json={
            "team_id": team["id"],
            "event_type": "jogo_amigavel",
            "title": "TEST_Event to Cancel",
            "location": "Pavilhão",
            "start_time": event_date,
            "status": "scheduled"
        })
        assert create_response.status_code == 200
        event = create_response.json()
        event_id = event["id"]
        
        # Cancel the event
        update_response = self.session.put(f"{BASE_URL}/api/events/{event_id}", json={
            "status": "cancelled"
        })
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        # Verify status change
        get_response = self.session.get(f"{BASE_URL}/api/events/{event_id}")
        assert get_response.status_code == 200
        updated_event = get_response.json()
        assert updated_event["status"] == "cancelled"
        print(f"✓ Event {event_id} cancelled successfully")
        
        return event_id
    
    def test_delete_event(self):
        """Test deleting an event via DELETE /api/events/{id}"""
        token = self.get_admin_token()
        assert token is not None, "Failed to get admin token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Create an event to delete
        team = self.get_or_create_team(token)
        event_date = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%dT18:00:00")
        
        create_response = self.session.post(f"{BASE_URL}/api/events", json={
            "team_id": team["id"],
            "event_type": "treino",
            "title": "TEST_Event to Delete",
            "location": "Pavilhão",
            "start_time": event_date,
            "status": "scheduled"
        })
        assert create_response.status_code == 200
        event = create_response.json()
        event_id = event["id"]
        
        # Delete the event
        delete_response = self.session.delete(f"{BASE_URL}/api/events/{event_id}")
        
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        print(f"✓ Deleted event {event_id}")
        
        # Verify deletion
        get_response = self.session.get(f"{BASE_URL}/api/events/{event_id}")
        assert get_response.status_code == 404, f"Expected 404 after deletion, got {get_response.status_code}"
        print(f"✓ Verified event {event_id} no longer exists")
    
    def test_update_event_type(self):
        """Test updating event type"""
        token = self.get_admin_token()
        assert token is not None, "Failed to get admin token"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Create an event
        team = self.get_or_create_team(token)
        event_date = (datetime.now() + timedelta(days=6)).strftime("%Y-%m-%dT18:00:00")
        
        create_response = self.session.post(f"{BASE_URL}/api/events", json={
            "team_id": team["id"],
            "event_type": "treino",
            "title": "TEST_Event Type Change",
            "location": "Pavilhão",
            "start_time": event_date,
            "status": "scheduled"
        })
        assert create_response.status_code == 200
        event = create_response.json()
        event_id = event["id"]
        
        # Update event type to torneio
        update_response = self.session.put(f"{BASE_URL}/api/events/{event_id}", json={
            "event_type": "torneio"
        })
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        # Verify type change
        get_response = self.session.get(f"{BASE_URL}/api/events/{event_id}")
        assert get_response.status_code == 200
        updated_event = get_response.json()
        assert updated_event["event_type"] == "torneio"
        print(f"✓ Event type changed from treino to torneio")
    
    def test_regular_user_cannot_create_event(self):
        """Test that regular user (jogador) cannot create events"""
        token = self.get_user_token()
        if token is None:
            pytest.skip("Regular user not available")
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get teams for user
        teams_response = self.session.get(f"{BASE_URL}/api/teams")
        if teams_response.status_code != 200 or len(teams_response.json()) == 0:
            pytest.skip("No teams available for user")
        
        team = teams_response.json()[0]
        event_date = (datetime.now() + timedelta(days=8)).strftime("%Y-%m-%dT18:00:00")
        
        response = self.session.post(f"{BASE_URL}/api/events", json={
            "team_id": team["id"],
            "event_type": "treino",
            "title": "TEST_Unauthorized Event",
            "location": "Pavilhão",
            "start_time": event_date
        })
        
        # Should be forbidden for regular user
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print(f"✓ Regular user correctly denied event creation")
    
    def test_regular_user_cannot_delete_event(self):
        """Test that regular user (jogador) cannot delete events"""
        # First create event as admin
        admin_token = self.get_admin_token()
        assert admin_token is not None
        
        self.session.headers.update({"Authorization": f"Bearer {admin_token}"})
        team = self.get_or_create_team(admin_token)
        event_date = (datetime.now() + timedelta(days=9)).strftime("%Y-%m-%dT18:00:00")
        
        create_response = self.session.post(f"{BASE_URL}/api/events", json={
            "team_id": team["id"],
            "event_type": "treino",
            "title": "TEST_Event for Delete Test",
            "location": "Pavilhão",
            "start_time": event_date
        })
        assert create_response.status_code == 200
        event_id = create_response.json()["id"]
        
        # Try to delete as regular user
        user_token = self.get_user_token()
        if user_token is None:
            pytest.skip("Regular user not available")
        
        self.session.headers.update({"Authorization": f"Bearer {user_token}"})
        
        delete_response = self.session.delete(f"{BASE_URL}/api/events/{event_id}")
        
        # Should be forbidden for regular user
        assert delete_response.status_code == 403, f"Expected 403, got {delete_response.status_code}: {delete_response.text}"
        print(f"✓ Regular user correctly denied event deletion")


# Cleanup function to remove test data
def cleanup_test_events():
    """Remove all TEST_ prefixed events"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login as admin
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@example.com",
        "password": "test123456"
    })
    if response.status_code != 200:
        return
    
    token = response.json().get("token")
    session.headers.update({"Authorization": f"Bearer {token}"})
    
    # Get all events
    events_response = session.get(f"{BASE_URL}/api/events")
    if events_response.status_code == 200:
        events = events_response.json()
        for event in events:
            if event.get("title", "").startswith("TEST_"):
                session.delete(f"{BASE_URL}/api/events/{event['id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

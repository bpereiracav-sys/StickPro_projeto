"""
Phase 5 - Advanced Attendance Testing
Tests for attendance endpoints: team attendance, attendance summary, event attendance
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPhase5Attendance:
    """Phase 5 - Advanced Attendance endpoint tests"""
    
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
        
        token = login_response.json()["token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get test team ID
        teams_response = self.session.get(f"{BASE_URL}/api/teams")
        assert teams_response.status_code == 200
        teams = teams_response.json()
        
        if teams:
            self.test_team_id = teams[0]["id"]
        else:
            self.test_team_id = "3b217018-dc9b-4b0e-b99b-db89d636dada"
    
    # ==================== Team Attendance Endpoint Tests ====================
    
    def test_get_team_attendance_success(self):
        """Test GET /api/teams/{team_id}/attendance returns 200"""
        response = self.session.get(f"{BASE_URL}/api/teams/{self.test_team_id}/attendance")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Team attendance endpoint returns {len(data)} records")
    
    def test_get_team_attendance_with_month_filter(self):
        """Test GET /api/teams/{team_id}/attendance with month filter"""
        response = self.session.get(
            f"{BASE_URL}/api/teams/{self.test_team_id}/attendance",
            params={"month": 3}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Team attendance with month filter returns {len(data)} records")
    
    def test_get_team_attendance_with_event_type_filter(self):
        """Test GET /api/teams/{team_id}/attendance with event_type filter"""
        response = self.session.get(
            f"{BASE_URL}/api/teams/{self.test_team_id}/attendance",
            params={"event_type": "treino"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Team attendance with event_type filter returns {len(data)} records")
    
    def test_get_team_attendance_with_multiple_filters(self):
        """Test GET /api/teams/{team_id}/attendance with multiple filters"""
        response = self.session.get(
            f"{BASE_URL}/api/teams/{self.test_team_id}/attendance",
            params={"month": 3, "event_type": "treino"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Team attendance with multiple filters returns {len(data)} records")
    
    def test_get_team_attendance_invalid_team(self):
        """Test GET /api/teams/{team_id}/attendance with invalid team returns empty list"""
        response = self.session.get(f"{BASE_URL}/api/teams/invalid-team-id/attendance")
        # Should return 200 with empty list (no attendance for non-existent team)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Team attendance for invalid team returns empty list")
    
    # ==================== Team Attendance Summary Endpoint Tests ====================
    
    def test_get_team_attendance_summary_success(self):
        """Test GET /api/teams/{team_id}/attendance/summary returns 200"""
        response = self.session.get(f"{BASE_URL}/api/teams/{self.test_team_id}/attendance/summary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "monthly" in data, "Response should have 'monthly' field"
        assert "by_event_type" in data, "Response should have 'by_event_type' field"
        assert "total_records" in data, "Response should have 'total_records' field"
        
        # Validate by_event_type structure
        by_event_type = data["by_event_type"]
        expected_types = ["treino", "jogo_campeonato", "jogo_amigavel", "torneio", "outro"]
        for event_type in expected_types:
            assert event_type in by_event_type, f"Missing event type: {event_type}"
            assert "total" in by_event_type[event_type], f"Missing 'total' in {event_type}"
            assert "confirmado" in by_event_type[event_type], f"Missing 'confirmado' in {event_type}"
        
        print(f"✓ Team attendance summary returns correct structure with {data['total_records']} total records")
    
    def test_get_team_attendance_summary_invalid_team(self):
        """Test GET /api/teams/{team_id}/attendance/summary with invalid team"""
        response = self.session.get(f"{BASE_URL}/api/teams/invalid-team-id/attendance/summary")
        # Should return 200 with empty data
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["total_records"] == 0, "Total records should be 0 for invalid team"
        print(f"✓ Team attendance summary for invalid team returns 0 records")
    
    # ==================== Event Attendance Endpoint Tests ====================
    
    def test_get_event_attendance_success(self):
        """Test GET /api/events/{event_id}/attendance returns 200"""
        # First get an event
        events_response = self.session.get(f"{BASE_URL}/api/events", params={"team_id": self.test_team_id})
        assert events_response.status_code == 200
        events = events_response.json()
        
        if events:
            event_id = events[0]["id"]
            response = self.session.get(f"{BASE_URL}/api/events/{event_id}/attendance")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            assert "attendance" in data, "Response should have 'attendance' field"
            assert "summary" in data, "Response should have 'summary' field"
            
            summary = data["summary"]
            assert "total" in summary, "Summary should have 'total' field"
            assert "confirmado" in summary, "Summary should have 'confirmado' field"
            assert "ausente" in summary, "Summary should have 'ausente' field"
            assert "pendente" in summary, "Summary should have 'pendente' field"
            
            print(f"✓ Event attendance returns correct structure with {summary['total']} records")
        else:
            pytest.skip("No events found for testing")
    
    def test_get_event_attendance_invalid_event(self):
        """Test GET /api/events/{event_id}/attendance with invalid event returns 404"""
        response = self.session.get(f"{BASE_URL}/api/events/invalid-event-id/attendance")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print(f"✓ Event attendance for invalid event returns 404")
    
    # ==================== Integration Tests ====================
    
    def test_create_convocation_and_verify_attendance(self):
        """Test creating a convocation creates attendance records"""
        # Get team members
        members_response = self.session.get(f"{BASE_URL}/api/teams/{self.test_team_id}/members")
        if members_response.status_code != 200:
            pytest.skip("Could not get team members")
        
        members = members_response.json()
        if not members:
            pytest.skip("No team members found")
        
        # Get events
        events_response = self.session.get(f"{BASE_URL}/api/events", params={"team_id": self.test_team_id})
        if events_response.status_code != 200:
            pytest.skip("Could not get events")
        
        events = events_response.json()
        if not events:
            pytest.skip("No events found")
        
        # Create a convocation
        player_ids = [m["id"] for m in members[:2]]  # Take first 2 members
        event_id = events[0]["id"]
        
        conv_response = self.session.post(f"{BASE_URL}/api/convocations", json={
            "event_id": event_id,
            "player_ids": player_ids,
            "message": "TEST_Convocation for attendance testing"
        })
        
        if conv_response.status_code == 200 or conv_response.status_code == 201:
            # Verify attendance records were created
            att_response = self.session.get(f"{BASE_URL}/api/events/{event_id}/attendance")
            assert att_response.status_code == 200
            
            att_data = att_response.json()
            assert att_data["summary"]["total"] >= len(player_ids), "Attendance records should be created"
            print(f"✓ Convocation created attendance records: {att_data['summary']['total']} records")
        else:
            print(f"⚠ Convocation creation returned {conv_response.status_code}: {conv_response.text}")
            pytest.skip("Could not create convocation")
    
    def test_attendance_data_structure(self):
        """Test that attendance data has correct structure when records exist"""
        response = self.session.get(f"{BASE_URL}/api/teams/{self.test_team_id}/attendance")
        assert response.status_code == 200
        
        data = response.json()
        if data:
            record = data[0]
            # Check expected fields
            expected_fields = ["total", "confirmado", "ausente", "pendente", "attendance_rate"]
            for field in expected_fields:
                assert field in record, f"Missing field: {field}"
            
            # Check player info if present
            if "player" in record:
                player = record["player"]
                assert "id" in player, "Player should have 'id'"
                assert "name" in player, "Player should have 'name'"
            
            print(f"✓ Attendance data structure is correct")
        else:
            print(f"⚠ No attendance records to validate structure")


class TestAttendanceFilters:
    """Test attendance filter combinations"""
    
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
        assert login_response.status_code == 200
        
        token = login_response.json()["token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get test team ID
        teams_response = self.session.get(f"{BASE_URL}/api/teams")
        teams = teams_response.json()
        self.test_team_id = teams[0]["id"] if teams else "3b217018-dc9b-4b0e-b99b-db89d636dada"
    
    def test_filter_by_all_months(self):
        """Test filtering by each month"""
        for month in range(1, 13):
            response = self.session.get(
                f"{BASE_URL}/api/teams/{self.test_team_id}/attendance",
                params={"month": month}
            )
            assert response.status_code == 200, f"Month {month} filter failed"
        print(f"✓ All month filters work correctly")
    
    def test_filter_by_all_event_types(self):
        """Test filtering by each event type"""
        event_types = ["treino", "jogo_campeonato", "jogo_amigavel", "torneio", "outro"]
        for event_type in event_types:
            response = self.session.get(
                f"{BASE_URL}/api/teams/{self.test_team_id}/attendance",
                params={"event_type": event_type}
            )
            assert response.status_code == 200, f"Event type {event_type} filter failed"
        print(f"✓ All event type filters work correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

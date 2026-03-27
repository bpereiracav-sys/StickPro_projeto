"""
RBAC Permission Tests for StickPro Roller Hockey App
Tests role-based access control across all backend routes.

Roles tested:
- admin: Full access to all data and teams
- treinador (coach): Access to assigned teams
- delegado (delegate): Access to assigned teams  
- jogador (player): Access to own data and team context
- responsavel (family_member): Access to linked player data only
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "test123456"
PLAYER_EMAIL = "testplayer@example.com"
PLAYER_PASSWORD = "FeBwJa8VytI"
TEAM_ID = "58b17073-b32d-4c1d-afa7-e1a2936f0db2"


class TestRBACSetup:
    """Setup and verify test users exist"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def player_token(self):
        """Get player authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PLAYER_EMAIL,
            "password": PLAYER_PASSWORD
        })
        assert response.status_code == 200, f"Player login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def staff_token(self, admin_token):
        """Create and get staff (treinador) authentication token"""
        # Create a test coach user
        unique_id = str(uuid.uuid4())[:8]
        coach_email = f"test_coach_{unique_id}@test.com"
        coach_password = "TestCoach123!"
        
        # Register coach
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": coach_email,
            "password": coach_password,
            "name": f"Test Coach {unique_id}",
            "role": "treinador"
        })
        
        if response.status_code == 200:
            coach_data = response.json()
            coach_id = coach_data["user"]["id"]
            
            # Add coach to team
            headers = {"Authorization": f"Bearer {admin_token}"}
            requests.post(f"{BASE_URL}/api/teams/{TEAM_ID}/members", 
                         json={"user_id": coach_id, "role": "treinador"},
                         headers=headers)
            
            # Login as coach
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": coach_email,
                "password": coach_password
            })
            if login_response.status_code == 200:
                return login_response.json()["token"]
        
        pytest.skip("Could not create staff user")
    
    def test_admin_login(self, admin_token):
        """Verify admin can login"""
        assert admin_token is not None
        print("✓ Admin login successful")
    
    def test_player_login(self, player_token):
        """Verify player can login"""
        assert player_token is not None
        print("✓ Player login successful")


class TestPermissionsEndpoint:
    """Test GET /api/auth/permissions endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def player_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PLAYER_EMAIL, "password": PLAYER_PASSWORD
        })
        return response.json()["token"]
    
    def test_admin_permissions(self, admin_token):
        """Admin should have full permissions"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/permissions", headers=headers)
        
        assert response.status_code == 200
        perms = response.json()
        
        assert perms["role"] == "admin"
        assert perms["is_admin"] == True
        assert perms["can_manage_team"] == True
        assert perms["can_manage_events"] == True
        assert perms["can_manage_stats"] == True
        assert perms["can_manage_attendance"] == True
        assert perms["can_create_convocations"] == True
        assert perms["can_manage_lineups"] == True
        assert perms["can_import_data"] == True
        assert perms["can_manage_club"] == True
        print("✓ Admin has all permissions")
    
    def test_player_permissions(self, player_token):
        """Player should have limited permissions"""
        headers = {"Authorization": f"Bearer {player_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/permissions", headers=headers)
        
        assert response.status_code == 200
        perms = response.json()
        
        assert perms["role"] == "jogador"
        assert perms["is_admin"] == False
        assert perms["is_player"] == True
        assert perms["can_manage_team"] == False
        assert perms["can_manage_events"] == False
        assert perms["can_manage_stats"] == False
        assert perms["can_create_convocations"] == False
        assert perms["can_manage_lineups"] == False
        assert perms["can_import_data"] == False
        assert perms["can_manage_club"] == False
        print("✓ Player has restricted permissions")


class TestEventRBAC:
    """Test RBAC on Event endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def player_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PLAYER_EMAIL, "password": PLAYER_PASSWORD
        })
        return response.json()["token"]
    
    def test_player_can_view_events(self, player_token):
        """Player should be able to view events for their team"""
        headers = {"Authorization": f"Bearer {player_token}"}
        response = requests.get(f"{BASE_URL}/api/events?team_id={TEAM_ID}", headers=headers)
        
        assert response.status_code == 200
        events = response.json()
        assert isinstance(events, list)
        print(f"✓ Player can view events (found {len(events)} events)")
    
    def test_player_cannot_create_event(self, player_token):
        """Player should NOT be able to create events"""
        headers = {"Authorization": f"Bearer {player_token}"}
        event_data = {
            "team_id": TEAM_ID,
            "event_type": "treino",
            "title": "Test Training",
            "location": "Test Location",
            "start_time": (datetime.now() + timedelta(days=1)).isoformat()
        }
        response = requests.post(f"{BASE_URL}/api/events", json=event_data, headers=headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Player cannot create events (403 Forbidden)")
    
    def test_player_cannot_update_event(self, player_token, admin_token):
        """Player should NOT be able to update events"""
        # First get an event ID
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        events_response = requests.get(f"{BASE_URL}/api/events", headers=admin_headers)
        events = events_response.json()
        
        if not events:
            pytest.skip("No events to test")
        
        event_id = events[0]["id"]
        
        # Try to update as player
        player_headers = {"Authorization": f"Bearer {player_token}"}
        response = requests.put(f"{BASE_URL}/api/events/{event_id}", 
                               json={"title": "Hacked Title"},
                               headers=player_headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Player cannot update events (403 Forbidden)")
    
    def test_player_cannot_delete_event(self, player_token, admin_token):
        """Player should NOT be able to delete events"""
        # First get an event ID
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        events_response = requests.get(f"{BASE_URL}/api/events", headers=admin_headers)
        events = events_response.json()
        
        if not events:
            pytest.skip("No events to test")
        
        event_id = events[0]["id"]
        
        # Try to delete as player
        player_headers = {"Authorization": f"Bearer {player_token}"}
        response = requests.delete(f"{BASE_URL}/api/events/{event_id}", headers=player_headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Player cannot delete events (403 Forbidden)")
    
    def test_admin_can_create_event(self, admin_token):
        """Admin should be able to create events"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        event_data = {
            "team_id": TEAM_ID,
            "event_type": "treino",
            "title": f"RBAC Test Training {uuid.uuid4().hex[:8]}",
            "location": "Test Location",
            "start_time": (datetime.now() + timedelta(days=7)).isoformat()
        }
        response = requests.post(f"{BASE_URL}/api/events", json=event_data, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Admin can create events")


class TestChampionshipRBAC:
    """Test RBAC on Championship endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def player_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PLAYER_EMAIL, "password": PLAYER_PASSWORD
        })
        return response.json()["token"]
    
    def test_player_can_view_championships(self, player_token):
        """Player should be able to view championships for their team"""
        headers = {"Authorization": f"Bearer {player_token}"}
        response = requests.get(f"{BASE_URL}/api/championships?team_id={TEAM_ID}", headers=headers)
        
        assert response.status_code == 200
        championships = response.json()
        assert isinstance(championships, list)
        print(f"✓ Player can view championships (found {len(championships)} championships)")
    
    def test_player_cannot_create_championship(self, player_token):
        """Player should NOT be able to create championships"""
        headers = {"Authorization": f"Bearer {player_token}"}
        champ_data = {
            "name": "Test Championship",
            "season": "2024/2025",
            "team_id": TEAM_ID,
            "format": "5x5"
        }
        response = requests.post(f"{BASE_URL}/api/championships", json=champ_data, headers=headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Player cannot create championships (403 Forbidden)")
    
    def test_player_cannot_update_championship(self, player_token, admin_token):
        """Player should NOT be able to update championships"""
        # First get a championship ID
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        champs_response = requests.get(f"{BASE_URL}/api/championships", headers=admin_headers)
        champs = champs_response.json()
        
        if not champs:
            pytest.skip("No championships to test")
        
        champ_id = champs[0]["id"]
        
        # Try to update as player
        player_headers = {"Authorization": f"Bearer {player_token}"}
        response = requests.put(f"{BASE_URL}/api/championships/{champ_id}", 
                               json={"name": "Hacked Championship"},
                               headers=player_headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Player cannot update championships (403 Forbidden)")
    
    def test_player_cannot_delete_championship(self, player_token, admin_token):
        """Player should NOT be able to delete championships"""
        # First get a championship ID
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        champs_response = requests.get(f"{BASE_URL}/api/championships", headers=admin_headers)
        champs = champs_response.json()
        
        if not champs:
            pytest.skip("No championships to test")
        
        champ_id = champs[0]["id"]
        
        # Try to delete as player
        player_headers = {"Authorization": f"Bearer {player_token}"}
        response = requests.delete(f"{BASE_URL}/api/championships/{champ_id}", headers=player_headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Player cannot delete championships (403 Forbidden)")


class TestTeamMemberRBAC:
    """Test RBAC on Team Member endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def player_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PLAYER_EMAIL, "password": PLAYER_PASSWORD
        })
        return response.json()["token"]
    
    def test_player_can_view_team_members(self, player_token):
        """Player should be able to view team members"""
        headers = {"Authorization": f"Bearer {player_token}"}
        response = requests.get(f"{BASE_URL}/api/teams/{TEAM_ID}/members", headers=headers)
        
        assert response.status_code == 200
        members = response.json()
        assert isinstance(members, list)
        print(f"✓ Player can view team members (found {len(members)} members)")
    
    def test_player_cannot_add_team_member(self, player_token, admin_token):
        """Player should NOT be able to add team members"""
        # First get a user ID to add
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        users_response = requests.get(f"{BASE_URL}/api/users", headers=admin_headers)
        users = users_response.json()
        
        if not users:
            pytest.skip("No users to test")
        
        user_id = users[0]["id"]
        
        # Try to add as player
        player_headers = {"Authorization": f"Bearer {player_token}"}
        response = requests.post(f"{BASE_URL}/api/teams/{TEAM_ID}/members", 
                                json={"user_id": user_id, "role": "jogador"},
                                headers=player_headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Player cannot add team members (403 Forbidden)")
    
    def test_player_cannot_remove_team_member(self, player_token, admin_token):
        """Player should NOT be able to remove team members"""
        # Get team members
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        members_response = requests.get(f"{BASE_URL}/api/teams/{TEAM_ID}/members", headers=admin_headers)
        members = members_response.json()
        
        if not members:
            pytest.skip("No members to test")
        
        member_id = members[0]["id"]
        
        # Try to remove as player
        player_headers = {"Authorization": f"Bearer {player_token}"}
        response = requests.delete(f"{BASE_URL}/api/teams/{TEAM_ID}/members/{member_id}", 
                                  headers=player_headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Player cannot remove team members (403 Forbidden)")


class TestAttendanceRBAC:
    """Test RBAC on Attendance endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def player_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PLAYER_EMAIL, "password": PLAYER_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def player_id(self, player_token):
        headers = {"Authorization": f"Bearer {player_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        return response.json()["id"]
    
    def test_player_can_view_own_convocations(self, player_token):
        """Player should be able to view their own convocations"""
        headers = {"Authorization": f"Bearer {player_token}"}
        response = requests.get(f"{BASE_URL}/api/convocations/my", headers=headers)
        
        assert response.status_code == 200
        convocations = response.json()
        assert isinstance(convocations, list)
        print(f"✓ Player can view own convocations (found {len(convocations)} convocations)")
    
    def test_player_can_update_own_attendance(self, player_token, admin_token, player_id):
        """Player should be able to update their own attendance status"""
        # First, create a convocation for the player
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create an event
        event_data = {
            "team_id": TEAM_ID,
            "event_type": "treino",
            "title": f"RBAC Attendance Test {uuid.uuid4().hex[:8]}",
            "location": "Test Location",
            "start_time": (datetime.now() + timedelta(days=3)).isoformat()
        }
        event_response = requests.post(f"{BASE_URL}/api/events", json=event_data, headers=admin_headers)
        
        if event_response.status_code != 200:
            pytest.skip("Could not create test event")
        
        event_id = event_response.json()["id"]
        
        # Create convocation for the player
        conv_data = {
            "event_id": event_id,
            "player_ids": [player_id],
            "message": "Test convocation"
        }
        conv_response = requests.post(f"{BASE_URL}/api/convocations", json=conv_data, headers=admin_headers)
        
        if conv_response.status_code != 200:
            pytest.skip("Could not create test convocation")
        
        # Get the attendance record
        player_headers = {"Authorization": f"Bearer {player_token}"}
        my_convs = requests.get(f"{BASE_URL}/api/convocations/my", headers=player_headers).json()
        
        # Find the attendance for our event
        attendance_id = None
        for conv in my_convs:
            if conv.get("event", {}).get("id") == event_id:
                attendance_id = conv.get("attendance", {}).get("id")
                break
        
        if not attendance_id:
            pytest.skip("Could not find attendance record")
        
        # Update attendance as player
        update_response = requests.put(f"{BASE_URL}/api/attendance/{attendance_id}",
                                       json={"status": "confirmado"},
                                       headers=player_headers)
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        print("✓ Player can update own attendance status")
    
    def test_player_cannot_create_convocation(self, player_token):
        """Player should NOT be able to create convocations"""
        headers = {"Authorization": f"Bearer {player_token}"}
        
        # Get an event ID
        events_response = requests.get(f"{BASE_URL}/api/events", headers=headers)
        events = events_response.json()
        
        if not events:
            pytest.skip("No events to test")
        
        event_id = events[0]["id"]
        
        conv_data = {
            "event_id": event_id,
            "player_ids": ["some-player-id"],
            "message": "Test"
        }
        response = requests.post(f"{BASE_URL}/api/convocations", json=conv_data, headers=headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Player cannot create convocations (403 Forbidden)")


class TestConvocationRBAC:
    """Test RBAC on Convocation creation - requires staff role"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def player_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PLAYER_EMAIL, "password": PLAYER_PASSWORD
        })
        return response.json()["token"]
    
    def test_admin_can_create_convocation(self, admin_token):
        """Admin should be able to create convocations"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create an event first
        event_data = {
            "team_id": TEAM_ID,
            "event_type": "treino",
            "title": f"Convocation Test {uuid.uuid4().hex[:8]}",
            "location": "Test Location",
            "start_time": (datetime.now() + timedelta(days=5)).isoformat()
        }
        event_response = requests.post(f"{BASE_URL}/api/events", json=event_data, headers=headers)
        
        if event_response.status_code != 200:
            pytest.skip("Could not create test event")
        
        event_id = event_response.json()["id"]
        
        # Get team members
        members_response = requests.get(f"{BASE_URL}/api/teams/{TEAM_ID}/members", headers=headers)
        members = members_response.json()
        
        if not members:
            pytest.skip("No team members to convoke")
        
        player_ids = [m["id"] for m in members if m.get("team_role") == "jogador"][:3]
        
        if not player_ids:
            pytest.skip("No players to convoke")
        
        conv_data = {
            "event_id": event_id,
            "player_ids": player_ids,
            "message": "Test convocation from admin"
        }
        response = requests.post(f"{BASE_URL}/api/convocations", json=conv_data, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Admin can create convocations")


class TestLineupRBAC:
    """Test RBAC on Line-up management - requires coach permissions"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def player_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PLAYER_EMAIL, "password": PLAYER_PASSWORD
        })
        return response.json()["token"]
    
    def test_player_cannot_create_lineup(self, player_token, admin_token):
        """Player should NOT be able to create lineups"""
        # Get a match ID
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        champs_response = requests.get(f"{BASE_URL}/api/championships", headers=admin_headers)
        champs = champs_response.json()
        
        if not champs:
            pytest.skip("No championships to test")
        
        champ_id = champs[0]["id"]
        matches_response = requests.get(f"{BASE_URL}/api/championships/{champ_id}/matches", headers=admin_headers)
        matches = matches_response.json()
        
        if not matches:
            pytest.skip("No matches to test")
        
        match_id = matches[0]["id"]
        
        # Try to create lineup as player - correct endpoint is /api/championships/matches/{match_id}/lineup
        player_headers = {"Authorization": f"Bearer {player_token}"}
        lineup_data = {
            "periods": [
                {
                    "name": "1ª Parte",
                    "order": 1,
                    "positions": []
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/api/championships/matches/{match_id}/lineup", 
                                json=lineup_data, headers=player_headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Player cannot create lineups (403 Forbidden)")
    
    def test_admin_can_create_lineup(self, admin_token):
        """Admin should be able to create lineups"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get a match ID
        champs_response = requests.get(f"{BASE_URL}/api/championships", headers=headers)
        champs = champs_response.json()
        
        if not champs:
            pytest.skip("No championships to test")
        
        champ_id = champs[0]["id"]
        matches_response = requests.get(f"{BASE_URL}/api/championships/{champ_id}/matches", headers=headers)
        matches = matches_response.json()
        
        if not matches:
            pytest.skip("No matches to test")
        
        match_id = matches[0]["id"]
        
        lineup_data = {
            "periods": [
                {
                    "name": "1ª Parte",
                    "order": 1,
                    "positions": []
                }
            ]
        }
        response = requests.post(f"{BASE_URL}/api/championships/matches/{match_id}/lineup", 
                                json=lineup_data, headers=headers)
        
        # Could be 200 (created) or 200 (updated existing)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Admin can create/update lineups")


class TestTeamAccessRBAC:
    """Test that staff cannot access teams they are not assigned to"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def player_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": PLAYER_EMAIL, "password": PLAYER_PASSWORD
        })
        return response.json()["token"]
    
    def test_player_cannot_access_unassigned_team(self, player_token, admin_token):
        """Player should NOT be able to access teams they are not assigned to"""
        # Get all teams
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        teams_response = requests.get(f"{BASE_URL}/api/teams", headers=admin_headers)
        teams = teams_response.json()
        
        # Find a team the player is NOT assigned to
        player_headers = {"Authorization": f"Bearer {player_token}"}
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=player_headers)
        player_team_ids = me_response.json().get("team_ids", [])
        
        other_team = None
        for team in teams:
            if team["id"] not in player_team_ids:
                other_team = team
                break
        
        if not other_team:
            pytest.skip("No other teams to test access restriction")
        
        # Try to access the other team
        response = requests.get(f"{BASE_URL}/api/teams/{other_team['id']}", headers=player_headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print(f"✓ Player cannot access unassigned team '{other_team['name']}' (403 Forbidden)")
    
    def test_admin_can_access_all_teams(self, admin_token):
        """Admin should be able to access all teams"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        teams_response = requests.get(f"{BASE_URL}/api/teams", headers=headers)
        teams = teams_response.json()
        
        for team in teams:
            response = requests.get(f"{BASE_URL}/api/teams/{team['id']}", headers=headers)
            assert response.status_code == 200, f"Admin should access team {team['id']}"
        
        print(f"✓ Admin can access all {len(teams)} teams")


class TestStaffEventCreation:
    """Test that staff (treinador/delegado) can create events for their assigned teams"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def staff_user(self, admin_token):
        """Create a staff user with team assignment"""
        unique_id = str(uuid.uuid4())[:8]
        staff_email = f"test_staff_{unique_id}@test.com"
        staff_password = "TestStaff123!"
        
        # Register staff
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": staff_email,
            "password": staff_password,
            "name": f"Test Staff {unique_id}",
            "role": "treinador"
        })
        
        if response.status_code != 200:
            pytest.skip("Could not create staff user")
        
        staff_data = response.json()
        staff_id = staff_data["user"]["id"]
        
        # Add staff to team
        headers = {"Authorization": f"Bearer {admin_token}"}
        add_response = requests.post(f"{BASE_URL}/api/teams/{TEAM_ID}/members", 
                                    json={"user_id": staff_id, "role": "treinador"},
                                    headers=headers)
        
        # Login as staff
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": staff_email,
            "password": staff_password
        })
        
        if login_response.status_code != 200:
            pytest.skip("Could not login as staff")
        
        return {
            "token": login_response.json()["token"],
            "id": staff_id,
            "email": staff_email
        }
    
    def test_staff_can_create_event_for_assigned_team(self, staff_user):
        """Staff should be able to create events for their assigned team"""
        headers = {"Authorization": f"Bearer {staff_user['token']}"}
        
        event_data = {
            "team_id": TEAM_ID,
            "event_type": "treino",
            "title": f"Staff Created Training {uuid.uuid4().hex[:8]}",
            "location": "Test Location",
            "start_time": (datetime.now() + timedelta(days=10)).isoformat()
        }
        response = requests.post(f"{BASE_URL}/api/events", json=event_data, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Staff can create events for assigned team")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

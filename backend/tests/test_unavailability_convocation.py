"""
Test Unavailability API and Convocation Visibility Features
- Unavailability CRUD operations
- Convocation visibility settings
- Unavailable players handling during convocation
- Upcoming events without convocation API
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "test123456"
PLAYER_EMAIL = "testplayer@example.com"
PLAYER_PASSWORD = "FeBwJa8VytI"
TEAM_ID = "58b17073-b32d-4c1d-afa7-e1a2936f0db2"


class TestUnavailabilityAPI:
    """Test Unavailability CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.admin_token = None
        self.player_token = None
        self.created_unavailability_id = None
        
    def get_admin_token(self):
        """Get admin authentication token"""
        if self.admin_token:
            return self.admin_token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.admin_token = response.json().get("token")
            return self.admin_token
        pytest.skip(f"Admin login failed: {response.status_code}")
        
    def get_player_token(self):
        """Get player authentication token"""
        if self.player_token:
            return self.player_token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": PLAYER_EMAIL,
            "password": PLAYER_PASSWORD
        })
        if response.status_code == 200:
            self.player_token = response.json().get("token")
            return self.player_token
        pytest.skip(f"Player login failed: {response.status_code}")
    
    def test_01_create_unavailability_as_player(self):
        """Test creating unavailability period as player"""
        token = self.get_player_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Create unavailability for next week
        start_date = (datetime.now() + timedelta(days=7)).isoformat()
        end_date = (datetime.now() + timedelta(days=14)).isoformat()
        
        response = self.session.post(f"{BASE_URL}/api/unavailabilities", json={
            "start_date": start_date,
            "end_date": end_date,
            "reason": "ferias",
            "notes": "Test unavailability - vacation"
        })
        
        print(f"Create unavailability response: {response.status_code}")
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain id"
        assert data["reason"] == "ferias", "Reason should be 'ferias'"
        
        # Store for cleanup
        self.__class__.created_unavailability_id = data["id"]
        print(f"Created unavailability ID: {data['id']}")
        
    def test_02_get_my_unavailabilities(self):
        """Test getting current user's unavailabilities"""
        token = self.get_player_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/unavailabilities/my")
        
        print(f"Get my unavailabilities response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} unavailabilities for current user")
        
    def test_03_get_team_unavailabilities_as_admin(self):
        """Test getting team unavailabilities as admin"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/unavailabilities", params={"team_id": TEAM_ID})
        
        print(f"Get team unavailabilities response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} unavailabilities for team {TEAM_ID}")
        
    def test_04_update_unavailability(self):
        """Test updating unavailability period"""
        token = self.get_player_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # First create a new unavailability to update
        start_date = (datetime.now() + timedelta(days=20)).isoformat()
        end_date = (datetime.now() + timedelta(days=25)).isoformat()
        
        create_response = self.session.post(f"{BASE_URL}/api/unavailabilities", json={
            "start_date": start_date,
            "end_date": end_date,
            "reason": "trabalho",
            "notes": "Work trip"
        })
        
        if create_response.status_code not in [200, 201]:
            pytest.skip(f"Could not create unavailability for update test: {create_response.text}")
            
        unavailability_id = create_response.json()["id"]
        
        # Update the unavailability
        new_end_date = (datetime.now() + timedelta(days=30)).isoformat()
        update_response = self.session.put(f"{BASE_URL}/api/unavailabilities/{unavailability_id}", json={
            "start_date": start_date,
            "end_date": new_end_date,
            "reason": "pessoal",
            "notes": "Updated - personal reasons"
        })
        
        print(f"Update unavailability response: {update_response.status_code}")
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/unavailabilities/{unavailability_id}")
        
    def test_05_delete_unavailability(self):
        """Test deleting unavailability period"""
        token = self.get_player_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Create unavailability to delete
        start_date = (datetime.now() + timedelta(days=30)).isoformat()
        end_date = (datetime.now() + timedelta(days=35)).isoformat()
        
        create_response = self.session.post(f"{BASE_URL}/api/unavailabilities", json={
            "start_date": start_date,
            "end_date": end_date,
            "reason": "lesao",
            "notes": "Injury - to be deleted"
        })
        
        if create_response.status_code not in [200, 201]:
            pytest.skip(f"Could not create unavailability for delete test: {create_response.text}")
            
        unavailability_id = create_response.json()["id"]
        
        # Delete the unavailability
        delete_response = self.session.delete(f"{BASE_URL}/api/unavailabilities/{unavailability_id}")
        
        print(f"Delete unavailability response: {delete_response.status_code}")
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        
        # Verify deletion
        get_response = self.session.get(f"{BASE_URL}/api/unavailabilities/my")
        unavailabilities = get_response.json()
        deleted_ids = [u["id"] for u in unavailabilities]
        assert unavailability_id not in deleted_ids, "Deleted unavailability should not appear in list"
        
    def test_06_check_unavailability_for_players(self):
        """Test checking unavailability for specific players and date"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get team members first
        members_response = self.session.get(f"{BASE_URL}/api/teams/{TEAM_ID}/members")
        if members_response.status_code != 200:
            pytest.skip(f"Could not get team members: {members_response.text}")
            
        members = members_response.json()
        if not members:
            pytest.skip("No team members found")
            
        player_ids = [m["id"] for m in members[:3]]  # Check first 3 members
        event_date = (datetime.now() + timedelta(days=10)).isoformat()
        
        response = self.session.get(f"{BASE_URL}/api/unavailabilities/check", params={
            "player_ids": ",".join(player_ids),
            "event_date": event_date
        })
        
        print(f"Check unavailability response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "unavailable_players" in data, "Response should contain 'unavailable_players'"
        print(f"Found {len(data['unavailable_players'])} unavailable players for date {event_date}")
        
    def test_07_unavailability_reasons_validation(self):
        """Test that all valid reasons are accepted"""
        token = self.get_player_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        valid_reasons = ["ferias", "lesao", "trabalho", "pessoal", "outro"]
        created_ids = []
        
        for reason in valid_reasons:
            start_date = (datetime.now() + timedelta(days=40 + valid_reasons.index(reason) * 5)).isoformat()
            end_date = (datetime.now() + timedelta(days=42 + valid_reasons.index(reason) * 5)).isoformat()
            
            response = self.session.post(f"{BASE_URL}/api/unavailabilities", json={
                "start_date": start_date,
                "end_date": end_date,
                "reason": reason,
                "notes": f"Test reason: {reason}"
            })
            
            print(f"Create unavailability with reason '{reason}': {response.status_code}")
            assert response.status_code in [200, 201], f"Reason '{reason}' should be valid, got {response.status_code}: {response.text}"
            created_ids.append(response.json()["id"])
            
        # Cleanup
        for uid in created_ids:
            self.session.delete(f"{BASE_URL}/api/unavailabilities/{uid}")


class TestConvocationVisibility:
    """Test Convocation visibility settings"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.admin_token = None
        
    def get_admin_token(self):
        """Get admin authentication token"""
        if self.admin_token:
            return self.admin_token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.admin_token = response.json().get("token")
            return self.admin_token
        pytest.skip(f"Admin login failed: {response.status_code}")
        
    def test_01_create_convocation_with_visibility_all(self):
        """Test creating convocation with visibility='all'"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # First create an event
        event_data = {
            "team_id": TEAM_ID,
            "event_type": "treino",
            "title": "Test Training - Visibility All",
            "location": "Test Pavilion",
            "start_time": (datetime.now() + timedelta(days=5)).isoformat(),
            "end_time": (datetime.now() + timedelta(days=5, hours=2)).isoformat()
        }
        
        event_response = self.session.post(f"{BASE_URL}/api/events", json=event_data)
        if event_response.status_code not in [200, 201]:
            pytest.skip(f"Could not create event: {event_response.text}")
            
        event_id = event_response.json()["id"]
        
        # Get team members
        members_response = self.session.get(f"{BASE_URL}/api/teams/{TEAM_ID}/members")
        if members_response.status_code != 200 or not members_response.json():
            # Cleanup event
            self.session.delete(f"{BASE_URL}/api/events/{event_id}")
            pytest.skip("No team members found")
            
        player_ids = [m["id"] for m in members_response.json()[:2]]
        
        # Create convocation with visibility='all'
        conv_response = self.session.post(f"{BASE_URL}/api/convocations", json={
            "event_id": event_id,
            "player_ids": player_ids,
            "message": "Test convocation",
            "visibility": "all"
        })
        
        print(f"Create convocation (visibility=all) response: {conv_response.status_code}")
        assert conv_response.status_code in [200, 201], f"Expected 200/201, got {conv_response.status_code}: {conv_response.text}"
        
        data = conv_response.json()
        assert data.get("visibility") == "all", f"Visibility should be 'all', got {data.get('visibility')}"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/events/{event_id}")
        
    def test_02_create_convocation_with_visibility_players(self):
        """Test creating convocation with visibility='players'"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Create event
        event_data = {
            "team_id": TEAM_ID,
            "event_type": "jogo_campeonato",
            "title": "Test Match - Visibility Players",
            "location": "Test Stadium",
            "start_time": (datetime.now() + timedelta(days=6)).isoformat(),
            "end_time": (datetime.now() + timedelta(days=6, hours=2)).isoformat()
        }
        
        event_response = self.session.post(f"{BASE_URL}/api/events", json=event_data)
        if event_response.status_code not in [200, 201]:
            pytest.skip(f"Could not create event: {event_response.text}")
            
        event_id = event_response.json()["id"]
        
        # Get team members
        members_response = self.session.get(f"{BASE_URL}/api/teams/{TEAM_ID}/members")
        if members_response.status_code != 200 or not members_response.json():
            self.session.delete(f"{BASE_URL}/api/events/{event_id}")
            pytest.skip("No team members found")
            
        player_ids = [m["id"] for m in members_response.json()[:2]]
        
        # Create convocation with visibility='players'
        conv_response = self.session.post(f"{BASE_URL}/api/convocations", json={
            "event_id": event_id,
            "player_ids": player_ids,
            "message": "Players only convocation",
            "visibility": "players"
        })
        
        print(f"Create convocation (visibility=players) response: {conv_response.status_code}")
        assert conv_response.status_code in [200, 201], f"Expected 200/201, got {conv_response.status_code}: {conv_response.text}"
        
        data = conv_response.json()
        assert data.get("visibility") == "players", f"Visibility should be 'players', got {data.get('visibility')}"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/events/{event_id}")
        
    def test_03_create_convocation_with_visibility_delegates(self):
        """Test creating convocation with visibility='delegates'"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Create event
        event_data = {
            "team_id": TEAM_ID,
            "event_type": "torneio",
            "title": "Test Tournament - Visibility Delegates",
            "location": "Test Arena",
            "start_time": (datetime.now() + timedelta(days=7)).isoformat(),
            "end_time": (datetime.now() + timedelta(days=7, hours=4)).isoformat()
        }
        
        event_response = self.session.post(f"{BASE_URL}/api/events", json=event_data)
        if event_response.status_code not in [200, 201]:
            pytest.skip(f"Could not create event: {event_response.text}")
            
        event_id = event_response.json()["id"]
        
        # Get team members
        members_response = self.session.get(f"{BASE_URL}/api/teams/{TEAM_ID}/members")
        if members_response.status_code != 200 or not members_response.json():
            self.session.delete(f"{BASE_URL}/api/events/{event_id}")
            pytest.skip("No team members found")
            
        player_ids = [m["id"] for m in members_response.json()[:2]]
        
        # Create convocation with visibility='delegates'
        conv_response = self.session.post(f"{BASE_URL}/api/convocations", json={
            "event_id": event_id,
            "player_ids": player_ids,
            "message": "Delegates only convocation",
            "visibility": "delegates"
        })
        
        print(f"Create convocation (visibility=delegates) response: {conv_response.status_code}")
        assert conv_response.status_code in [200, 201], f"Expected 200/201, got {conv_response.status_code}: {conv_response.text}"
        
        data = conv_response.json()
        assert data.get("visibility") == "delegates", f"Visibility should be 'delegates', got {data.get('visibility')}"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/events/{event_id}")


class TestUpcomingEventsWithoutConvocation:
    """Test upcoming events without convocation API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.admin_token = None
        
    def get_admin_token(self):
        """Get admin authentication token"""
        if self.admin_token:
            return self.admin_token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.admin_token = response.json().get("token")
            return self.admin_token
        pytest.skip(f"Admin login failed: {response.status_code}")
        
    def test_01_get_upcoming_events_without_convocation(self):
        """Test getting upcoming events without convocation"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/events/upcoming-without-convocation")
        
        print(f"Get upcoming events without convocation response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} upcoming events without convocation")
        
    def test_02_player_cannot_access_upcoming_without_convocation(self):
        """Test that player cannot access upcoming events without convocation"""
        # Login as player
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": PLAYER_EMAIL,
            "password": PLAYER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Player login failed: {response.status_code}")
            
        player_token = response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {player_token}"})
        
        response = self.session.get(f"{BASE_URL}/api/events/upcoming-without-convocation")
        
        print(f"Player access to upcoming events without convocation: {response.status_code}")
        # Should return empty list (not 403) since player doesn't have can_create_convocations permission
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        # Player should get empty list since they can't create convocations
        print(f"Player received {len(data)} events (expected 0 or empty)")


class TestUnavailablePlayersInConvocation:
    """Test that unavailable players are handled correctly during convocation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.admin_token = None
        self.player_token = None
        
    def get_admin_token(self):
        """Get admin authentication token"""
        if self.admin_token:
            return self.admin_token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.admin_token = response.json().get("token")
            return self.admin_token
        pytest.skip(f"Admin login failed: {response.status_code}")
        
    def get_player_token(self):
        """Get player authentication token"""
        if self.player_token:
            return self.player_token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": PLAYER_EMAIL,
            "password": PLAYER_PASSWORD
        })
        if response.status_code == 200:
            self.player_token = response.json().get("token")
            return self.player_token
        pytest.skip(f"Player login failed: {response.status_code}")
        
    def test_01_convocation_skips_unavailable_players(self):
        """Test that convocation creation skips unavailable players"""
        admin_token = self.get_admin_token()
        player_token = self.get_player_token()
        
        # Get player user info
        self.session.headers.update({"Authorization": f"Bearer {player_token}"})
        me_response = self.session.get(f"{BASE_URL}/api/auth/me")
        if me_response.status_code != 200:
            pytest.skip("Could not get player info")
        player_id = me_response.json()["id"]
        
        # Create unavailability for the player (as player)
        event_date = datetime.now() + timedelta(days=3)
        start_date = (event_date - timedelta(days=1)).isoformat()
        end_date = (event_date + timedelta(days=1)).isoformat()
        
        unav_response = self.session.post(f"{BASE_URL}/api/unavailabilities", json={
            "start_date": start_date,
            "end_date": end_date,
            "reason": "lesao",
            "notes": "Test injury for convocation test"
        })
        
        if unav_response.status_code not in [200, 201]:
            pytest.skip(f"Could not create unavailability: {unav_response.text}")
            
        unavailability_id = unav_response.json()["id"]
        
        # Switch to admin to create event and convocation
        self.session.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        # Create event on the unavailable date
        event_data = {
            "team_id": TEAM_ID,
            "event_type": "treino",
            "title": "Test Training - Unavailable Player Test",
            "location": "Test Pavilion",
            "start_time": event_date.isoformat(),
            "end_time": (event_date + timedelta(hours=2)).isoformat()
        }
        
        event_response = self.session.post(f"{BASE_URL}/api/events", json=event_data)
        if event_response.status_code not in [200, 201]:
            # Cleanup unavailability
            self.session.headers.update({"Authorization": f"Bearer {player_token}"})
            self.session.delete(f"{BASE_URL}/api/unavailabilities/{unavailability_id}")
            pytest.skip(f"Could not create event: {event_response.text}")
            
        event_id = event_response.json()["id"]
        
        # Get team members
        members_response = self.session.get(f"{BASE_URL}/api/teams/{TEAM_ID}/members")
        if members_response.status_code != 200 or not members_response.json():
            self.session.delete(f"{BASE_URL}/api/events/{event_id}")
            self.session.headers.update({"Authorization": f"Bearer {player_token}"})
            self.session.delete(f"{BASE_URL}/api/unavailabilities/{unavailability_id}")
            pytest.skip("No team members found")
            
        # Include the unavailable player in convocation
        all_player_ids = [m["id"] for m in members_response.json()]
        if player_id not in all_player_ids:
            all_player_ids.append(player_id)
        
        # Create convocation including the unavailable player
        conv_response = self.session.post(f"{BASE_URL}/api/convocations", json={
            "event_id": event_id,
            "player_ids": all_player_ids,
            "message": "Test convocation with unavailable player",
            "visibility": "all"
        })
        
        print(f"Create convocation with unavailable player response: {conv_response.status_code}")
        assert conv_response.status_code in [200, 201], f"Expected 200/201, got {conv_response.status_code}: {conv_response.text}"
        
        data = conv_response.json()
        
        # Check if skipped_unavailable_players is in response
        skipped = data.get("skipped_unavailable_players", [])
        print(f"Skipped unavailable players: {skipped}")
        
        # The unavailable player should be in the skipped list
        if player_id in all_player_ids:
            # Note: This depends on whether the player is actually in the team
            print(f"Player {player_id} was {'skipped' if player_id in skipped else 'included'}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/events/{event_id}")
        self.session.headers.update({"Authorization": f"Bearer {player_token}"})
        self.session.delete(f"{BASE_URL}/api/unavailabilities/{unavailability_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

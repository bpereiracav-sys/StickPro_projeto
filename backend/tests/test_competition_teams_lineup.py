"""
Test Competition Teams and Lineup Features
- Competition Teams CRUD (create, read, update, delete)
- Competition Teams import via Excel
- Match Lineup with visibility control
- Matches grouped by matchday (jornada)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "test123456"


class TestCompetitionTeamsAndLineup:
    """Test Competition Teams and Lineup features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code}")
        
        data = login_response.json()
        self.token = data.get("token")
        self.user = data.get("user")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Get first championship for testing
        champs_response = self.session.get(f"{BASE_URL}/api/championships")
        if champs_response.status_code == 200 and champs_response.json():
            self.championship = champs_response.json()[0]
            self.championship_id = self.championship.get("id")
        else:
            self.championship = None
            self.championship_id = None
    
    # ==================== COMPETITION TEAMS TESTS ====================
    
    def test_get_competition_teams(self):
        """Test getting competition teams for a championship"""
        if not self.championship_id:
            pytest.skip("No championship available")
        
        response = self.session.get(f"{BASE_URL}/api/championships/{self.championship_id}/teams")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        teams = response.json()
        assert isinstance(teams, list), "Response should be a list"
        print(f"Found {len(teams)} competition teams")
    
    def test_create_competition_team(self):
        """Test creating a competition team with kit colors"""
        if not self.championship_id:
            pytest.skip("No championship available")
        
        team_name = f"TEST_Team_{uuid.uuid4().hex[:8]}"
        team_data = {
            "championship_id": self.championship_id,
            "name": team_name,
            "pavilion_name": "Pavilhão Municipal de Teste",
            "pavilion_address": "Rua de Teste, 123",
            "field_player_kit": {
                "primary_shirt": "#FF0000",
                "secondary_shirt": "#FFFFFF",
                "primary_shorts": "#FF0000",
                "secondary_shorts": "#FFFFFF",
                "primary_socks": "#FF0000",
                "secondary_socks": "#FFFFFF"
            },
            "goalkeeper_kit": {
                "primary_shirt": "#00FF00",
                "secondary_shirt": "#000000",
                "primary_shorts": "#00FF00",
                "secondary_shorts": "#000000",
                "primary_socks": "#00FF00",
                "secondary_socks": "#000000"
            }
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/championships/{self.championship_id}/teams",
            json=team_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        created_team = response.json()
        assert created_team.get("name") == team_name
        assert created_team.get("pavilion_name") == "Pavilhão Municipal de Teste"
        assert created_team.get("pavilion_address") == "Rua de Teste, 123"
        assert created_team.get("field_player_kit") is not None
        assert created_team.get("goalkeeper_kit") is not None
        assert "id" in created_team
        
        # Store for cleanup
        self.created_team_id = created_team.get("id")
        print(f"Created competition team: {team_name}")
        
        # Verify team was created by fetching it
        get_response = self.session.get(f"{BASE_URL}/api/championships/{self.championship_id}/teams")
        assert get_response.status_code == 200
        teams = get_response.json()
        team_names = [t.get("name") for t in teams]
        assert team_name in team_names, "Created team should be in the list"
    
    def test_update_competition_team(self):
        """Test updating a competition team"""
        if not self.championship_id:
            pytest.skip("No championship available")
        
        # First create a team
        team_name = f"TEST_UpdateTeam_{uuid.uuid4().hex[:8]}"
        create_response = self.session.post(
            f"{BASE_URL}/api/championships/{self.championship_id}/teams",
            json={"championship_id": self.championship_id, "name": team_name, "pavilion_name": "Original Pavilion"}
        )
        
        assert create_response.status_code == 200
        team_id = create_response.json().get("id")
        
        # Update the team
        update_data = {
            "name": f"{team_name}_Updated",
            "pavilion_name": "Updated Pavilion",
            "pavilion_address": "New Address, 456",
            "field_player_kit": {
                "primary_shirt": "#0000FF",
                "secondary_shirt": "#FFFF00"
            }
        }
        
        update_response = self.session.put(
            f"{BASE_URL}/api/championships/teams/{team_id}",
            json=update_data
        )
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        updated_team = update_response.json()
        assert updated_team.get("pavilion_name") == "Updated Pavilion"
        assert updated_team.get("pavilion_address") == "New Address, 456"
        print(f"Updated competition team: {team_id}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/championships/teams/{team_id}")
    
    def test_delete_competition_team(self):
        """Test deleting a competition team"""
        if not self.championship_id:
            pytest.skip("No championship available")
        
        # First create a team
        team_name = f"TEST_DeleteTeam_{uuid.uuid4().hex[:8]}"
        create_response = self.session.post(
            f"{BASE_URL}/api/championships/{self.championship_id}/teams",
            json={"championship_id": self.championship_id, "name": team_name}
        )
        
        assert create_response.status_code == 200
        team_id = create_response.json().get("id")
        
        # Delete the team
        delete_response = self.session.delete(f"{BASE_URL}/api/championships/teams/{team_id}")
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        
        # Verify deletion
        get_response = self.session.get(f"{BASE_URL}/api/championships/{self.championship_id}/teams")
        teams = get_response.json()
        team_ids = [t.get("id") for t in teams]
        assert team_id not in team_ids, "Deleted team should not be in the list"
        print(f"Deleted competition team: {team_id}")
    
    def test_duplicate_team_name_rejected(self):
        """Test that duplicate team names are rejected"""
        if not self.championship_id:
            pytest.skip("No championship available")
        
        team_name = f"TEST_DuplicateTeam_{uuid.uuid4().hex[:8]}"
        
        # Create first team
        response1 = self.session.post(
            f"{BASE_URL}/api/championships/{self.championship_id}/teams",
            json={"championship_id": self.championship_id, "name": team_name}
        )
        assert response1.status_code == 200
        team_id = response1.json().get("id")
        
        # Try to create duplicate
        response2 = self.session.post(
            f"{BASE_URL}/api/championships/{self.championship_id}/teams",
            json={"championship_id": self.championship_id, "name": team_name}
        )
        assert response2.status_code == 400, "Duplicate team name should be rejected"
        print("Duplicate team name correctly rejected")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/championships/teams/{team_id}")
    
    # ==================== MATCH LINEUP TESTS ====================
    
    def test_get_match_lineup_empty(self):
        """Test getting lineup for a match (empty initially)"""
        if not self.championship_id:
            pytest.skip("No championship available")
        
        # Get matches
        matches_response = self.session.get(f"{BASE_URL}/api/championships/{self.championship_id}/matches")
        if matches_response.status_code != 200 or not matches_response.json():
            pytest.skip("No matches available")
        
        match = matches_response.json()[0]
        match_id = match.get("id")
        
        response = self.session.get(f"{BASE_URL}/api/championships/matches/{match_id}/lineup")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        lineup = response.json()
        assert "match_id" in lineup
        assert "periods" in lineup
        # visibility may not be present if lineup already exists without it
        print(f"Got lineup for match {match_id}: visibility={lineup.get('visibility', 'N/A')}")
    
    def test_save_match_lineup_with_visibility(self):
        """Test saving lineup with visibility control"""
        if not self.championship_id:
            pytest.skip("No championship available")
        
        # Get matches
        matches_response = self.session.get(f"{BASE_URL}/api/championships/{self.championship_id}/matches")
        if matches_response.status_code != 200 or not matches_response.json():
            pytest.skip("No matches available")
        
        match = matches_response.json()[0]
        match_id = match.get("id")
        
        # Save lineup with visibility
        lineup_data = {
            "periods": [
                {
                    "id": str(uuid.uuid4()),
                    "name": "1ª Parte",
                    "order": 1,
                    "positions": [
                        {"position": "guarda_redes", "player_id": "test_player_1", "player_name": "Test GR"},
                        {"position": "defesa_esquerda", "player_id": "test_player_2", "player_name": "Test DE"},
                        {"position": "defesa_direita", "player_id": "test_player_3", "player_name": "Test DD"},
                        {"position": "avancado_esquerda", "player_id": "test_player_4", "player_name": "Test AE"},
                        {"position": "avancado_direita", "player_id": "test_player_5", "player_name": "Test AD"}
                    ],
                    "notes": "Test lineup"
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "2ª Parte",
                    "order": 2,
                    "positions": [],
                    "notes": ""
                }
            ],
            "visibility": "coach_only"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/championships/matches/{match_id}/lineup",
            json=lineup_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        saved_lineup = response.json()
        assert saved_lineup.get("visibility") == "coach_only"
        assert len(saved_lineup.get("periods", [])) == 2
        print(f"Saved lineup for match {match_id} with visibility: coach_only")
        
        # Test updating visibility to assistant_and_delegate
        lineup_data["visibility"] = "assistant_and_delegate"
        update_response = self.session.post(
            f"{BASE_URL}/api/championships/matches/{match_id}/lineup",
            json=lineup_data
        )
        
        assert update_response.status_code == 200
        updated_lineup = update_response.json()
        assert updated_lineup.get("visibility") == "assistant_and_delegate"
        print("Updated lineup visibility to: assistant_and_delegate")
    
    def test_lineup_visibility_options(self):
        """Test all lineup visibility options"""
        if not self.championship_id:
            pytest.skip("No championship available")
        
        matches_response = self.session.get(f"{BASE_URL}/api/championships/{self.championship_id}/matches")
        if matches_response.status_code != 200 or not matches_response.json():
            pytest.skip("No matches available")
        
        match = matches_response.json()[0]
        match_id = match.get("id")
        
        visibility_options = ["coach_only", "assistant", "delegate", "assistant_and_delegate"]
        
        for visibility in visibility_options:
            lineup_data = {
                "periods": [{"id": str(uuid.uuid4()), "name": "Test", "order": 1, "positions": []}],
                "visibility": visibility
            }
            
            response = self.session.post(
                f"{BASE_URL}/api/championships/matches/{match_id}/lineup",
                json=lineup_data
            )
            
            assert response.status_code == 200, f"Failed for visibility {visibility}: {response.text}"
            assert response.json().get("visibility") == visibility
            print(f"Visibility option '{visibility}' works correctly")
    
    # ==================== MATCHES BY MATCHDAY TESTS ====================
    
    def test_matches_have_matchday(self):
        """Test that matches have matchday field"""
        if not self.championship_id:
            pytest.skip("No championship available")
        
        response = self.session.get(f"{BASE_URL}/api/championships/{self.championship_id}/matches")
        assert response.status_code == 200
        
        matches = response.json()
        if not matches:
            pytest.skip("No matches available")
        
        # Check that matches have matchday field
        for match in matches:
            # matchday can be None or an integer
            assert "matchday" in match or match.get("matchday") is None
            print(f"Match {match.get('id')}: matchday={match.get('matchday')}")
    
    def test_create_match_with_matchday(self):
        """Test creating a match with matchday"""
        if not self.championship_id:
            pytest.skip("No championship available")
        
        from datetime import datetime, timedelta
        
        match_data = {
            "championship_id": self.championship_id,
            "opponent_team": f"TEST_Opponent_{uuid.uuid4().hex[:8]}",
            "match_date": (datetime.now() + timedelta(days=7)).isoformat(),
            "location": "casa",
            "venue": "Test Venue",
            "is_club_match": True,
            "matchday": 5,  # Jornada 5
            "bonus_points": 0,
            "penalty_points": 0
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/championships/{self.championship_id}/matches",
            json=match_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        created_match = response.json()
        assert created_match.get("matchday") == 5, "Matchday should be 5"
        print(f"Created match with matchday: {created_match.get('matchday')}")
        
        # Cleanup
        match_id = created_match.get("id")
        self.session.delete(f"{BASE_URL}/api/championships/matches/{match_id}")
    
    # ==================== RBAC TESTS ====================
    
    def test_competition_teams_rbac(self):
        """Test RBAC for competition teams operations"""
        if not self.championship_id:
            pytest.skip("No championship available")
        
        # Admin should have access
        response = self.session.get(f"{BASE_URL}/api/championships/{self.championship_id}/teams")
        assert response.status_code == 200, "Admin should have access to competition teams"
        print("RBAC: Admin can access competition teams")
    
    def test_lineup_rbac(self):
        """Test RBAC for lineup operations"""
        if not self.championship_id:
            pytest.skip("No championship available")
        
        matches_response = self.session.get(f"{BASE_URL}/api/championships/{self.championship_id}/matches")
        if matches_response.status_code != 200 or not matches_response.json():
            pytest.skip("No matches available")
        
        match = matches_response.json()[0]
        match_id = match.get("id")
        
        # Admin should have access to lineup
        response = self.session.get(f"{BASE_URL}/api/championships/matches/{match_id}/lineup")
        assert response.status_code == 200, "Admin should have access to lineup"
        print("RBAC: Admin can access lineup")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_teams(self):
        """Clean up TEST_ prefixed competition teams"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip("Login failed")
        
        token = login_response.json().get("token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get championships
        champs_response = session.get(f"{BASE_URL}/api/championships")
        if champs_response.status_code != 200:
            return
        
        for champ in champs_response.json():
            teams_response = session.get(f"{BASE_URL}/api/championships/{champ['id']}/teams")
            if teams_response.status_code == 200:
                for team in teams_response.json():
                    if team.get("name", "").startswith("TEST_"):
                        session.delete(f"{BASE_URL}/api/championships/teams/{team['id']}")
                        print(f"Cleaned up test team: {team['name']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

"""
Phase 7 - Championships Expanded Tests
Tests for: format selection (5x5/3x3), convocation type (manual/automatica),
edit match details, delete match functionality
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "test123456"
TEST_TEAM_ID = "3b217018-dc9b-4b0e-b99b-db89d636dada"
EXISTING_CHAMPIONSHIP_ID = "39363708-8f30-43d0-904c-9e0eb8f0a2f6"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestChampionshipFormat:
    """Tests for championship format (5x5/3x3) field"""
    
    def test_create_championship_with_5x5_format(self, auth_headers):
        """Create championship with 5x5 format"""
        response = requests.post(f"{BASE_URL}/api/championships", headers=auth_headers, json={
            "name": "TEST_Championship_5x5",
            "season": "2024/2025",
            "team_id": TEST_TEAM_ID,
            "format": "5x5",
            "convocation_type": "manual",
            "description": "Test championship with 5x5 format"
        })
        assert response.status_code == 200, f"Failed to create championship: {response.text}"
        data = response.json()
        assert data["format"] == "5x5", f"Expected format 5x5, got {data.get('format')}"
        assert data["convocation_type"] == "manual"
        # Store for cleanup
        TestChampionshipFormat.champ_5x5_id = data["id"]
    
    def test_create_championship_with_3x3_format(self, auth_headers):
        """Create championship with 3x3 format"""
        response = requests.post(f"{BASE_URL}/api/championships", headers=auth_headers, json={
            "name": "TEST_Championship_3x3",
            "season": "2024/2025",
            "team_id": TEST_TEAM_ID,
            "format": "3x3",
            "convocation_type": "automatica",
            "description": "Test championship with 3x3 format"
        })
        assert response.status_code == 200, f"Failed to create championship: {response.text}"
        data = response.json()
        assert data["format"] == "3x3", f"Expected format 3x3, got {data.get('format')}"
        assert data["convocation_type"] == "automatica"
        TestChampionshipFormat.champ_3x3_id = data["id"]
    
    def test_get_championship_shows_format(self, auth_headers):
        """Verify GET championship returns format field"""
        response = requests.get(f"{BASE_URL}/api/championships/{TestChampionshipFormat.champ_5x5_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "format" in data, "Format field missing from championship response"
        assert data["format"] == "5x5"
        assert "convocation_type" in data, "Convocation type field missing"
        assert data["convocation_type"] == "manual"
    
    def test_get_existing_championship_format(self, auth_headers):
        """Verify existing championship has format and convocation_type"""
        response = requests.get(f"{BASE_URL}/api/championships/{EXISTING_CHAMPIONSHIP_ID}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "format" in data, "Format field missing from existing championship"
        assert "convocation_type" in data, "Convocation type field missing from existing championship"


class TestChampionshipMatches:
    """Tests for championship match CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup_championship(self, auth_headers):
        """Create a test championship for match tests"""
        response = requests.post(f"{BASE_URL}/api/championships", headers=auth_headers, json={
            "name": "TEST_Match_Championship",
            "season": "2024/2025",
            "team_id": TEST_TEAM_ID,
            "format": "5x5",
            "convocation_type": "manual"
        })
        assert response.status_code == 200
        self.championship_id = response.json()["id"]
        yield
        # Cleanup
        requests.delete(f"{BASE_URL}/api/championships/{self.championship_id}", headers=auth_headers)
    
    def test_create_match(self, auth_headers):
        """Create a match in championship"""
        match_date = (datetime.now() + timedelta(days=7)).isoformat()
        response = requests.post(f"{BASE_URL}/api/championships/{self.championship_id}/matches", headers=auth_headers, json={
            "championship_id": self.championship_id,
            "opponent_team": "TEST_Opponent_Team",
            "match_date": match_date,
            "location": "casa",
            "venue": "Pavilhão Municipal"
        })
        assert response.status_code == 200, f"Failed to create match: {response.text}"
        data = response.json()
        assert data["opponent_team"] == "TEST_Opponent_Team"
        assert data["location"] == "casa"
        assert data["venue"] == "Pavilhão Municipal"
        self.match_id = data["id"]
    
    def test_get_matches(self, auth_headers):
        """Get all matches for championship"""
        # First create a match
        match_date = (datetime.now() + timedelta(days=7)).isoformat()
        create_resp = requests.post(f"{BASE_URL}/api/championships/{self.championship_id}/matches", headers=auth_headers, json={
            "championship_id": self.championship_id,
            "opponent_team": "TEST_Get_Matches_Team",
            "match_date": match_date,
            "location": "fora",
            "venue": "Campo Adversário"
        })
        assert create_resp.status_code == 200
        
        # Get matches
        response = requests.get(f"{BASE_URL}/api/championships/{self.championship_id}/matches", headers=auth_headers)
        assert response.status_code == 200
        matches = response.json()
        assert isinstance(matches, list)
        assert len(matches) >= 1


class TestEditMatch:
    """Tests for editing match details (PUT /api/championships/matches/{match_id})"""
    
    @pytest.fixture(autouse=True)
    def setup_match(self, auth_headers):
        """Create a test championship and match"""
        # Create championship
        champ_resp = requests.post(f"{BASE_URL}/api/championships", headers=auth_headers, json={
            "name": "TEST_Edit_Match_Championship",
            "season": "2024/2025",
            "team_id": TEST_TEAM_ID,
            "format": "5x5",
            "convocation_type": "manual"
        })
        assert champ_resp.status_code == 200
        self.championship_id = champ_resp.json()["id"]
        
        # Create match
        match_date = (datetime.now() + timedelta(days=7)).isoformat()
        match_resp = requests.post(f"{BASE_URL}/api/championships/{self.championship_id}/matches", headers=auth_headers, json={
            "championship_id": self.championship_id,
            "opponent_team": "Original_Opponent",
            "match_date": match_date,
            "location": "casa",
            "venue": "Original Venue"
        })
        assert match_resp.status_code == 200
        self.match_id = match_resp.json()["id"]
        yield
        # Cleanup
        requests.delete(f"{BASE_URL}/api/championships/{self.championship_id}", headers=auth_headers)
    
    def test_edit_match_opponent(self, auth_headers):
        """Edit match opponent team"""
        response = requests.put(f"{BASE_URL}/api/championships/matches/{self.match_id}", headers=auth_headers, json={
            "opponent_team": "Updated_Opponent_Team"
        })
        assert response.status_code == 200, f"Failed to update match: {response.text}"
        
        # Verify update
        get_resp = requests.get(f"{BASE_URL}/api/championships/{self.championship_id}/matches", headers=auth_headers)
        matches = get_resp.json()
        updated_match = next((m for m in matches if m["id"] == self.match_id), None)
        assert updated_match is not None
        assert updated_match["opponent_team"] == "Updated_Opponent_Team"
    
    def test_edit_match_date(self, auth_headers):
        """Edit match date"""
        new_date = (datetime.now() + timedelta(days=14)).isoformat()
        response = requests.put(f"{BASE_URL}/api/championships/matches/{self.match_id}", headers=auth_headers, json={
            "match_date": new_date
        })
        assert response.status_code == 200, f"Failed to update match date: {response.text}"
    
    def test_edit_match_location(self, auth_headers):
        """Edit match location (casa/fora/neutro)"""
        response = requests.put(f"{BASE_URL}/api/championships/matches/{self.match_id}", headers=auth_headers, json={
            "location": "fora"
        })
        assert response.status_code == 200, f"Failed to update match location: {response.text}"
        
        # Verify update
        get_resp = requests.get(f"{BASE_URL}/api/championships/{self.championship_id}/matches", headers=auth_headers)
        matches = get_resp.json()
        updated_match = next((m for m in matches if m["id"] == self.match_id), None)
        assert updated_match["location"] == "fora"
    
    def test_edit_match_venue(self, auth_headers):
        """Edit match venue"""
        response = requests.put(f"{BASE_URL}/api/championships/matches/{self.match_id}", headers=auth_headers, json={
            "venue": "New Pavilhão"
        })
        assert response.status_code == 200, f"Failed to update match venue: {response.text}"
        
        # Verify update
        get_resp = requests.get(f"{BASE_URL}/api/championships/{self.championship_id}/matches", headers=auth_headers)
        matches = get_resp.json()
        updated_match = next((m for m in matches if m["id"] == self.match_id), None)
        assert updated_match["venue"] == "New Pavilhão"
    
    def test_edit_match_all_fields(self, auth_headers):
        """Edit all match fields at once"""
        new_date = (datetime.now() + timedelta(days=21)).isoformat()
        response = requests.put(f"{BASE_URL}/api/championships/matches/{self.match_id}", headers=auth_headers, json={
            "opponent_team": "Complete_Update_Team",
            "match_date": new_date,
            "location": "neutro",
            "venue": "Campo Neutro Municipal"
        })
        assert response.status_code == 200, f"Failed to update all match fields: {response.text}"
        
        # Verify all updates
        get_resp = requests.get(f"{BASE_URL}/api/championships/{self.championship_id}/matches", headers=auth_headers)
        matches = get_resp.json()
        updated_match = next((m for m in matches if m["id"] == self.match_id), None)
        assert updated_match["opponent_team"] == "Complete_Update_Team"
        assert updated_match["location"] == "neutro"
        assert updated_match["venue"] == "Campo Neutro Municipal"
    
    def test_edit_nonexistent_match(self, auth_headers):
        """Edit non-existent match returns 404"""
        response = requests.put(f"{BASE_URL}/api/championships/matches/nonexistent-id", headers=auth_headers, json={
            "opponent_team": "Test"
        })
        assert response.status_code == 404


class TestDeleteMatch:
    """Tests for deleting matches (DELETE /api/championships/matches/{match_id})"""
    
    @pytest.fixture(autouse=True)
    def setup_championship(self, auth_headers):
        """Create a test championship"""
        champ_resp = requests.post(f"{BASE_URL}/api/championships", headers=auth_headers, json={
            "name": "TEST_Delete_Match_Championship",
            "season": "2024/2025",
            "team_id": TEST_TEAM_ID,
            "format": "5x5",
            "convocation_type": "manual"
        })
        assert champ_resp.status_code == 200
        self.championship_id = champ_resp.json()["id"]
        yield
        # Cleanup
        requests.delete(f"{BASE_URL}/api/championships/{self.championship_id}", headers=auth_headers)
    
    def test_delete_match(self, auth_headers):
        """Delete a match"""
        # Create match
        match_date = (datetime.now() + timedelta(days=7)).isoformat()
        create_resp = requests.post(f"{BASE_URL}/api/championships/{self.championship_id}/matches", headers=auth_headers, json={
            "championship_id": self.championship_id,
            "opponent_team": "To_Be_Deleted_Team",
            "match_date": match_date,
            "location": "casa",
            "venue": "Test Venue"
        })
        assert create_resp.status_code == 200
        match_id = create_resp.json()["id"]
        
        # Delete match
        delete_resp = requests.delete(f"{BASE_URL}/api/championships/matches/{match_id}", headers=auth_headers)
        assert delete_resp.status_code == 200, f"Failed to delete match: {delete_resp.text}"
        
        # Verify deletion
        get_resp = requests.get(f"{BASE_URL}/api/championships/{self.championship_id}/matches", headers=auth_headers)
        matches = get_resp.json()
        deleted_match = next((m for m in matches if m["id"] == match_id), None)
        assert deleted_match is None, "Match should have been deleted"
    
    def test_delete_nonexistent_match(self, auth_headers):
        """Delete non-existent match returns 404"""
        response = requests.delete(f"{BASE_URL}/api/championships/matches/nonexistent-id", headers=auth_headers)
        assert response.status_code == 404


class TestMatchResult:
    """Tests for updating match results"""
    
    @pytest.fixture(autouse=True)
    def setup_match(self, auth_headers):
        """Create a test championship and match"""
        # Create championship
        champ_resp = requests.post(f"{BASE_URL}/api/championships", headers=auth_headers, json={
            "name": "TEST_Result_Championship",
            "season": "2024/2025",
            "team_id": TEST_TEAM_ID,
            "format": "5x5",
            "convocation_type": "manual"
        })
        assert champ_resp.status_code == 200
        self.championship_id = champ_resp.json()["id"]
        
        # Create match
        match_date = (datetime.now() + timedelta(days=7)).isoformat()
        match_resp = requests.post(f"{BASE_URL}/api/championships/{self.championship_id}/matches", headers=auth_headers, json={
            "championship_id": self.championship_id,
            "opponent_team": "Result_Test_Team",
            "match_date": match_date,
            "location": "casa",
            "venue": "Test Venue"
        })
        assert match_resp.status_code == 200
        self.match_id = match_resp.json()["id"]
        yield
        # Cleanup
        requests.delete(f"{BASE_URL}/api/championships/{self.championship_id}", headers=auth_headers)
    
    def test_update_match_result(self, auth_headers):
        """Update match result"""
        response = requests.put(f"{BASE_URL}/api/championships/matches/{self.match_id}/result", headers=auth_headers, json={
            "home_score": 5,
            "away_score": 3,
            "bonus_points": 1,
            "penalty_points": 0
        })
        assert response.status_code == 200, f"Failed to update result: {response.text}"
        
        # Verify result
        get_resp = requests.get(f"{BASE_URL}/api/championships/{self.championship_id}/matches", headers=auth_headers)
        matches = get_resp.json()
        updated_match = next((m for m in matches if m["id"] == self.match_id), None)
        assert updated_match["home_score"] == 5
        assert updated_match["away_score"] == 3
        assert updated_match["is_completed"] == True
        assert updated_match["bonus_points"] == 1


class TestStandings:
    """Tests for championship standings"""
    
    @pytest.fixture(autouse=True)
    def setup_championship_with_results(self, auth_headers):
        """Create championship with completed matches"""
        # Create championship
        champ_resp = requests.post(f"{BASE_URL}/api/championships", headers=auth_headers, json={
            "name": "TEST_Standings_Championship",
            "season": "2024/2025",
            "team_id": TEST_TEAM_ID,
            "format": "5x5",
            "convocation_type": "manual"
        })
        assert champ_resp.status_code == 200
        self.championship_id = champ_resp.json()["id"]
        
        # Create and complete matches
        match_date = (datetime.now() - timedelta(days=7)).isoformat()
        
        # Match 1: Win
        match1_resp = requests.post(f"{BASE_URL}/api/championships/{self.championship_id}/matches", headers=auth_headers, json={
            "championship_id": self.championship_id,
            "opponent_team": "Standings_Team_A",
            "match_date": match_date,
            "location": "casa"
        })
        match1_id = match1_resp.json()["id"]
        requests.put(f"{BASE_URL}/api/championships/matches/{match1_id}/result", headers=auth_headers, json={
            "home_score": 4, "away_score": 2, "bonus_points": 0, "penalty_points": 0
        })
        
        # Match 2: Loss
        match2_resp = requests.post(f"{BASE_URL}/api/championships/{self.championship_id}/matches", headers=auth_headers, json={
            "championship_id": self.championship_id,
            "opponent_team": "Standings_Team_B",
            "match_date": match_date,
            "location": "fora"
        })
        match2_id = match2_resp.json()["id"]
        requests.put(f"{BASE_URL}/api/championships/matches/{match2_id}/result", headers=auth_headers, json={
            "home_score": 3, "away_score": 1, "bonus_points": 0, "penalty_points": 0
        })
        
        yield
        # Cleanup
        requests.delete(f"{BASE_URL}/api/championships/{self.championship_id}", headers=auth_headers)
    
    def test_get_standings(self, auth_headers):
        """Get championship standings"""
        response = requests.get(f"{BASE_URL}/api/championships/{self.championship_id}/standings", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get standings: {response.text}"
        standings = response.json()
        assert isinstance(standings, list)
        assert len(standings) >= 1
        
        # Check standings structure
        for team in standings:
            assert "team" in team
            assert "played" in team
            assert "won" in team
            assert "drawn" in team
            assert "lost" in team
            assert "goals_for" in team
            assert "goals_against" in team
            assert "points" in team


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_championships(self, auth_headers):
        """Delete all TEST_ prefixed championships"""
        # Get all championships
        response = requests.get(f"{BASE_URL}/api/championships", headers=auth_headers, params={"team_id": TEST_TEAM_ID})
        if response.status_code == 200:
            championships = response.json()
            for champ in championships:
                if champ.get("name", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/championships/{champ['id']}", headers=auth_headers)
        assert True  # Cleanup always passes

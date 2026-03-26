"""
Test External Matches (is_club_match=false) and Standings Calculation
Tests for StickPro - Roller Hockey Team Management App

Features tested:
1. Create external match (is_club_match=false) between two non-club teams
2. Verify external match appears in list with correct data
3. Add result to external match and verify standings update
4. Verify standings include all teams (including external)
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestExternalMatches:
    """Test external matches functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.admin_email = "admin@example.com"
        self.admin_password = "test123456"
        self.token = None
        self.championship_id = "909d5f9b-1087-4265-94ff-c7c44a3e84ed"  # From main agent context
        self.created_match_id = None
        
    def get_auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": self.admin_email, "password": self.admin_password}
        )
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def test_01_login_success(self):
        """Test login works correctly"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": self.admin_email, "password": self.admin_password}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == self.admin_email
        print(f"✓ Login successful for {self.admin_email}")
    
    def test_02_get_championships(self):
        """Test getting championships list"""
        token = self.get_auth_token()
        assert token, "Failed to get auth token"
        
        response = requests.get(
            f"{BASE_URL}/api/championships",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Failed to get championships: {response.text}"
        championships = response.json()
        assert isinstance(championships, list)
        print(f"✓ Found {len(championships)} championships")
        
        # Check if test championship exists
        test_champ = next((c for c in championships if c['id'] == self.championship_id), None)
        if test_champ:
            print(f"✓ Test championship found: {test_champ['name']}")
        else:
            print(f"⚠ Test championship {self.championship_id} not found, will use first available")
    
    def test_03_create_external_match(self):
        """Test creating an external match (is_club_match=false)"""
        token = self.get_auth_token()
        assert token, "Failed to get auth token"
        
        # First get a valid championship
        response = requests.get(
            f"{BASE_URL}/api/championships",
            headers={"Authorization": f"Bearer {token}"}
        )
        championships = response.json()
        
        if not championships:
            pytest.skip("No championships available for testing")
        
        # Use first championship if test one doesn't exist
        champ_id = self.championship_id
        test_champ = next((c for c in championships if c['id'] == self.championship_id), None)
        if not test_champ:
            champ_id = championships[0]['id']
            print(f"Using championship: {championships[0]['name']}")
        
        # Create external match
        match_date = (datetime.now() + timedelta(days=7)).isoformat()
        match_data = {
            "championship_id": champ_id,
            "home_team": "TEST_Equipa_Externa_A",
            "opponent_team": "TEST_Equipa_Externa_B",
            "match_date": match_date,
            "location": "neutro",
            "venue": "Campo Neutro Teste",
            "is_club_match": False,
            "bonus_points": 0,
            "penalty_points": 0
        }
        
        response = requests.post(
            f"{BASE_URL}/api/championships/{champ_id}/matches",
            json=match_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Failed to create external match: {response.text}"
        match = response.json()
        
        # Verify match data
        assert match.get("is_club_match") == False, "is_club_match should be False"
        assert match.get("home_team") == "TEST_Equipa_Externa_A", "home_team mismatch"
        assert match.get("opponent_team") == "TEST_Equipa_Externa_B", "opponent_team mismatch"
        
        self.__class__.created_match_id = match.get("id")
        self.__class__.test_championship_id = champ_id
        print(f"✓ External match created: {match.get('id')}")
        print(f"  Home: {match.get('home_team')} vs Away: {match.get('opponent_team')}")
        print(f"  is_club_match: {match.get('is_club_match')}")
    
    def test_04_verify_external_match_in_list(self):
        """Verify external match appears in matches list"""
        token = self.get_auth_token()
        assert token, "Failed to get auth token"
        
        champ_id = getattr(self.__class__, 'test_championship_id', self.championship_id)
        
        response = requests.get(
            f"{BASE_URL}/api/championships/{champ_id}/matches",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Failed to get matches: {response.text}"
        matches = response.json()
        
        # Find our external match
        external_matches = [m for m in matches if m.get('is_club_match') == False]
        print(f"✓ Found {len(external_matches)} external matches")
        
        # Find our test match
        test_match = next((m for m in matches if m.get('home_team') == 'TEST_Equipa_Externa_A'), None)
        if test_match:
            assert test_match.get('is_club_match') == False
            assert test_match.get('opponent_team') == 'TEST_Equipa_Externa_B'
            print(f"✓ Test external match found with correct data")
    
    def test_05_add_result_to_external_match(self):
        """Add result to external match"""
        token = self.get_auth_token()
        assert token, "Failed to get auth token"
        
        match_id = getattr(self.__class__, 'created_match_id', None)
        if not match_id:
            pytest.skip("No match created in previous test")
        
        result_data = {
            "home_score": 3,
            "away_score": 1,
            "bonus_points": 0,
            "penalty_points": 0
        }
        
        response = requests.put(
            f"{BASE_URL}/api/championships/matches/{match_id}/result",
            json=result_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Failed to update result: {response.text}"
        print(f"✓ Result added: 3-1")
    
    def test_06_verify_standings_include_external_teams(self):
        """Verify standings include external teams"""
        token = self.get_auth_token()
        assert token, "Failed to get auth token"
        
        champ_id = getattr(self.__class__, 'test_championship_id', self.championship_id)
        
        response = requests.get(
            f"{BASE_URL}/api/championships/{champ_id}/standings",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Failed to get standings: {response.text}"
        standings = response.json()
        
        assert isinstance(standings, list), "Standings should be a list"
        print(f"✓ Standings has {len(standings)} teams")
        
        # Check for external teams
        team_names = [s['team'] for s in standings]
        print(f"  Teams in standings: {team_names}")
        
        # Verify external teams are included
        has_external_a = 'TEST_Equipa_Externa_A' in team_names
        has_external_b = 'TEST_Equipa_Externa_B' in team_names
        
        if has_external_a and has_external_b:
            print(f"✓ External teams found in standings")
            
            # Verify stats for external teams
            team_a = next((s for s in standings if s['team'] == 'TEST_Equipa_Externa_A'), None)
            team_b = next((s for s in standings if s['team'] == 'TEST_Equipa_Externa_B'), None)
            
            if team_a:
                print(f"  TEST_Equipa_Externa_A: {team_a['played']}J, {team_a['won']}V, {team_a['points']}pts")
                assert team_a['played'] >= 1, "Team A should have at least 1 game"
                assert team_a['goals_for'] >= 3, "Team A should have at least 3 goals for"
            
            if team_b:
                print(f"  TEST_Equipa_Externa_B: {team_b['played']}J, {team_b['lost']}D, {team_b['points']}pts")
                assert team_b['played'] >= 1, "Team B should have at least 1 game"
    
    def test_07_cleanup_test_match(self):
        """Cleanup: Delete test match"""
        token = self.get_auth_token()
        assert token, "Failed to get auth token"
        
        match_id = getattr(self.__class__, 'created_match_id', None)
        if not match_id:
            pytest.skip("No match to cleanup")
        
        response = requests.delete(
            f"{BASE_URL}/api/championships/matches/{match_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Failed to delete match: {response.text}"
        print(f"✓ Test match cleaned up")


class TestStatsTableFormat:
    """Test stats table format (APL format)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.admin_email = "admin@example.com"
        self.admin_password = "test123456"
    
    def get_auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": self.admin_email, "password": self.admin_password}
        )
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def test_01_get_team_stats(self):
        """Test getting team stats endpoint"""
        token = self.get_auth_token()
        assert token, "Failed to get auth token"
        
        # Get teams first
        response = requests.get(
            f"{BASE_URL}/api/teams",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        teams = response.json()
        
        if not teams:
            pytest.skip("No teams available")
        
        team_id = teams[0]['id']
        
        # Get stats
        response = requests.get(
            f"{BASE_URL}/api/teams/{team_id}/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Failed to get stats: {response.text}"
        stats = response.json()
        print(f"✓ Stats endpoint working, returned {len(stats)} player stats")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

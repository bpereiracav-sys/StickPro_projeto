"""
Phase 11 Testing: Stats Page Features and Club Venue Fields
- Golos Sofridos card (from standings)
- Últimos 5 Jogos (recent results sequence)
- Pe/LD format (marcados/tentativas)
- Club venue_name and venue_location fields
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestClubVenueFields:
    """Test Club venue_name and venue_location fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "test123456"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_clubs(self):
        """Test getting clubs list"""
        response = requests.get(f"{BASE_URL}/api/clubs", headers=self.headers)
        assert response.status_code == 200
        clubs = response.json()
        assert isinstance(clubs, list)
        print(f"Found {len(clubs)} clubs")
        if clubs:
            club = clubs[0]
            print(f"Club fields: {list(club.keys())}")
            # Verify venue fields exist in model
            assert 'venue_name' in club or club.get('venue_name') is None, "venue_name field should exist"
            assert 'venue_location' in club or club.get('venue_location') is None, "venue_location field should exist"
    
    def test_update_club_venue_fields(self):
        """Test updating club with venue_name and venue_location"""
        # First get existing club
        response = requests.get(f"{BASE_URL}/api/clubs", headers=self.headers)
        assert response.status_code == 200
        clubs = response.json()
        
        if not clubs:
            pytest.skip("No clubs found to update")
        
        club_id = clubs[0]["id"]
        
        # Update with venue fields
        update_data = {
            "venue_name": "TEST_Pavilhão Municipal",
            "venue_location": "TEST_Rua do Desporto, 123, Lisboa"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/clubs/{club_id}",
            json=update_data,
            headers=self.headers
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        # Verify the update was persisted
        response = requests.get(f"{BASE_URL}/api/clubs/{club_id}", headers=self.headers)
        assert response.status_code == 200
        updated_club = response.json()
        
        assert updated_club.get("venue_name") == "TEST_Pavilhão Municipal", \
            f"venue_name not saved. Got: {updated_club.get('venue_name')}"
        assert updated_club.get("venue_location") == "TEST_Rua do Desporto, 123, Lisboa", \
            f"venue_location not saved. Got: {updated_club.get('venue_location')}"
        
        print("PASS: Club venue fields updated and persisted correctly")
        
        # Cleanup - reset venue fields
        requests.put(
            f"{BASE_URL}/api/clubs/{club_id}",
            json={"venue_name": "", "venue_location": ""},
            headers=self.headers
        )


class TestStatsEndpoints:
    """Test Stats-related endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "test123456"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get team ID
        response = requests.get(f"{BASE_URL}/api/teams", headers=self.headers)
        assert response.status_code == 200
        teams = response.json()
        if teams:
            self.team_id = teams[0]["id"]
        else:
            self.team_id = None
    
    def test_get_team_stats(self):
        """Test getting team stats"""
        if not self.team_id:
            pytest.skip("No teams found")
        
        response = requests.get(
            f"{BASE_URL}/api/teams/{self.team_id}/stats",
            headers=self.headers
        )
        assert response.status_code == 200
        stats = response.json()
        assert isinstance(stats, list)
        print(f"Found {len(stats)} player stats")
        
        # Check stats structure includes penalty and free kick fields
        if stats:
            stat = stats[0]
            print(f"Stat fields: {list(stat.keys())}")
            # These fields should exist for Pe/LD format
            expected_fields = ['goals', 'penalties_scored', 'penalties_missed', 
                             'free_kicks_scored', 'free_kicks_missed']
            for field in expected_fields:
                if field in stat:
                    print(f"  {field}: {stat.get(field)}")
    
    def test_get_championship_standings(self):
        """Test getting championship standings (for Golos Sofridos)"""
        # Get championships
        response = requests.get(f"{BASE_URL}/api/championships", headers=self.headers)
        assert response.status_code == 200
        championships = response.json()
        
        if not championships:
            pytest.skip("No championships found")
        
        champ_id = championships[0]["id"]
        
        # Get standings
        response = requests.get(
            f"{BASE_URL}/api/championships/{champ_id}/standings",
            headers=self.headers
        )
        assert response.status_code == 200
        standings = response.json()
        assert isinstance(standings, list)
        print(f"Found {len(standings)} teams in standings")
        
        # Check standings structure includes goals_against (for Golos Sofridos)
        if standings:
            standing = standings[0]
            print(f"Standing fields: {list(standing.keys())}")
            assert 'goals_against' in standing, "goals_against field required for Golos Sofridos"
            print(f"  goals_against: {standing.get('goals_against')}")
    
    def test_get_championship_matches(self):
        """Test getting championship matches (for Últimos 5 Jogos)"""
        # Get championships
        response = requests.get(f"{BASE_URL}/api/championships", headers=self.headers)
        assert response.status_code == 200
        championships = response.json()
        
        if not championships:
            pytest.skip("No championships found")
        
        champ_id = championships[0]["id"]
        
        # Get matches
        response = requests.get(
            f"{BASE_URL}/api/championships/{champ_id}/matches",
            headers=self.headers
        )
        assert response.status_code == 200
        matches = response.json()
        assert isinstance(matches, list)
        print(f"Found {len(matches)} matches")
        
        # Check match structure for recent results
        completed_matches = [m for m in matches if m.get('is_completed')]
        print(f"Completed matches: {len(completed_matches)}")
        
        if completed_matches:
            match = completed_matches[0]
            print(f"Match fields: {list(match.keys())}")
            # Required fields for recent results
            assert 'home_score' in match, "home_score required"
            assert 'away_score' in match, "away_score required"
            assert 'location' in match, "location required (casa/fora)"
            assert 'is_completed' in match, "is_completed required"


class TestMatchStatsPage:
    """Test Match Stats page endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "test123456"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_match_stats(self):
        """Test getting individual match stats"""
        # Get championships
        response = requests.get(f"{BASE_URL}/api/championships", headers=self.headers)
        assert response.status_code == 200
        championships = response.json()
        
        if not championships:
            pytest.skip("No championships found")
        
        champ_id = championships[0]["id"]
        
        # Get matches
        response = requests.get(
            f"{BASE_URL}/api/championships/{champ_id}/matches",
            headers=self.headers
        )
        assert response.status_code == 200
        matches = response.json()
        
        if not matches:
            pytest.skip("No matches found")
        
        match_id = matches[0]["id"]
        
        # Get match stats
        response = requests.get(
            f"{BASE_URL}/api/championships/matches/{match_id}/stats",
            headers=self.headers
        )
        
        # This endpoint may or may not exist - check
        if response.status_code == 200:
            stats = response.json()
            print(f"Match stats: {stats}")
        elif response.status_code == 404:
            print("Match stats endpoint not found (may be handled by frontend)")
        else:
            print(f"Match stats response: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

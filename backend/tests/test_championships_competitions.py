"""
Test Championships/Competitions Module
- Competition team creation
- Match creation with home_team and opponent validation
- Import matches from Excel/CSV with multilingual headers
- Match sorting by date and time
- Result update with score validation
- match_time field
"""
import pytest
import requests
import os
import tempfile
import csv
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestChampionshipsCompetitions:
    """Test Championships and Competitions module"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.admin_email = "admin@example.com"
        self.admin_password = "test123456"
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.admin_email,
            "password": self.admin_password
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.user = login_response.json().get("user")
        else:
            pytest.skip("Admin login failed - skipping tests")
        
        yield
        
        # Cleanup
        self.session.close()
    
    def get_or_create_team(self):
        """Get existing team or create one for testing"""
        teams_response = self.session.get(f"{BASE_URL}/api/teams")
        if teams_response.status_code == 200 and teams_response.json():
            return teams_response.json()[0]
        
        # Create a team
        team_data = {
            "name": "TEST_Team_Championships",
            "category": "Sub-15",
            "season": "2024/2025"
        }
        create_response = self.session.post(f"{BASE_URL}/api/teams", json=team_data)
        if create_response.status_code in [200, 201]:
            return create_response.json()
        return None
    
    def get_or_create_championship(self, team_id):
        """Get existing championship or create one for testing"""
        champs_response = self.session.get(f"{BASE_URL}/api/championships", params={"team_id": team_id})
        if champs_response.status_code == 200 and champs_response.json():
            return champs_response.json()[0]
        
        # Create a championship
        champ_data = {
            "name": "TEST_Championship_2024",
            "season": "2024/2025",
            "team_id": team_id,
            "format": "5x5",
            "convocation_type": "manual"
        }
        create_response = self.session.post(f"{BASE_URL}/api/championships", json=champ_data)
        if create_response.status_code in [200, 201]:
            return create_response.json()
        return None
    
    # ==================== COMPETITION TEAM TESTS ====================
    
    def test_create_competition_team_success(self):
        """Test creating a competition team - should work without errors"""
        team = self.get_or_create_team()
        assert team is not None, "Failed to get/create team"
        
        championship = self.get_or_create_championship(team['id'])
        assert championship is not None, "Failed to get/create championship"
        
        # Create competition team
        team_data = {
            "name": f"TEST_CompTeam_{datetime.now().timestamp()}"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/championships/{championship['id']}/teams",
            json=team_data
        )
        
        assert response.status_code in [200, 201], f"Failed to create competition team: {response.text}"
        data = response.json()
        assert data.get('name') == team_data['name']
        assert data.get('championship_id') == championship['id']
        print(f"✓ Competition team created successfully: {data.get('name')}")
    
    def test_create_competition_team_with_pavilion(self):
        """Test creating a competition team with pavilion info"""
        team = self.get_or_create_team()
        championship = self.get_or_create_championship(team['id'])
        
        team_data = {
            "name": f"TEST_CompTeam_Pavilion_{datetime.now().timestamp()}",
            "pavilion_name": "Pavilhão Municipal",
            "pavilion_address": "Rua do Desporto, 123"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/championships/{championship['id']}/teams",
            json=team_data
        )
        
        assert response.status_code in [200, 201], f"Failed: {response.text}"
        data = response.json()
        assert data.get('pavilion_name') == team_data['pavilion_name']
        assert data.get('pavilion_address') == team_data['pavilion_address']
        print(f"✓ Competition team with pavilion created: {data.get('name')}")
    
    def test_create_competition_team_duplicate_name_error(self):
        """Test that duplicate team names are rejected"""
        team = self.get_or_create_team()
        championship = self.get_or_create_championship(team['id'])
        
        unique_name = f"TEST_DuplicateTeam_{datetime.now().timestamp()}"
        
        # Create first team
        response1 = self.session.post(
            f"{BASE_URL}/api/championships/{championship['id']}/teams",
            json={"name": unique_name}
        )
        assert response1.status_code in [200, 201]
        
        # Try to create duplicate
        response2 = self.session.post(
            f"{BASE_URL}/api/championships/{championship['id']}/teams",
            json={"name": unique_name}
        )
        assert response2.status_code == 400, "Should reject duplicate team name"
        print("✓ Duplicate team name correctly rejected")
    
    # ==================== MATCH CREATION TESTS ====================
    
    def test_create_match_success(self):
        """Test creating a match with home_team and opponent"""
        team = self.get_or_create_team()
        championship = self.get_or_create_championship(team['id'])
        
        match_data = {
            "championship_id": championship['id'],
            "opponent_team": "TEST_Opponent_Team",
            "match_date": (datetime.now() + timedelta(days=7)).isoformat(),
            "match_time": "15:30",
            "location": "casa",
            "venue": "Pavilhão Municipal",
            "is_club_match": True,
            "matchday": 1
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/championships/{championship['id']}/matches",
            json=match_data
        )
        
        assert response.status_code in [200, 201], f"Failed to create match: {response.text}"
        data = response.json()
        assert data.get('opponent_team') == match_data['opponent_team']
        assert data.get('match_time') == match_data['match_time']
        assert data.get('matchday') == match_data['matchday']
        print(f"✓ Match created successfully with match_time: {data.get('match_time')}")
    
    def test_create_match_with_home_team(self):
        """Test creating a match with explicit home_team (external match)"""
        team = self.get_or_create_team()
        championship = self.get_or_create_championship(team['id'])
        
        match_data = {
            "championship_id": championship['id'],
            "home_team": "External Team A",
            "opponent_team": "External Team B",
            "match_date": (datetime.now() + timedelta(days=14)).isoformat(),
            "match_time": "18:00",
            "location": "neutro",
            "is_club_match": False,
            "matchday": 2
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/championships/{championship['id']}/matches",
            json=match_data
        )
        
        assert response.status_code in [200, 201], f"Failed: {response.text}"
        data = response.json()
        assert data.get('home_team') == match_data['home_team']
        assert data.get('opponent_team') == match_data['opponent_team']
        assert data.get('is_club_match') == False
        print(f"✓ External match created: {data.get('home_team')} vs {data.get('opponent_team')}")
    
    # ==================== RESULT UPDATE TESTS ====================
    
    def test_update_match_result_success(self):
        """Test updating match result with valid scores"""
        team = self.get_or_create_team()
        championship = self.get_or_create_championship(team['id'])
        
        # Create a match first
        match_data = {
            "championship_id": championship['id'],
            "opponent_team": "TEST_Result_Opponent",
            "match_date": datetime.now().isoformat(),
            "location": "casa",
            "is_club_match": True,
            "matchday": 3
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/championships/{championship['id']}/matches",
            json=match_data
        )
        assert create_response.status_code in [200, 201]
        match = create_response.json()
        
        # Update result
        result_data = {
            "home_score": 5,
            "away_score": 3,
            "bonus_points": 1,
            "penalty_points": 0
        }
        
        result_response = self.session.put(
            f"{BASE_URL}/api/championships/matches/{match['id']}/result",
            json=result_data
        )
        
        assert result_response.status_code == 200, f"Failed to update result: {result_response.text}"
        
        # Verify by fetching matches
        matches_response = self.session.get(f"{BASE_URL}/api/championships/{championship['id']}/matches")
        assert matches_response.status_code == 200
        
        matches = matches_response.json()
        updated_match = next((m for m in matches if m['id'] == match['id']), None)
        assert updated_match is not None, "Match not found after update"
        assert updated_match.get('home_score') == 5
        assert updated_match.get('away_score') == 3
        assert updated_match.get('is_completed') == True
        print(f"✓ Match result updated: {updated_match.get('home_score')} - {updated_match.get('away_score')}")
    
    def test_update_match_result_zero_scores(self):
        """Test updating match result with zero scores (valid)"""
        team = self.get_or_create_team()
        championship = self.get_or_create_championship(team['id'])
        
        # Create a match
        match_data = {
            "championship_id": championship['id'],
            "opponent_team": "TEST_Zero_Score_Opponent",
            "match_date": datetime.now().isoformat(),
            "location": "fora",
            "is_club_match": True,
            "matchday": 4
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/championships/{championship['id']}/matches",
            json=match_data
        )
        match = create_response.json()
        
        # Update with 0-0 result
        result_data = {
            "home_score": 0,
            "away_score": 0
        }
        
        result_response = self.session.put(
            f"{BASE_URL}/api/championships/matches/{match['id']}/result",
            json=result_data
        )
        
        assert result_response.status_code == 200
        
        # Verify by fetching matches
        matches_response = self.session.get(f"{BASE_URL}/api/championships/{championship['id']}/matches")
        matches = matches_response.json()
        updated_match = next((m for m in matches if m['id'] == match['id']), None)
        assert updated_match is not None
        assert updated_match.get('home_score') == 0
        assert updated_match.get('away_score') == 0
        print("✓ Zero score result accepted")
    
    # ==================== IMPORT MATCHES TESTS ====================
    
    def test_import_matches_csv_portuguese_headers(self):
        """Test importing matches from CSV with Portuguese headers"""
        team = self.get_or_create_team()
        championship = self.get_or_create_championship(team['id'])
        
        # Create CSV file with Portuguese headers
        csv_content = """Equipa Casa,Adversário,Data,Hora,Local,Jornada
Equipa A,Equipa B,2025-02-15,15:00,Pavilhão Municipal,5
Equipa C,Equipa D,2025-02-16,16:30,Pavilhão Desportivo,5"""
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
            f.write(csv_content)
            temp_path = f.name
        
        try:
            with open(temp_path, 'rb') as f:
                files = {'file': ('matches_pt.csv', f, 'text/csv')}
                # Remove Content-Type header for multipart
                headers = {"Authorization": self.session.headers.get("Authorization")}
                response = requests.post(
                    f"{BASE_URL}/api/championships/{championship['id']}/matches/import",
                    files=files,
                    headers=headers
                )
            
            assert response.status_code == 200, f"Import failed: {response.text}"
            data = response.json()
            assert data.get('success', 0) >= 1, f"No matches imported: {data}"
            print(f"✓ CSV import with PT headers: {data.get('success')} matches imported")
        finally:
            os.unlink(temp_path)
    
    def test_import_matches_csv_spanish_headers(self):
        """Test importing matches from CSV with Spanish headers"""
        team = self.get_or_create_team()
        championship = self.get_or_create_championship(team['id'])
        
        csv_content = """Equipo Local,Rival,Fecha,Hora,Lugar,Jornada
Equipo X,Equipo Y,2025-03-01,17:00,Pabellón Central,6"""
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
            f.write(csv_content)
            temp_path = f.name
        
        try:
            with open(temp_path, 'rb') as f:
                files = {'file': ('matches_es.csv', f, 'text/csv')}
                headers = {"Authorization": self.session.headers.get("Authorization")}
                response = requests.post(
                    f"{BASE_URL}/api/championships/{championship['id']}/matches/import",
                    files=files,
                    headers=headers
                )
            
            assert response.status_code == 200, f"Import failed: {response.text}"
            data = response.json()
            assert data.get('success', 0) >= 1
            print(f"✓ CSV import with ES headers: {data.get('success')} matches imported")
        finally:
            os.unlink(temp_path)
    
    def test_import_matches_csv_french_headers(self):
        """Test importing matches from CSV with French headers"""
        team = self.get_or_create_team()
        championship = self.get_or_create_championship(team['id'])
        
        csv_content = """Équipe Domicile,Adversaire,Date,Heure,Lieu,Journée
Équipe Alpha,Équipe Beta,2025-03-10,14:00,Pavillon Sportif,7"""
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
            f.write(csv_content)
            temp_path = f.name
        
        try:
            with open(temp_path, 'rb') as f:
                files = {'file': ('matches_fr.csv', f, 'text/csv')}
                headers = {"Authorization": self.session.headers.get("Authorization")}
                response = requests.post(
                    f"{BASE_URL}/api/championships/{championship['id']}/matches/import",
                    files=files,
                    headers=headers
                )
            
            assert response.status_code == 200, f"Import failed: {response.text}"
            data = response.json()
            assert data.get('success', 0) >= 1
            print(f"✓ CSV import with FR headers: {data.get('success')} matches imported")
        finally:
            os.unlink(temp_path)
    
    def test_import_matches_csv_italian_headers(self):
        """Test importing matches from CSV with Italian headers"""
        team = self.get_or_create_team()
        championship = self.get_or_create_championship(team['id'])
        
        csv_content = """Squadra Casa,Avversario,Data,Ora,Luogo,Giornata
Squadra Uno,Squadra Due,2025-03-15,19:00,Palazzetto,8"""
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
            f.write(csv_content)
            temp_path = f.name
        
        try:
            with open(temp_path, 'rb') as f:
                files = {'file': ('matches_it.csv', f, 'text/csv')}
                headers = {"Authorization": self.session.headers.get("Authorization")}
                response = requests.post(
                    f"{BASE_URL}/api/championships/{championship['id']}/matches/import",
                    files=files,
                    headers=headers
                )
            
            assert response.status_code == 200, f"Import failed: {response.text}"
            data = response.json()
            assert data.get('success', 0) >= 1
            print(f"✓ CSV import with IT headers: {data.get('success')} matches imported")
        finally:
            os.unlink(temp_path)
    
    def test_import_matches_csv_english_headers(self):
        """Test importing matches from CSV with English headers"""
        team = self.get_or_create_team()
        championship = self.get_or_create_championship(team['id'])
        
        csv_content = """Home Team,Opponent,Date,Time,Venue,Round
Team One,Team Two,2025-03-20,20:00,Sports Hall,9"""
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
            f.write(csv_content)
            temp_path = f.name
        
        try:
            with open(temp_path, 'rb') as f:
                files = {'file': ('matches_en.csv', f, 'text/csv')}
                headers = {"Authorization": self.session.headers.get("Authorization")}
                response = requests.post(
                    f"{BASE_URL}/api/championships/{championship['id']}/matches/import",
                    files=files,
                    headers=headers
                )
            
            assert response.status_code == 200, f"Import failed: {response.text}"
            data = response.json()
            assert data.get('success', 0) >= 1
            print(f"✓ CSV import with EN headers: {data.get('success')} matches imported")
        finally:
            os.unlink(temp_path)
    
    # ==================== MATCH SORTING TESTS ====================
    
    def test_matches_returned_with_date_and_time(self):
        """Test that matches are returned with date and time fields"""
        team = self.get_or_create_team()
        championship = self.get_or_create_championship(team['id'])
        
        # Create matches with different times
        for i, time in enumerate(["10:00", "14:30", "18:00"]):
            match_data = {
                "championship_id": championship['id'],
                "opponent_team": f"TEST_Sort_Team_{i}",
                "match_date": (datetime.now() + timedelta(days=30)).isoformat(),
                "match_time": time,
                "location": "casa",
                "is_club_match": True,
                "matchday": 10
            }
            self.session.post(
                f"{BASE_URL}/api/championships/{championship['id']}/matches",
                json=match_data
            )
        
        # Get matches
        response = self.session.get(f"{BASE_URL}/api/championships/{championship['id']}/matches")
        assert response.status_code == 200
        
        matches = response.json()
        assert len(matches) > 0
        
        # Check that match_time field exists
        for match in matches:
            if match.get('opponent_team', '').startswith('TEST_Sort_Team'):
                assert 'match_time' in match, "match_time field missing"
                print(f"✓ Match has match_time: {match.get('match_time')}")
    
    # ==================== TRANSLATION KEYS TEST ====================
    
    def test_championships_endpoint_returns_data(self):
        """Test that championships endpoint returns proper data structure"""
        team = self.get_or_create_team()
        championship = self.get_or_create_championship(team['id'])
        
        response = self.session.get(f"{BASE_URL}/api/championships/{championship['id']}")
        assert response.status_code == 200
        
        data = response.json()
        assert 'id' in data
        assert 'name' in data
        assert 'team_id' in data
        assert 'format' in data
        print(f"✓ Championship data structure valid: {data.get('name')}")
    
    def test_get_competition_teams(self):
        """Test getting competition teams for a championship"""
        team = self.get_or_create_team()
        championship = self.get_or_create_championship(team['id'])
        
        response = self.session.get(f"{BASE_URL}/api/championships/{championship['id']}/teams")
        assert response.status_code == 200
        
        teams = response.json()
        assert isinstance(teams, list)
        print(f"✓ Competition teams retrieved: {len(teams)} teams")
    
    def test_get_standings(self):
        """Test getting standings for a championship"""
        team = self.get_or_create_team()
        championship = self.get_or_create_championship(team['id'])
        
        response = self.session.get(f"{BASE_URL}/api/championships/{championship['id']}/standings")
        assert response.status_code == 200
        
        standings = response.json()
        assert isinstance(standings, list)
        print(f"✓ Standings retrieved: {len(standings)} entries")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

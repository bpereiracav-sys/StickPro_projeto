"""
Test suite for POST /api/championships/extract-gamesheet-stats endpoint
Tests player statistics extraction from gamesheet URL with multilingual support.

Features tested:
- Extract home_score and away_score from gamesheet
- Extract teams list from gamesheet
- Parse Goals (G), Assists (AG), Defenses (D) as integers
- Parse Penalties X/Y format to PM (scored) and PF (failed)
- Parse Direct Free Hits X/Y format to LDM (scored) and LDF (failed)
- Parse yellow, blue, red cards
- Normalize player names (remove captain marker ©, accents)
- Skip technical staff (T, T2, MAS, MEC)
- Validation: PM >= 0, PF >= 0, LDM >= 0, LDF >= 0
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
MOCK_GAMESHEET_URL = "http://localhost:9999/mock_gamesheet.html"


class TestGamesheetStatsExtraction:
    """Tests for the gamesheet stats extraction endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - login and get auth token"""
        # Login as admin
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "test123456"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_extract_gamesheet_stats_success(self):
        """Test successful extraction of gamesheet stats from mock HTML"""
        response = requests.post(
            f"{BASE_URL}/api/championships/extract-gamesheet-stats",
            json={"url": MOCK_GAMESHEET_URL},
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "home_score" in data, "Response should contain home_score"
        assert "away_score" in data, "Response should contain away_score"
        assert "teams" in data, "Response should contain teams"
        assert "players" in data, "Response should contain players"
        assert "language_detected" in data, "Response should contain language_detected"
        
        print(f"Extracted data: home_score={data['home_score']}, away_score={data['away_score']}")
        print(f"Teams: {data['teams']}")
        print(f"Players count: {len(data['players'])}")
    
    def test_extract_home_and_away_score(self):
        """Test extraction of home_score and away_score from gamesheet"""
        response = requests.post(
            f"{BASE_URL}/api/championships/extract-gamesheet-stats",
            json={"url": MOCK_GAMESHEET_URL},
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Mock gamesheet has score 7-2
        assert data["home_score"] == 7, f"Expected home_score=7, got {data['home_score']}"
        assert data["away_score"] == 2, f"Expected away_score=2, got {data['away_score']}"
        print(f"✓ Score extraction: {data['home_score']} - {data['away_score']}")
    
    def test_extract_teams_list(self):
        """Test extraction of teams list from gamesheet"""
        response = requests.post(
            f"{BASE_URL}/api/championships/extract-gamesheet-stats",
            json={"url": MOCK_GAMESHEET_URL},
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Mock gamesheet has HC SINTRA and UD VILAFRANQUENSE
        assert len(data["teams"]) >= 2, f"Expected at least 2 teams, got {len(data['teams'])}"
        assert "HC SINTRA" in data["teams"], f"Expected 'HC SINTRA' in teams: {data['teams']}"
        assert "UD VILAFRANQUENSE" in data["teams"], f"Expected 'UD VILAFRANQUENSE' in teams: {data['teams']}"
        print(f"✓ Teams extracted: {data['teams']}")
    
    def test_parse_goals_assists_defenses(self):
        """Test parsing of Goals (G), Assists (AG), Defenses (D) as integers"""
        response = requests.post(
            f"{BASE_URL}/api/championships/extract-gamesheet-stats",
            json={"url": MOCK_GAMESHEET_URL},
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Find João Silva who has G=3, AG=1, D=10
        joao_silva = next((p for p in data["players"] if "Silva" in p["player_name"]), None)
        assert joao_silva is not None, "João Silva should be in players list"
        
        assert joao_silva["G"] == 3, f"Expected G=3 for João Silva, got {joao_silva['G']}"
        assert joao_silva["AG"] == 1, f"Expected AG=1 for João Silva, got {joao_silva['AG']}"
        assert joao_silva["D"] == 10, f"Expected D=10 for João Silva, got {joao_silva['D']}"
        
        assert isinstance(joao_silva["G"], int), "G should be an integer"
        assert isinstance(joao_silva["AG"], int), "AG should be an integer"
        assert isinstance(joao_silva["D"], int), "D should be an integer"
        
        print(f"✓ João Silva stats: G={joao_silva['G']}, AG={joao_silva['AG']}, D={joao_silva['D']}")
    
    def test_parse_penalties_xy_format(self):
        """Test parsing Penalties X/Y format to PM (scored) and PF (failed)"""
        response = requests.post(
            f"{BASE_URL}/api/championships/extract-gamesheet-stats",
            json={"url": MOCK_GAMESHEET_URL},
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Salvador Madaleno has Pe=1/1 (PM=1, PF=0)
        salvador = next((p for p in data["players"] if "Salvador" in p["player_name"] or "Madaleno" in p["player_name"]), None)
        assert salvador is not None, "Salvador Madaleno should be in players list"
        
        assert salvador["PM"] == 1, f"Expected PM=1 for Salvador Madaleno, got {salvador['PM']}"
        assert salvador["PF"] == 0, f"Expected PF=0 for Salvador Madaleno (1/1 means 1 scored, 0 failed), got {salvador['PF']}"
        
        # Lourenço Lopes has Pe=1/2 (PM=1, PF=1)
        lourenco = next((p for p in data["players"] if "Lopes" in p["player_name"] or "Lourenço" in p["player_name"]), None)
        assert lourenco is not None, "Lourenço Lopes should be in players list"
        
        assert lourenco["PM"] == 1, f"Expected PM=1 for Lourenço Lopes, got {lourenco['PM']}"
        assert lourenco["PF"] == 1, f"Expected PF=1 for Lourenço Lopes (1/2 means 1 scored, 1 failed), got {lourenco['PF']}"
        
        print(f"✓ Salvador Madaleno penalties: PM={salvador['PM']}, PF={salvador['PF']}")
        print(f"✓ Lourenço Lopes penalties: PM={lourenco['PM']}, PF={lourenco['PF']}")
    
    def test_parse_direct_free_hits_xy_format(self):
        """Test parsing Direct Free Hits X/Y format to LDM (scored) and LDF (failed)"""
        response = requests.post(
            f"{BASE_URL}/api/championships/extract-gamesheet-stats",
            json={"url": MOCK_GAMESHEET_URL},
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Lourenço Lopes has LD=1/3 (LDM=1, LDF=2)
        lourenco = next((p for p in data["players"] if "Lopes" in p["player_name"] or "Lourenço" in p["player_name"]), None)
        assert lourenco is not None, "Lourenço Lopes should be in players list"
        
        assert lourenco["LDM"] == 1, f"Expected LDM=1 for Lourenço Lopes, got {lourenco['LDM']}"
        assert lourenco["LDF"] == 2, f"Expected LDF=2 for Lourenço Lopes (1/3 means 1 scored, 2 failed), got {lourenco['LDF']}"
        
        print(f"✓ Lourenço Lopes direct free hits: LDM={lourenco['LDM']}, LDF={lourenco['LDF']}")
    
    def test_parse_cards(self):
        """Test parsing yellow, blue, red cards"""
        response = requests.post(
            f"{BASE_URL}/api/championships/extract-gamesheet-stats",
            json={"url": MOCK_GAMESHEET_URL},
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Lourenço Lopes has Am=1 (yellow=1)
        lourenco = next((p for p in data["players"] if "Lopes" in p["player_name"] or "Lourenço" in p["player_name"]), None)
        assert lourenco is not None, "Lourenço Lopes should be in players list"
        assert lourenco["yellow"] == 1, f"Expected yellow=1 for Lourenço Lopes, got {lourenco['yellow']}"
        
        # João Silva has Az=1 (blue=1)
        joao_silva = next((p for p in data["players"] if "Silva" in p["player_name"]), None)
        assert joao_silva is not None, "João Silva should be in players list"
        assert joao_silva["blue"] == 1, f"Expected blue=1 for João Silva, got {joao_silva['blue']}"
        
        # Player 2 has Vm=1 (red=1)
        player2 = next((p for p in data["players"] if "Player 2" in p["player_name"]), None)
        assert player2 is not None, "Player 2 should be in players list"
        assert player2["red"] == 1, f"Expected red=1 for Player 2, got {player2['red']}"
        
        print(f"✓ Lourenço Lopes cards: yellow={lourenco['yellow']}")
        print(f"✓ João Silva cards: blue={joao_silva['blue']}")
        print(f"✓ Player 2 cards: red={player2['red']}")
    
    def test_normalize_player_name_remove_captain_marker(self):
        """Test that captain marker © is removed from player names"""
        response = requests.post(
            f"{BASE_URL}/api/championships/extract-gamesheet-stats",
            json={"url": MOCK_GAMESHEET_URL},
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Salvador Madaleno © should have © removed
        salvador = next((p for p in data["players"] if "Salvador" in p["player_name"] or "Madaleno" in p["player_name"]), None)
        assert salvador is not None, "Salvador Madaleno should be in players list"
        
        assert "©" not in salvador["player_name"], f"Captain marker © should be removed from name: {salvador['player_name']}"
        assert salvador["player_name"].strip() == "Salvador Madaleno", f"Expected 'Salvador Madaleno', got '{salvador['player_name']}'"
        
        print(f"✓ Captain marker removed: '{salvador['player_name']}'")
    
    def test_skip_technical_staff(self):
        """Test that technical staff (T, T2, MAS, MEC) are skipped"""
        response = requests.post(
            f"{BASE_URL}/api/championships/extract-gamesheet-stats",
            json={"url": MOCK_GAMESHEET_URL},
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Coach Name should NOT be in players list (has T as jersey number)
        coach = next((p for p in data["players"] if "Coach" in p["player_name"]), None)
        assert coach is None, f"Technical staff 'Coach Name' should be skipped, but found: {coach}"
        
        # Verify no player has jersey number T, T2, MAS, MEC
        staff_jerseys = ['T', 'T2', 'MAS', 'MEC', 'D']
        for player in data["players"]:
            assert player["jersey_number"] not in staff_jerseys, f"Staff jersey {player['jersey_number']} should be skipped"
        
        print(f"✓ Technical staff skipped. Players count: {len(data['players'])}")
    
    def test_validation_pm_pf_ldm_ldf_non_negative(self):
        """Test validation: PM >= 0, PF >= 0, LDM >= 0, LDF >= 0"""
        response = requests.post(
            f"{BASE_URL}/api/championships/extract-gamesheet-stats",
            json={"url": MOCK_GAMESHEET_URL},
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        for player in data["players"]:
            assert player["PM"] >= 0, f"PM should be >= 0 for {player['player_name']}, got {player['PM']}"
            assert player["PF"] >= 0, f"PF should be >= 0 for {player['player_name']}, got {player['PF']}"
            assert player["LDM"] >= 0, f"LDM should be >= 0 for {player['player_name']}, got {player['LDM']}"
            assert player["LDF"] >= 0, f"LDF should be >= 0 for {player['player_name']}, got {player['LDF']}"
        
        print(f"✓ All {len(data['players'])} players have valid PM, PF, LDM, LDF values (>= 0)")
    
    def test_player_data_structure(self):
        """Test that each player has all required fields"""
        response = requests.post(
            f"{BASE_URL}/api/championships/extract-gamesheet-stats",
            json={"url": MOCK_GAMESHEET_URL},
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        required_fields = ['player_name', 'team', 'jersey_number', 'G', 'AG', 'D', 'PM', 'PF', 'LDM', 'LDF', 'yellow', 'blue', 'red']
        
        for player in data["players"]:
            for field in required_fields:
                assert field in player, f"Player {player.get('player_name', 'unknown')} missing field: {field}"
        
        print(f"✓ All {len(data['players'])} players have required fields: {required_fields}")
    
    def test_invalid_url_returns_empty_result(self):
        """Test that invalid/unreachable URL returns empty result (graceful degradation)"""
        response = requests.post(
            f"{BASE_URL}/api/championships/extract-gamesheet-stats",
            json={"url": "http://invalid-url-that-does-not-exist.com/gamesheet.html"},
            headers=self.headers
        )
        
        # The endpoint gracefully handles unreachable URLs by returning empty result
        # This is acceptable behavior - returns 200 with empty data
        assert response.status_code == 200, f"Expected 200 for graceful degradation, got {response.status_code}"
        data = response.json()
        
        # Verify empty result structure
        assert data["home_score"] is None, "home_score should be None for invalid URL"
        assert data["away_score"] is None, "away_score should be None for invalid URL"
        assert data["teams"] == [], "teams should be empty for invalid URL"
        assert data["players"] == [], "players should be empty for invalid URL"
        
        print(f"✓ Invalid URL returns empty result (graceful degradation)")
    
    def test_unauthorized_access_returns_401(self):
        """Test that unauthorized access returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/championships/extract-gamesheet-stats",
            json={"url": MOCK_GAMESHEET_URL},
            headers={"Content-Type": "application/json"}  # No auth token
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403 for unauthorized, got {response.status_code}"
        print(f"✓ Unauthorized access returns {response.status_code}")
    
    def test_player_team_assignment(self):
        """Test that players are correctly assigned to their teams"""
        response = requests.post(
            f"{BASE_URL}/api/championships/extract-gamesheet-stats",
            json={"url": MOCK_GAMESHEET_URL},
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Salvador Madaleno should be in HC SINTRA
        salvador = next((p for p in data["players"] if "Salvador" in p["player_name"] or "Madaleno" in p["player_name"]), None)
        assert salvador is not None
        assert salvador["team"] == "HC SINTRA", f"Expected team 'HC SINTRA' for Salvador, got '{salvador['team']}'"
        
        # GR1 Name should be in UD VILAFRANQUENSE
        gr1 = next((p for p in data["players"] if "GR1" in p["player_name"]), None)
        assert gr1 is not None
        assert gr1["team"] == "UD VILAFRANQUENSE", f"Expected team 'UD VILAFRANQUENSE' for GR1, got '{gr1['team']}'"
        
        print(f"✓ Players correctly assigned to teams")


class TestGamesheetStatsEdgeCases:
    """Edge case tests for gamesheet stats extraction"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "test123456"
        })
        assert login_response.status_code == 200
        self.token = login_response.json()["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_zero_zero_penalties(self):
        """Test that 0/0 penalties are parsed correctly"""
        response = requests.post(
            f"{BASE_URL}/api/championships/extract-gamesheet-stats",
            json={"url": MOCK_GAMESHEET_URL},
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # João Silva has Pe=0/0 (PM=0, PF=0)
        joao_silva = next((p for p in data["players"] if "Silva" in p["player_name"]), None)
        assert joao_silva is not None
        assert joao_silva["PM"] == 0, f"Expected PM=0 for 0/0, got {joao_silva['PM']}"
        assert joao_silva["PF"] == 0, f"Expected PF=0 for 0/0, got {joao_silva['PF']}"
        
        print(f"✓ 0/0 penalties parsed correctly: PM={joao_silva['PM']}, PF={joao_silva['PF']}")
    
    def test_goalkeeper_defenses(self):
        """Test that goalkeeper defenses (D) are parsed correctly"""
        response = requests.post(
            f"{BASE_URL}/api/championships/extract-gamesheet-stats",
            json={"url": MOCK_GAMESHEET_URL},
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # GR1 Name has D=15
        gr1 = next((p for p in data["players"] if "GR1" in p["player_name"]), None)
        assert gr1 is not None
        assert gr1["D"] == 15, f"Expected D=15 for goalkeeper, got {gr1['D']}"
        
        print(f"✓ Goalkeeper defenses: D={gr1['D']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

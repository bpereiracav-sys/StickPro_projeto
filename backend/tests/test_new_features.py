"""
Test new features for Stick Pro - Roller Hockey Team Management
Features tested:
1. User Role Management - Admin can change user roles
2. Messages with recipient selection
3. Match Line-up editor endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "test123456"

# Championship ID for testing
CHAMPIONSHIP_ID = "71567ba7-16b6-432e-9994-93dc9d8cc3bb"


class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        return data["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Get headers with admin token"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_admin_login(self):
        """Test admin login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "admin"
        print("✓ Admin login successful")


class TestUserRoleManagement:
    """Test user role management - Admin can change user roles"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_get_users_list(self, admin_headers):
        """Test getting list of users"""
        response = requests.get(f"{BASE_URL}/api/users", headers=admin_headers)
        assert response.status_code == 200
        users = response.json()
        assert isinstance(users, list)
        assert len(users) > 0
        print(f"✓ Got {len(users)} users")
    
    def test_get_user_by_id(self, admin_headers):
        """Test getting a specific user"""
        # First get list of users
        response = requests.get(f"{BASE_URL}/api/users", headers=admin_headers)
        users = response.json()
        
        # Find a non-admin user to test with
        test_user = None
        for user in users:
            if user["role"] != "admin":
                test_user = user
                break
        
        if test_user:
            response = requests.get(f"{BASE_URL}/api/users/{test_user['id']}", headers=admin_headers)
            assert response.status_code == 200
            user_data = response.json()
            assert user_data["id"] == test_user["id"]
            print(f"✓ Got user: {user_data['name']}")
        else:
            pytest.skip("No non-admin user found for testing")
    
    def test_update_user_role_endpoint_exists(self, admin_headers):
        """Test that the role update endpoint exists"""
        # Get a non-admin user
        response = requests.get(f"{BASE_URL}/api/users", headers=admin_headers)
        users = response.json()
        
        test_user = None
        for user in users:
            if user["role"] == "jogador":
                test_user = user
                break
        
        if test_user:
            # Test the endpoint exists (we'll change role and change it back)
            original_role = test_user["role"]
            
            # Change to treinador
            response = requests.put(
                f"{BASE_URL}/api/users/{test_user['id']}/role",
                headers=admin_headers,
                json={"role": "treinador"}
            )
            assert response.status_code == 200, f"Role update failed: {response.text}"
            print(f"✓ Changed {test_user['name']} role to treinador")
            
            # Change back to original
            response = requests.put(
                f"{BASE_URL}/api/users/{test_user['id']}/role",
                headers=admin_headers,
                json={"role": original_role}
            )
            assert response.status_code == 200
            print(f"✓ Restored {test_user['name']} role to {original_role}")
        else:
            pytest.skip("No jogador user found for testing")
    
    def test_invalid_role_rejected(self, admin_headers):
        """Test that invalid roles are rejected"""
        response = requests.get(f"{BASE_URL}/api/users", headers=admin_headers)
        users = response.json()
        
        if users:
            test_user = users[0]
            response = requests.put(
                f"{BASE_URL}/api/users/{test_user['id']}/role",
                headers=admin_headers,
                json={"role": "invalid_role"}
            )
            assert response.status_code == 400
            print("✓ Invalid role correctly rejected")


class TestMessagesWithRecipients:
    """Test messages with recipient selection"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def team_id(self, admin_headers):
        """Get a team ID for testing"""
        response = requests.get(f"{BASE_URL}/api/teams", headers=admin_headers)
        teams = response.json()
        if teams:
            return teams[0]["id"]
        pytest.skip("No teams found for testing")
    
    def test_send_broadcast_message(self, admin_headers, team_id):
        """Test sending a broadcast message to all team members"""
        response = requests.post(
            f"{BASE_URL}/api/messages",
            headers=admin_headers,
            json={
                "team_id": team_id,
                "content": "TEST_Broadcast message to all team",
                "recipient_ids": []  # Empty = broadcast to all
            }
        )
        assert response.status_code == 200, f"Failed to send message: {response.text}"
        print("✓ Broadcast message sent successfully")
    
    def test_send_private_message(self, admin_headers, team_id):
        """Test sending a private message to specific member"""
        # Get team members
        response = requests.get(f"{BASE_URL}/api/teams/{team_id}/members", headers=admin_headers)
        members = response.json()
        
        if len(members) > 1:
            # Send to first non-admin member
            recipient = None
            for member in members:
                if member["role"] != "admin":
                    recipient = member
                    break
            
            if recipient:
                response = requests.post(
                    f"{BASE_URL}/api/messages",
                    headers=admin_headers,
                    json={
                        "team_id": team_id,
                        "content": "TEST_Private message to specific member",
                        "recipient_ids": [recipient["id"]]
                    }
                )
                assert response.status_code == 200, f"Failed to send private message: {response.text}"
                print(f"✓ Private message sent to {recipient['name']}")
            else:
                pytest.skip("No non-admin member found")
        else:
            pytest.skip("Not enough team members for private message test")
    
    def test_get_team_messages(self, admin_headers, team_id):
        """Test getting messages for a team"""
        response = requests.get(
            f"{BASE_URL}/api/messages/{team_id}",
            headers=admin_headers
        )
        assert response.status_code == 200
        messages = response.json()
        assert isinstance(messages, list)
        print(f"✓ Got {len(messages)} messages for team")


class TestMatchLineup:
    """Test match lineup endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def match_id(self, admin_headers):
        """Get a match ID from the championship"""
        response = requests.get(
            f"{BASE_URL}/api/championships/{CHAMPIONSHIP_ID}/matches",
            headers=admin_headers
        )
        if response.status_code == 200:
            matches = response.json()
            if matches:
                return matches[0]["id"]
        pytest.skip("No matches found in championship")
    
    def test_get_match_lineup_empty(self, admin_headers, match_id):
        """Test getting lineup for a match (may be empty)"""
        response = requests.get(
            f"{BASE_URL}/api/championships/matches/{match_id}/lineup",
            headers=admin_headers
        )
        assert response.status_code == 200
        lineup = response.json()
        assert "periods" in lineup or "match_id" in lineup
        print(f"✓ Got lineup for match {match_id}")
    
    def test_save_match_lineup(self, admin_headers, match_id):
        """Test saving a lineup for a match"""
        lineup_data = {
            "periods": [
                {
                    "id": "test-period-1",
                    "name": "1ª Parte",
                    "order": 1,
                    "positions": [
                        {"position": "guarda_redes", "player_id": None, "player_name": None},
                        {"position": "defesa_esquerda", "player_id": None, "player_name": None},
                        {"position": "defesa_direita", "player_id": None, "player_name": None},
                        {"position": "avancado_esquerda", "player_id": None, "player_name": None},
                        {"position": "avancado_direita", "player_id": None, "player_name": None}
                    ],
                    "notes": ""
                },
                {
                    "id": "test-period-2",
                    "name": "2ª Parte",
                    "order": 2,
                    "positions": [],
                    "notes": ""
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/championships/matches/{match_id}/lineup",
            headers=admin_headers,
            json=lineup_data
        )
        assert response.status_code == 200, f"Failed to save lineup: {response.text}"
        print("✓ Lineup saved successfully")
    
    def test_get_saved_lineup(self, admin_headers, match_id):
        """Test getting the saved lineup"""
        response = requests.get(
            f"{BASE_URL}/api/championships/matches/{match_id}/lineup",
            headers=admin_headers
        )
        assert response.status_code == 200
        lineup = response.json()
        assert "periods" in lineup
        assert len(lineup["periods"]) >= 2
        print(f"✓ Got saved lineup with {len(lineup['periods'])} periods")
    
    def test_update_lineup_with_players(self, admin_headers, match_id):
        """Test updating lineup with player assignments"""
        # Get team members to assign
        response = requests.get(f"{BASE_URL}/api/teams", headers=admin_headers)
        teams = response.json()
        
        if teams:
            team_id = teams[0]["id"]
            response = requests.get(f"{BASE_URL}/api/teams/{team_id}/members", headers=admin_headers)
            members = response.json()
            
            # Get players only
            players = [m for m in members if m.get("role") == "jogador" or m.get("team_role") == "jogador"]
            
            if players:
                lineup_data = {
                    "periods": [
                        {
                            "id": "test-period-1",
                            "name": "1ª Parte",
                            "order": 1,
                            "positions": [
                                {
                                    "position": "guarda_redes",
                                    "player_id": players[0]["id"] if len(players) > 0 else None,
                                    "player_name": players[0]["name"] if len(players) > 0 else None
                                }
                            ],
                            "notes": "TEST lineup"
                        }
                    ]
                }
                
                response = requests.post(
                    f"{BASE_URL}/api/championships/matches/{match_id}/lineup",
                    headers=admin_headers,
                    json=lineup_data
                )
                assert response.status_code == 200
                print(f"✓ Lineup updated with player {players[0]['name']}")
            else:
                print("⚠ No players found to assign to lineup")
        else:
            pytest.skip("No teams found")


class TestChampionshipMatches:
    """Test championship match operations"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_get_championship(self, admin_headers):
        """Test getting championship details"""
        response = requests.get(
            f"{BASE_URL}/api/championships/{CHAMPIONSHIP_ID}",
            headers=admin_headers
        )
        assert response.status_code == 200
        championship = response.json()
        assert championship["id"] == CHAMPIONSHIP_ID
        print(f"✓ Got championship: {championship['name']}")
    
    def test_get_championship_matches(self, admin_headers):
        """Test getting matches for championship"""
        response = requests.get(
            f"{BASE_URL}/api/championships/{CHAMPIONSHIP_ID}/matches",
            headers=admin_headers
        )
        assert response.status_code == 200
        matches = response.json()
        assert isinstance(matches, list)
        print(f"✓ Got {len(matches)} matches for championship")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

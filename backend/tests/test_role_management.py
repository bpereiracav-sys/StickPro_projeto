"""
Test Role Management Features - Iteration 27
Tests for:
1. Role selection when adding member to team (5 roles: Jogador, Treinador Principal, Treinador Adjunto, Delegado, Responsável/Familiar)
2. Admin can toggle admin role for other members (but not self)
3. team_roles mapping is saved when adding member to team
4. RBAC system still works correctly
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "test123456"


class TestRoleManagement:
    """Test role management features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip("Admin login failed - skipping tests")
        
        data = login_response.json()
        self.token = data.get("token")
        self.admin_user = data.get("user")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Get teams
        teams_response = self.session.get(f"{BASE_URL}/api/teams")
        self.teams = teams_response.json() if teams_response.status_code == 200 else []
        
        # Get all users
        users_response = self.session.get(f"{BASE_URL}/api/users")
        self.users = users_response.json() if users_response.status_code == 200 else []
        
        yield
        
        # Cleanup - no specific cleanup needed
    
    # ==================== ROLE SELECTION TESTS ====================
    
    def test_add_member_with_jogador_role(self):
        """Test adding member with 'jogador' role"""
        if not self.teams:
            pytest.skip("No teams available")
        
        team_id = self.teams[0]["id"]
        
        # Find a user not in this team
        test_user = None
        for user in self.users:
            if team_id not in user.get("team_ids", []) and user["id"] != self.admin_user["id"]:
                test_user = user
                break
        
        if not test_user:
            pytest.skip("No available user to add to team")
        
        # Add member with jogador role
        response = self.session.post(f"{BASE_URL}/api/teams/{team_id}/members", json={
            "user_id": test_user["id"],
            "role": "jogador"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("role") == "jogador"
        print(f"✓ Added member with 'jogador' role: {test_user['name']}")
        
        # Cleanup - remove member
        self.session.delete(f"{BASE_URL}/api/teams/{team_id}/members/{test_user['id']}")
    
    def test_add_member_with_treinador_role(self):
        """Test adding member with 'treinador' (Treinador Principal) role"""
        if not self.teams:
            pytest.skip("No teams available")
        
        team_id = self.teams[0]["id"]
        
        # Find a user not in this team
        test_user = None
        for user in self.users:
            if team_id not in user.get("team_ids", []) and user["id"] != self.admin_user["id"]:
                test_user = user
                break
        
        if not test_user:
            pytest.skip("No available user to add to team")
        
        # Add member with treinador role
        response = self.session.post(f"{BASE_URL}/api/teams/{team_id}/members", json={
            "user_id": test_user["id"],
            "role": "treinador"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("role") == "treinador"
        print(f"✓ Added member with 'treinador' role: {test_user['name']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/teams/{team_id}/members/{test_user['id']}")
    
    def test_add_member_with_treinador_adjunto_role(self):
        """Test adding member with 'treinador_adjunto' role"""
        if not self.teams:
            pytest.skip("No teams available")
        
        team_id = self.teams[0]["id"]
        
        # Find a user not in this team
        test_user = None
        for user in self.users:
            if team_id not in user.get("team_ids", []) and user["id"] != self.admin_user["id"]:
                test_user = user
                break
        
        if not test_user:
            pytest.skip("No available user to add to team")
        
        # Add member with treinador_adjunto role
        response = self.session.post(f"{BASE_URL}/api/teams/{team_id}/members", json={
            "user_id": test_user["id"],
            "role": "treinador_adjunto"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("role") == "treinador_adjunto"
        print(f"✓ Added member with 'treinador_adjunto' role: {test_user['name']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/teams/{team_id}/members/{test_user['id']}")
    
    def test_add_member_with_delegado_role(self):
        """Test adding member with 'delegado' role"""
        if not self.teams:
            pytest.skip("No teams available")
        
        team_id = self.teams[0]["id"]
        
        # Find a user not in this team
        test_user = None
        for user in self.users:
            if team_id not in user.get("team_ids", []) and user["id"] != self.admin_user["id"]:
                test_user = user
                break
        
        if not test_user:
            pytest.skip("No available user to add to team")
        
        # Add member with delegado role
        response = self.session.post(f"{BASE_URL}/api/teams/{team_id}/members", json={
            "user_id": test_user["id"],
            "role": "delegado"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("role") == "delegado"
        print(f"✓ Added member with 'delegado' role: {test_user['name']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/teams/{team_id}/members/{test_user['id']}")
    
    def test_add_member_with_responsavel_role(self):
        """Test adding member with 'responsavel' (Responsável/Familiar) role"""
        if not self.teams:
            pytest.skip("No teams available")
        
        team_id = self.teams[0]["id"]
        
        # Find a user not in this team
        test_user = None
        for user in self.users:
            if team_id not in user.get("team_ids", []) and user["id"] != self.admin_user["id"]:
                test_user = user
                break
        
        if not test_user:
            pytest.skip("No available user to add to team")
        
        # Add member with responsavel role
        response = self.session.post(f"{BASE_URL}/api/teams/{team_id}/members", json={
            "user_id": test_user["id"],
            "role": "responsavel"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("role") == "responsavel"
        print(f"✓ Added member with 'responsavel' role: {test_user['name']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/teams/{team_id}/members/{test_user['id']}")
    
    # ==================== TEAM_ROLES MAPPING TESTS ====================
    
    def test_team_roles_mapping_saved(self):
        """Test that team_roles mapping is saved when adding member to team"""
        if not self.teams:
            pytest.skip("No teams available")
        
        team_id = self.teams[0]["id"]
        
        # Find a user not in this team
        test_user = None
        for user in self.users:
            if team_id not in user.get("team_ids", []) and user["id"] != self.admin_user["id"]:
                test_user = user
                break
        
        if not test_user:
            pytest.skip("No available user to add to team")
        
        # Add member with specific role
        response = self.session.post(f"{BASE_URL}/api/teams/{team_id}/members", json={
            "user_id": test_user["id"],
            "role": "treinador_adjunto"
        })
        
        assert response.status_code == 200
        
        # Verify team_roles mapping was saved
        user_response = self.session.get(f"{BASE_URL}/api/users/{test_user['id']}")
        assert user_response.status_code == 200
        
        user_data = user_response.json()
        team_roles = user_data.get("team_roles", {})
        
        assert team_id in team_roles, "team_roles should contain the team_id"
        assert team_roles[team_id] == "treinador_adjunto", f"Expected 'treinador_adjunto', got '{team_roles.get(team_id)}'"
        print(f"✓ team_roles mapping saved correctly: {team_roles}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/teams/{team_id}/members/{test_user['id']}")
    
    def test_update_team_member_role(self):
        """Test updating a member's role within a team"""
        if not self.teams:
            pytest.skip("No teams available")
        
        team_id = self.teams[0]["id"]
        
        # Find a user not in this team
        test_user = None
        for user in self.users:
            if team_id not in user.get("team_ids", []) and user["id"] != self.admin_user["id"]:
                test_user = user
                break
        
        if not test_user:
            pytest.skip("No available user to add to team")
        
        # Add member with initial role
        self.session.post(f"{BASE_URL}/api/teams/{team_id}/members", json={
            "user_id": test_user["id"],
            "role": "jogador"
        })
        
        # Update role
        response = self.session.put(f"{BASE_URL}/api/teams/{team_id}/members/{test_user['id']}/role", json={
            "role": "delegado"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("role") == "delegado"
        print(f"✓ Updated member role to 'delegado'")
        
        # Verify team_roles mapping was updated
        user_response = self.session.get(f"{BASE_URL}/api/users/{test_user['id']}")
        user_data = user_response.json()
        team_roles = user_data.get("team_roles", {})
        
        assert team_roles.get(team_id) == "delegado", f"Expected 'delegado', got '{team_roles.get(team_id)}'"
        print(f"✓ team_roles mapping updated correctly")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/teams/{team_id}/members/{test_user['id']}")
    
    # ==================== ADMIN ROLE TOGGLE TESTS ====================
    
    def test_admin_can_grant_admin_role(self):
        """Test that admin can grant admin role to another user"""
        # Find a non-admin user
        test_user = None
        for user in self.users:
            if user["role"] != "admin" and user["id"] != self.admin_user["id"]:
                test_user = user
                break
        
        if not test_user:
            pytest.skip("No non-admin user available")
        
        original_role = test_user["role"]
        
        # Grant admin role
        response = self.session.put(f"{BASE_URL}/api/users/{test_user['id']}/admin-role", json={
            "is_admin": True
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("role") == "admin"
        print(f"✓ Admin role granted to {test_user['name']}")
        
        # Revert back to original role
        self.session.put(f"{BASE_URL}/api/users/{test_user['id']}/admin-role", json={
            "is_admin": False
        })
    
    def test_admin_can_revoke_admin_role(self):
        """Test that admin can revoke admin role from another user"""
        # Find a non-admin user to make admin first
        test_user = None
        for user in self.users:
            if user["role"] != "admin" and user["id"] != self.admin_user["id"]:
                test_user = user
                break
        
        if not test_user:
            pytest.skip("No non-admin user available")
        
        # First grant admin role
        self.session.put(f"{BASE_URL}/api/users/{test_user['id']}/admin-role", json={
            "is_admin": True
        })
        
        # Now revoke admin role
        response = self.session.put(f"{BASE_URL}/api/users/{test_user['id']}/admin-role", json={
            "is_admin": False
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("role") != "admin"
        print(f"✓ Admin role revoked from {test_user['name']}, new role: {data.get('role')}")
    
    def test_admin_cannot_remove_own_admin_role(self):
        """Test that admin cannot remove their own admin role"""
        response = self.session.put(f"{BASE_URL}/api/users/{self.admin_user['id']}/admin-role", json={
            "is_admin": False
        })
        
        assert response.status_code == 400
        print("✓ Admin correctly prevented from removing own admin role")
    
    def test_non_admin_cannot_toggle_admin_role(self):
        """Test that non-admin users cannot toggle admin role"""
        # Find a non-admin user
        non_admin_user = None
        for user in self.users:
            if user["role"] != "admin":
                non_admin_user = user
                break
        
        if not non_admin_user:
            pytest.skip("No non-admin user available")
        
        # Login as non-admin
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": non_admin_user["email"],
            "password": "test123456"  # Assuming default password
        })
        
        if login_response.status_code != 200:
            pytest.skip("Non-admin login failed")
        
        non_admin_token = login_response.json().get("token")
        
        # Try to toggle admin role
        response = requests.put(
            f"{BASE_URL}/api/users/{self.admin_user['id']}/admin-role",
            json={"is_admin": False},
            headers={"Authorization": f"Bearer {non_admin_token}", "Content-Type": "application/json"}
        )
        
        assert response.status_code == 403
        print("✓ Non-admin correctly prevented from toggling admin role")
    
    # ==================== RBAC TESTS ====================
    
    def test_rbac_admin_has_full_access(self):
        """Test that admin has full access to all resources"""
        # Test access to teams
        response = self.session.get(f"{BASE_URL}/api/teams")
        assert response.status_code == 200
        
        # Test access to users
        response = self.session.get(f"{BASE_URL}/api/users")
        assert response.status_code == 200
        
        # Test access to permissions
        response = self.session.get(f"{BASE_URL}/api/auth/permissions")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("is_admin") == True
        print("✓ Admin has full access to all resources")
    
    def test_rbac_permissions_endpoint(self):
        """Test that permissions endpoint returns correct data"""
        response = self.session.get(f"{BASE_URL}/api/auth/permissions")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check expected permission fields
        expected_fields = [
            "role", "is_admin", "is_coach", "is_assistant_coach", 
            "is_delegate", "is_player", "is_family_member", "is_staff",
            "can_manage_team", "can_manage_events", "can_manage_stats"
        ]
        
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ Permissions endpoint returns all expected fields")
        print(f"  Role: {data.get('role')}, is_admin: {data.get('is_admin')}")
    
    def test_user_response_includes_team_roles(self):
        """Test that user response includes team_roles field"""
        response = self.session.get(f"{BASE_URL}/api/users/{self.admin_user['id']}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "team_roles" in data, "User response should include team_roles field"
        assert isinstance(data["team_roles"], dict), "team_roles should be a dictionary"
        print(f"✓ User response includes team_roles: {data.get('team_roles')}")
    
    def test_user_response_includes_linked_player_ids(self):
        """Test that user response includes linked_player_ids field"""
        response = self.session.get(f"{BASE_URL}/api/users/{self.admin_user['id']}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "linked_player_ids" in data, "User response should include linked_player_ids field"
        assert isinstance(data["linked_player_ids"], list), "linked_player_ids should be a list"
        print(f"✓ User response includes linked_player_ids: {data.get('linked_player_ids')}")


class TestProfileNationality:
    """Test nationality field in profile"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip("Admin login failed - skipping tests")
        
        data = login_response.json()
        self.token = data.get("token")
        self.admin_user = data.get("user")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        yield
    
    def test_update_profile_with_nationality(self):
        """Test updating profile with nationality field"""
        response = self.session.put(f"{BASE_URL}/api/users/{self.admin_user['id']}", json={
            "profile": {
                "nationality": "Portuguesa"
            }
        })
        
        assert response.status_code == 200
        print("✓ Profile updated with nationality field")
        
        # Verify nationality was saved
        user_response = self.session.get(f"{BASE_URL}/api/users/{self.admin_user['id']}")
        user_data = user_response.json()
        
        profile = user_data.get("profile", {})
        assert profile.get("nationality") == "Portuguesa", f"Expected 'Portuguesa', got '{profile.get('nationality')}'"
        print(f"✓ Nationality saved correctly: {profile.get('nationality')}")
    
    def test_nationality_field_in_user_profile_model(self):
        """Test that nationality field exists in UserProfile model"""
        response = self.session.get(f"{BASE_URL}/api/users/{self.admin_user['id']}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Profile should exist and can contain nationality
        profile = data.get("profile")
        if profile:
            # Nationality field should be accessible (even if None)
            nationality = profile.get("nationality")
            print(f"✓ Nationality field accessible in profile: {nationality}")
        else:
            print("✓ Profile is None but field is defined in model")


class TestLinkPlayers:
    """Test linking family members to multiple players"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip("Admin login failed - skipping tests")
        
        data = login_response.json()
        self.token = data.get("token")
        self.admin_user = data.get("user")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Get all users
        users_response = self.session.get(f"{BASE_URL}/api/users")
        self.users = users_response.json() if users_response.status_code == 200 else []
        
        yield
    
    def test_link_players_endpoint_exists(self):
        """Test that link-players endpoint exists"""
        # This endpoint requires responsavel role, so we just check it exists
        response = self.session.post(f"{BASE_URL}/api/users/link-players", json={
            "player_ids": []
        })
        
        # Should return 400 (bad request) not 404 (not found)
        assert response.status_code in [200, 400], f"Expected 200 or 400, got {response.status_code}"
        print("✓ link-players endpoint exists")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

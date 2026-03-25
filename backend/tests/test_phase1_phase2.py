"""
Test Phase 1 (Permission System) and Phase 2 (New Layout and Navigation) features
- Club CRUD operations
- Permissions system
- User profile with extended data (identity, family, biometric, sports, equipment)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "test123456"
USER_EMAIL = "test@example.com"
USER_PASSWORD = "test123456"


class TestAuthAndSetup:
    """Authentication tests and setup verification"""
    
    def test_admin_login(self):
        """Test admin login returns token and correct role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful - role: {data['user']['role']}")
    
    def test_user_login(self):
        """Test regular user login returns token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        assert response.status_code == 200, f"User login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        print(f"✓ User login successful - role: {data['user']['role']}")


class TestClubEndpoints:
    """Club CRUD operations tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture
    def user_token(self):
        """Get regular user authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("User authentication failed")
    
    def test_get_clubs_list(self, admin_token):
        """Test GET /api/clubs returns list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/clubs", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/clubs - returned {len(data)} clubs")
    
    def test_create_club_admin_only(self, admin_token, user_token):
        """Test POST /api/clubs - only admin can create"""
        club_data = {
            "name": f"TEST_Club_{uuid.uuid4().hex[:8]}",
            "logo_url": "https://example.com/logo.png",
            "city": "Lisboa",
            "country": "Portugal",
            "founded_year": 2020
        }
        
        # Admin should be able to create
        headers_admin = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(f"{BASE_URL}/api/clubs", json=club_data, headers=headers_admin)
        assert response.status_code == 200, f"Admin create club failed: {response.text}"
        created_club = response.json()
        assert created_club["name"] == club_data["name"]
        assert "id" in created_club
        print(f"✓ Admin created club: {created_club['name']}")
        
        # Regular user should NOT be able to create
        headers_user = {"Authorization": f"Bearer {user_token}"}
        response = requests.post(f"{BASE_URL}/api/clubs", json=club_data, headers=headers_user)
        assert response.status_code == 403, f"Non-admin should not create club: {response.status_code}"
        print("✓ Non-admin correctly denied club creation")
    
    def test_update_club(self, admin_token):
        """Test PUT /api/clubs/{id} - update club info"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First get existing clubs
        response = requests.get(f"{BASE_URL}/api/clubs", headers=headers)
        clubs = response.json()
        
        if not clubs:
            # Create a club first
            club_data = {"name": f"TEST_UpdateClub_{uuid.uuid4().hex[:8]}"}
            response = requests.post(f"{BASE_URL}/api/clubs", json=club_data, headers=headers)
            club = response.json()
        else:
            club = clubs[0]
        
        # Update the club
        update_data = {
            "website": "https://updated-website.com",
            "email": "updated@club.pt",
            "phone": "+351 999 999 999"
        }
        response = requests.put(f"{BASE_URL}/api/clubs/{club['id']}", json=update_data, headers=headers)
        assert response.status_code == 200, f"Update club failed: {response.text}"
        print(f"✓ Club updated successfully")
        
        # Verify update
        response = requests.get(f"{BASE_URL}/api/clubs/{club['id']}", headers=headers)
        assert response.status_code == 200
        updated_club = response.json()
        assert updated_club["website"] == update_data["website"]
        print(f"✓ Club update verified - website: {updated_club['website']}")


class TestPermissionsEndpoints:
    """Permission system tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture
    def user_token(self):
        """Get regular user authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("User authentication failed")
    
    def test_get_default_permissions_admin_only(self, admin_token, user_token):
        """Test GET /api/permissions/defaults - admin only"""
        # Admin should see defaults
        headers_admin = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/permissions/defaults", headers=headers_admin)
        assert response.status_code == 200
        data = response.json()
        assert "admin" in data
        assert "jogador" in data
        assert "treinador" in data
        assert data["admin"]["can_view_all"] == True
        assert data["jogador"]["can_edit_own_profile"] == True
        print(f"✓ Admin can view default permissions - roles: {list(data.keys())}")
        
        # Regular user should NOT see defaults
        headers_user = {"Authorization": f"Bearer {user_token}"}
        response = requests.get(f"{BASE_URL}/api/permissions/defaults", headers=headers_user)
        assert response.status_code == 403
        print("✓ Non-admin correctly denied access to default permissions")
    
    def test_get_user_permissions(self, admin_token, user_token):
        """Test GET /api/permissions/{user_id}"""
        # Get user info first
        headers_user = {"Authorization": f"Bearer {user_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers_user)
        user = response.json()
        user_id = user["id"]
        
        # User can see own permissions
        response = requests.get(f"{BASE_URL}/api/permissions/{user_id}", headers=headers_user)
        assert response.status_code == 200
        permissions = response.json()
        # Check for common permission keys that exist in all roles
        assert "can_view_all" in permissions
        assert "can_manage_teams" in permissions
        print(f"✓ User can view own permissions - role permissions: {list(permissions.keys())}")
        
        # Admin can see any user's permissions
        headers_admin = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/permissions/{user_id}", headers=headers_admin)
        assert response.status_code == 200
        print(f"✓ Admin can view user permissions")


class TestUserProfileEndpoints:
    """User profile with extended data tests"""
    
    @pytest.fixture
    def user_token_and_id(self):
        """Get user authentication token and user ID"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            return data["token"], data["user"]["id"]
        pytest.skip("User authentication failed")
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin authentication failed")
    
    def test_update_profile_identity(self, user_token_and_id):
        """Test PUT /api/users/{id} - update identity data"""
        token, user_id = user_token_and_id
        headers = {"Authorization": f"Bearer {token}"}
        
        profile_data = {
            "profile": {
                "first_name": "João",
                "surname": "Teste",
                "nickname": "JT",
                "birth_date": "1990-05-15",
                "fpp_license": "FPP-12345"
            }
        }
        
        response = requests.put(f"{BASE_URL}/api/users/{user_id}", json=profile_data, headers=headers)
        assert response.status_code == 200, f"Update profile failed: {response.text}"
        print("✓ Profile identity data updated")
        
        # Verify update
        response = requests.get(f"{BASE_URL}/api/users/{user_id}", headers=headers)
        assert response.status_code == 200
        user = response.json()
        assert user.get("profile", {}).get("first_name") == "João"
        print(f"✓ Profile identity verified - first_name: {user['profile']['first_name']}")
    
    def test_update_profile_biometric(self, user_token_and_id):
        """Test PUT /api/users/{id} - update biometric data"""
        token, user_id = user_token_and_id
        headers = {"Authorization": f"Bearer {token}"}
        
        profile_data = {
            "profile": {
                "weight": 75.5,
                "height": 180,
                "shoe_size": "42"
            }
        }
        
        response = requests.put(f"{BASE_URL}/api/users/{user_id}", json=profile_data, headers=headers)
        assert response.status_code == 200
        print("✓ Profile biometric data updated")
        
        # Verify
        response = requests.get(f"{BASE_URL}/api/users/{user_id}", headers=headers)
        user = response.json()
        assert user.get("profile", {}).get("weight") == 75.5
        assert user.get("profile", {}).get("height") == 180
        print(f"✓ Profile biometric verified - weight: {user['profile']['weight']}, height: {user['profile']['height']}")
    
    def test_update_profile_sports(self, user_token_and_id):
        """Test PUT /api/users/{id} - update sports data"""
        token, user_id = user_token_and_id
        headers = {"Authorization": f"Bearer {token}"}
        
        profile_data = {
            "profile": {
                "year_joined_club": 2020,
                "fpp_number": "FPP-67890",
                "function": "jogador",
                "position": "JC",
                "jersey_number": 10
            }
        }
        
        response = requests.put(f"{BASE_URL}/api/users/{user_id}", json=profile_data, headers=headers)
        assert response.status_code == 200
        print("✓ Profile sports data updated")
        
        # Verify
        response = requests.get(f"{BASE_URL}/api/users/{user_id}", headers=headers)
        user = response.json()
        assert user.get("profile", {}).get("position") == "JC"
        assert user.get("profile", {}).get("jersey_number") == 10
        print(f"✓ Profile sports verified - position: {user['profile']['position']}, jersey: {user['profile']['jersey_number']}")
    
    def test_update_profile_equipment(self, user_token_and_id):
        """Test PUT /api/users/{id} - update equipment sizes"""
        token, user_id = user_token_and_id
        headers = {"Authorization": f"Bearer {token}"}
        
        profile_data = {
            "profile": {
                "training_kit_size": "M",
                "tracksuit_size": "L",
                "polo_size": "M",
                "training_sock_size": "39-42"
            }
        }
        
        response = requests.put(f"{BASE_URL}/api/users/{user_id}", json=profile_data, headers=headers)
        assert response.status_code == 200
        print("✓ Profile equipment data updated")
        
        # Verify
        response = requests.get(f"{BASE_URL}/api/users/{user_id}", headers=headers)
        user = response.json()
        assert user.get("profile", {}).get("training_kit_size") == "M"
        print(f"✓ Profile equipment verified - training_kit: {user['profile']['training_kit_size']}")
    
    def test_update_profile_family_members(self, user_token_and_id):
        """Test PUT /api/users/{id} - update family members"""
        token, user_id = user_token_and_id
        headers = {"Authorization": f"Bearer {token}"}
        
        profile_data = {
            "profile": {
                "family_members": [
                    {
                        "id": "fam-001",
                        "first_name": "Maria",
                        "surname": "Teste",
                        "email": "maria@example.com",
                        "phone": "+351 912 345 678",
                        "relationship": "mae"
                    },
                    {
                        "id": "fam-002",
                        "first_name": "José",
                        "surname": "Teste",
                        "email": "jose@example.com",
                        "phone": "+351 912 345 679",
                        "relationship": "pai"
                    }
                ]
            }
        }
        
        response = requests.put(f"{BASE_URL}/api/users/{user_id}", json=profile_data, headers=headers)
        assert response.status_code == 200
        print("✓ Profile family members updated")
        
        # Verify
        response = requests.get(f"{BASE_URL}/api/users/{user_id}", headers=headers)
        user = response.json()
        family = user.get("profile", {}).get("family_members", [])
        assert len(family) == 2
        print(f"✓ Profile family verified - {len(family)} members")
    
    def test_user_cannot_edit_other_profile(self, user_token_and_id, admin_token):
        """Test that regular user cannot edit another user's profile"""
        token, user_id = user_token_and_id
        
        # Get admin user ID
        headers_admin = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers_admin)
        admin_id = response.json()["id"]
        
        # Try to update admin's profile as regular user
        headers_user = {"Authorization": f"Bearer {token}"}
        profile_data = {"profile": {"nickname": "Hacked"}}
        
        response = requests.put(f"{BASE_URL}/api/users/{admin_id}", json=profile_data, headers=headers_user)
        assert response.status_code == 403, f"User should not edit other's profile: {response.status_code}"
        print("✓ User correctly denied editing another user's profile")


class TestNavigationEndpoints:
    """Test endpoints used by TopNavBar navigation"""
    
    @pytest.fixture
    def user_token(self):
        """Get user authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("User authentication failed")
    
    def test_get_teams_for_navigation(self, user_token):
        """Test GET /api/teams - used by 'Minhas Equipas' menu"""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.get(f"{BASE_URL}/api/teams", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/teams - returned {len(data)} teams for navigation")
    
    def test_get_associated_for_navigation(self, user_token):
        """Test GET /api/users/associated - used by 'Equipas dos Meus Filhos' menu"""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.get(f"{BASE_URL}/api/users/associated", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/users/associated - returned {len(data)} associated accounts")
    
    def test_get_auth_me(self, user_token):
        """Test GET /api/auth/me - used for user menu"""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "name" in data
        assert "role" in data
        print(f"✓ GET /api/auth/me - user: {data['name']}, role: {data['role']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

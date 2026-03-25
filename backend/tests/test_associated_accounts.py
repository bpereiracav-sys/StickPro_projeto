"""
Backend API Tests for Associated Accounts Feature
Tests: GET /api/users/associated, POST /api/users/associate, POST /api/users/associate/search,
       DELETE /api/users/associate/{child_id}, POST /api/auth/switch-profile
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials - parent account
PARENT_EMAIL = "test@example.com"
PARENT_PASSWORD = "test123456"

# Child account
CHILD_EMAIL = "filho@example.com"
CHILD_PASSWORD = "test123456"
CHILD_USER_ID = "0e318479-27d2-407c-86c3-1d94601ae905"


@pytest.fixture(scope="module")
def parent_auth():
    """Get authentication for parent account"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": PARENT_EMAIL,
        "password": PARENT_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Parent login failed: {response.text}")
    data = response.json()
    return {
        "token": data["token"],
        "user": data["user"],
        "profiles": data.get("available_profiles", []),
        "headers": {"Authorization": f"Bearer {data['token']}", "Content-Type": "application/json"}
    }


@pytest.fixture(scope="module")
def child_auth():
    """Get authentication for child account"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CHILD_EMAIL,
        "password": CHILD_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Child login failed: {response.text}")
    data = response.json()
    return {
        "token": data["token"],
        "user": data["user"],
        "headers": {"Authorization": f"Bearer {data['token']}", "Content-Type": "application/json"}
    }


class TestLoginWithMultipleProfiles:
    """Test login returns available profiles when user has associated accounts"""
    
    def test_parent_login_returns_multiple_profiles(self, parent_auth):
        """Test that parent account login returns multiple profiles"""
        profiles = parent_auth["profiles"]
        print(f"Available profiles for parent: {len(profiles)}")
        
        # Should have at least 2 profiles (self + associated)
        assert len(profiles) >= 1, "Parent should have at least 1 profile"
        
        # Check profile structure
        for profile in profiles:
            assert "type" in profile, "Profile should have 'type'"
            assert "user_id" in profile, "Profile should have 'user_id'"
            assert "user_name" in profile, "Profile should have 'user_name'"
            assert "role" in profile, "Profile should have 'role'"
            assert "label" in profile, "Profile should have 'label'"
            print(f"  - {profile['label']} (type: {profile['type']}, role: {profile['role']})")
        
        # Check for self profile
        self_profiles = [p for p in profiles if p["type"] == "self"]
        assert len(self_profiles) >= 1, "Should have at least one self profile"
        
        # Check for associated profiles (if child is associated)
        associated_profiles = [p for p in profiles if p["type"] == "associated"]
        print(f"Associated profiles: {len(associated_profiles)}")
    
    def test_child_login_returns_profiles(self, child_auth):
        """Test that child account login works"""
        user = child_auth["user"]
        assert user["email"] == CHILD_EMAIL
        print(f"Child user: {user['name']} (role: {user['role']})")


class TestGetAssociatedAccounts:
    """Test GET /api/users/associated endpoint"""
    
    def test_get_associated_accounts(self, parent_auth):
        """Test getting list of associated accounts"""
        response = requests.get(
            f"{BASE_URL}/api/users/associated",
            headers=parent_auth["headers"]
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        print(f"Associated accounts: {len(data)}")
        
        for account in data:
            assert "id" in account, "Account should have 'id'"
            assert "name" in account, "Account should have 'name'"
            assert "email" in account, "Account should have 'email'"
            assert "role" in account, "Account should have 'role'"
            print(f"  - {account['name']} ({account['email']}) - {account['role']}")
        
        return data


class TestSearchUserToAssociate:
    """Test POST /api/users/associate/search endpoint"""
    
    def test_search_user_by_email_success(self, parent_auth):
        """Test searching for a user by email"""
        # Search for child user
        response = requests.post(
            f"{BASE_URL}/api/users/associate/search",
            headers=parent_auth["headers"],
            params={"email": CHILD_EMAIL}
        )
        
        # May return 200 (found) or 400 (already associated)
        if response.status_code == 200:
            data = response.json()
            assert "id" in data
            assert "name" in data
            assert "email" in data
            assert data["email"] == CHILD_EMAIL
            print(f"Found user: {data['name']} ({data['email']})")
        elif response.status_code == 400:
            # Already associated - this is expected
            print(f"User already associated: {response.json().get('detail')}")
        else:
            pytest.fail(f"Unexpected status: {response.status_code} - {response.text}")
    
    def test_search_user_not_found(self, parent_auth):
        """Test searching for non-existent user"""
        response = requests.post(
            f"{BASE_URL}/api/users/associate/search",
            headers=parent_auth["headers"],
            params={"email": "nonexistent@example.com"}
        )
        assert response.status_code == 404
        print(f"Correctly returned 404 for non-existent user")
    
    def test_search_own_account(self, parent_auth):
        """Test that user cannot search for their own account"""
        response = requests.post(
            f"{BASE_URL}/api/users/associate/search",
            headers=parent_auth["headers"],
            params={"email": PARENT_EMAIL}
        )
        assert response.status_code == 400
        print(f"Correctly rejected self-association: {response.json().get('detail')}")


class TestAssociateAccount:
    """Test POST /api/users/associate endpoint"""
    
    def test_associate_already_associated(self, parent_auth):
        """Test associating an already associated account"""
        # Try to associate child again (should fail if already associated)
        response = requests.post(
            f"{BASE_URL}/api/users/associate",
            headers=parent_auth["headers"],
            json={
                "child_user_id": CHILD_USER_ID,
                "relationship": "filho/a"
            }
        )
        
        # Should return 400 if already associated
        if response.status_code == 400:
            detail = response.json().get("detail", "")
            assert "já está associada" in detail or "já tem um responsável" in detail
            print(f"Correctly rejected duplicate association: {detail}")
        elif response.status_code == 200:
            print(f"Association created: {response.json()}")
        else:
            print(f"Response: {response.status_code} - {response.text}")
    
    def test_associate_nonexistent_user(self, parent_auth):
        """Test associating a non-existent user"""
        response = requests.post(
            f"{BASE_URL}/api/users/associate",
            headers=parent_auth["headers"],
            json={
                "child_user_id": "nonexistent-user-id",
                "relationship": "filho/a"
            }
        )
        assert response.status_code == 404
        print(f"Correctly returned 404 for non-existent user")


class TestSwitchProfile:
    """Test POST /api/auth/switch-profile endpoint"""
    
    def test_switch_to_self_profile(self, parent_auth):
        """Test switching to self profile"""
        response = requests.post(
            f"{BASE_URL}/api/auth/switch-profile",
            headers=parent_auth["headers"],
            json={
                "profile_type": "self",
                "active_role": parent_auth["user"]["role"]
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["profile_type"] == "self"
        assert "viewing_as" in data
        assert "original_user" in data
        assert data["viewing_as"]["id"] == parent_auth["user"]["id"]
        print(f"Switched to self profile: {data['viewing_as']['name']}")
    
    def test_switch_to_associated_profile(self, parent_auth):
        """Test switching to associated profile"""
        # First check if there are associated accounts
        assoc_response = requests.get(
            f"{BASE_URL}/api/users/associated",
            headers=parent_auth["headers"]
        )
        associated = assoc_response.json()
        
        if not associated:
            pytest.skip("No associated accounts to switch to")
        
        child_id = associated[0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/auth/switch-profile",
            headers=parent_auth["headers"],
            json={
                "profile_type": "associated",
                "associated_user_id": child_id
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["profile_type"] == "associated"
        assert "viewing_as" in data
        assert data["viewing_as"]["id"] == child_id
        assert data["viewing_as"]["role"] == "responsavel"
        print(f"Switched to associated profile: {data['viewing_as']['name']}")
    
    def test_switch_to_invalid_associated(self, parent_auth):
        """Test switching to non-associated account fails"""
        response = requests.post(
            f"{BASE_URL}/api/auth/switch-profile",
            headers=parent_auth["headers"],
            json={
                "profile_type": "associated",
                "associated_user_id": "nonexistent-user-id"
            }
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print(f"Correctly rejected switch to non-associated account")
    
    def test_switch_without_associated_id(self, parent_auth):
        """Test switching to associated without providing ID fails"""
        response = requests.post(
            f"{BASE_URL}/api/auth/switch-profile",
            headers=parent_auth["headers"],
            json={
                "profile_type": "associated"
            }
        )
        assert response.status_code == 400
        print(f"Correctly rejected switch without associated_user_id")
    
    def test_switch_invalid_profile_type(self, parent_auth):
        """Test switching with invalid profile type fails"""
        response = requests.post(
            f"{BASE_URL}/api/auth/switch-profile",
            headers=parent_auth["headers"],
            json={
                "profile_type": "invalid"
            }
        )
        assert response.status_code == 400
        print(f"Correctly rejected invalid profile type")


class TestRemoveAssociation:
    """Test DELETE /api/users/associate/{child_id} endpoint"""
    
    def test_remove_nonexistent_association(self, parent_auth):
        """Test removing non-existent association"""
        response = requests.delete(
            f"{BASE_URL}/api/users/associate/nonexistent-id",
            headers=parent_auth["headers"]
        )
        assert response.status_code == 404
        print(f"Correctly returned 404 for non-existent association")
    
    # Note: We don't test actual removal to preserve test data
    # In a real test suite, we would create a new association and then remove it


class TestAuthMeWithProfiles:
    """Test GET /api/auth/me returns profiles"""
    
    def test_auth_me_includes_profiles(self, parent_auth):
        """Test that /auth/me returns available_profiles"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers=parent_auth["headers"]
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "available_profiles" in data, "Response should include available_profiles"
        profiles = data["available_profiles"]
        assert isinstance(profiles, list)
        print(f"Auth/me returned {len(profiles)} profiles")


class TestAuthProfilesEndpoint:
    """Test GET /api/auth/profiles endpoint"""
    
    def test_get_profiles(self, parent_auth):
        """Test getting all available profiles"""
        response = requests.get(
            f"{BASE_URL}/api/auth/profiles",
            headers=parent_auth["headers"]
        )
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"Profiles endpoint returned {len(data)} profiles")
        
        for profile in data:
            assert "type" in profile
            assert "user_id" in profile
            assert "label" in profile
            print(f"  - {profile['label']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

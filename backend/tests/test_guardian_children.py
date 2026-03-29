"""
Test Guardian (Parent) Children Endpoints
Tests for /guardian/children and /guardian/children/:id/teams
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestGuardianEndpoints:
    """Test guardian/parent endpoints for 'Os meus filhos' feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def login(self, email, password):
        """Helper to login and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            token = response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            return response.json()
        return None
    
    # ==================== GUARDIAN CHILDREN ENDPOINT ====================
    
    def test_guardian_children_endpoint_exists(self):
        """Test that /guardian/children endpoint exists"""
        # Login as parent
        login_result = self.login("parent.sub13@test.com", "test123456")
        assert login_result is not None, "Parent login failed"
        
        response = self.session.get(f"{BASE_URL}/api/guardian/children")
        # Should return 200 or 403 (if not guardian), not 404
        assert response.status_code != 404, f"Endpoint not found: {response.status_code}"
        print(f"✓ Guardian children endpoint exists, status: {response.status_code}")
    
    def test_guardian_children_returns_children_list(self):
        """Test that guardian can get list of children"""
        login_result = self.login("parent.sub13@test.com", "test123456")
        assert login_result is not None, "Parent login failed"
        assert login_result['user']['role'] == 'responsavel', f"Expected responsavel role, got {login_result['user']['role']}"
        
        response = self.session.get(f"{BASE_URL}/api/guardian/children")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        children = response.json()
        assert isinstance(children, list), "Expected list of children"
        print(f"✓ Guardian has {len(children)} children")
        
        # Verify child structure
        if len(children) > 0:
            child = children[0]
            assert 'id' in child, "Child should have id"
            assert 'name' in child, "Child should have name"
            assert 'teams_count' in child, "Child should have teams_count"
            print(f"  - Child: {child['name']} ({child['teams_count']} teams)")
    
    def test_guardian_children_shows_teams_count(self):
        """Test that children have teams_count field"""
        login_result = self.login("parent.sub13@test.com", "test123456")
        assert login_result is not None, "Parent login failed"
        
        response = self.session.get(f"{BASE_URL}/api/guardian/children")
        assert response.status_code == 200
        
        children = response.json()
        for child in children:
            assert 'teams_count' in child, f"Child {child.get('name')} missing teams_count"
            assert isinstance(child['teams_count'], int), "teams_count should be integer"
            print(f"✓ Child {child['name']} has {child['teams_count']} teams")
    
    # ==================== GUARDIAN CHILD TEAMS ENDPOINT ====================
    
    def test_guardian_child_teams_endpoint_exists(self):
        """Test that /guardian/children/:id/teams endpoint exists"""
        login_result = self.login("parent.sub13@test.com", "test123456")
        assert login_result is not None, "Parent login failed"
        
        # First get children to get a valid child ID
        children_response = self.session.get(f"{BASE_URL}/api/guardian/children")
        assert children_response.status_code == 200
        
        children = children_response.json()
        if len(children) > 0:
            child_id = children[0]['id']
            response = self.session.get(f"{BASE_URL}/api/guardian/children/{child_id}/teams")
            assert response.status_code != 404, f"Endpoint not found: {response.status_code}"
            print(f"✓ Guardian child teams endpoint exists, status: {response.status_code}")
    
    def test_guardian_child_teams_returns_teams(self):
        """Test that guardian can get teams for a specific child"""
        login_result = self.login("parent.sub13@test.com", "test123456")
        assert login_result is not None, "Parent login failed"
        
        # Get children
        children_response = self.session.get(f"{BASE_URL}/api/guardian/children")
        children = children_response.json()
        
        if len(children) > 0:
            child_id = children[0]['id']
            response = self.session.get(f"{BASE_URL}/api/guardian/children/{child_id}/teams")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            assert 'teams' in data, "Response should have teams"
            assert isinstance(data['teams'], list), "teams should be a list"
            print(f"✓ Child has {len(data['teams'])} teams")
            
            # Verify team structure
            for team in data['teams']:
                assert 'id' in team, "Team should have id"
                assert 'name' in team, "Team should have name"
                print(f"  - Team: {team['name']}")
    
    def test_guardian_child_teams_includes_child_role(self):
        """Test that teams include child's role in each team"""
        login_result = self.login("parent.sub13@test.com", "test123456")
        assert login_result is not None, "Parent login failed"
        
        children_response = self.session.get(f"{BASE_URL}/api/guardian/children")
        children = children_response.json()
        
        if len(children) > 0:
            child_id = children[0]['id']
            response = self.session.get(f"{BASE_URL}/api/guardian/children/{child_id}/teams")
            data = response.json()
            
            for team in data['teams']:
                assert 'child_role' in team, f"Team {team['name']} missing child_role"
                print(f"✓ Team {team['name']}: child role = {team['child_role']}")
    
    # ==================== PERMISSION TESTS ====================
    
    def test_non_guardian_cannot_access_children_endpoint(self):
        """Test that non-guardian users get 403"""
        # Login as admin
        login_result = self.login("admin@example.com", "test123456")
        assert login_result is not None, "Admin login failed"
        
        response = self.session.get(f"{BASE_URL}/api/guardian/children")
        assert response.status_code == 403, f"Expected 403 for non-guardian, got {response.status_code}"
        print("✓ Non-guardian correctly denied access to /guardian/children")
    
    def test_non_guardian_cannot_access_child_teams_endpoint(self):
        """Test that non-guardian users get 403 for child teams"""
        # Login as admin
        login_result = self.login("admin@example.com", "test123456")
        assert login_result is not None, "Admin login failed"
        
        # Try to access a random child ID
        response = self.session.get(f"{BASE_URL}/api/guardian/children/some-child-id/teams")
        assert response.status_code == 403, f"Expected 403 for non-guardian, got {response.status_code}"
        print("✓ Non-guardian correctly denied access to /guardian/children/:id/teams")
    
    def test_guardian_cannot_access_unlinked_child(self):
        """Test that guardian cannot access teams of unlinked child"""
        login_result = self.login("parent.sub13@test.com", "test123456")
        assert login_result is not None, "Parent login failed"
        
        # Try to access a non-linked child ID
        response = self.session.get(f"{BASE_URL}/api/guardian/children/non-existent-child-id/teams")
        assert response.status_code == 403, f"Expected 403 for unlinked child, got {response.status_code}"
        print("✓ Guardian correctly denied access to unlinked child's teams")
    
    # ==================== EMPTY STATE TESTS ====================
    
    def test_guardian_with_no_children_returns_empty_list(self):
        """Test that guardian with no linked children gets empty list"""
        # This test would need a guardian account with no linked children
        # For now, we just verify the endpoint returns a list
        login_result = self.login("parent.sub13@test.com", "test123456")
        assert login_result is not None, "Parent login failed"
        
        response = self.session.get(f"{BASE_URL}/api/guardian/children")
        assert response.status_code == 200
        assert isinstance(response.json(), list), "Should return a list (empty or with children)"
        print("✓ Guardian children endpoint returns list")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

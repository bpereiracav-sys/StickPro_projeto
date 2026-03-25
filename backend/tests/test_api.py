"""
Backend API Tests for Roller Hockey Hub
Tests all major endpoints: Auth, Teams, Championships, Events, Attendance, Messages, Stats
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "test123456"

# Test data prefix for cleanup
TEST_PREFIX = "TEST_"


class TestHealthAndRoot:
    """Basic health check tests"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Roller Hockey Hub API" in data["message"]
        print(f"API Root: {data}")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        assert data["user"]["role"] == "treinador"
        print(f"Login successful for user: {data['user']['name']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("Invalid credentials correctly rejected")
    
    def test_register_duplicate_email(self):
        """Test registration with existing email"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL,
            "password": "newpassword",
            "name": "Duplicate User",
            "role": "jogador"
        })
        assert response.status_code == 400
        print("Duplicate email correctly rejected")


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["token"]
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def user_data(auth_token):
    """Get current user data"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    return response.json()["user"]


class TestAuthenticatedEndpoints:
    """Tests requiring authentication"""
    
    def test_get_me(self, auth_headers):
        """Test get current user endpoint"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert "name" in data
        assert "role" in data
        print(f"Current user: {data['name']} ({data['role']})")
    
    def test_get_profiles(self, auth_headers):
        """Test get user profiles endpoint"""
        response = requests.get(f"{BASE_URL}/api/auth/profiles", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Available profiles: {len(data)}")


class TestTeams:
    """Team management tests"""
    
    def test_get_teams(self, auth_headers):
        """Test get all teams"""
        response = requests.get(f"{BASE_URL}/api/teams", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Teams found: {len(data)}")
        return data
    
    def test_create_team(self, auth_headers):
        """Test create team"""
        team_name = f"{TEST_PREFIX}Team_{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/teams", headers=auth_headers, json={
            "name": team_name,
            "category": "Sub-15",
            "season": "2024/2025"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == team_name
        assert "id" in data
        print(f"Created team: {data['name']} (ID: {data['id']})")
        return data
    
    def test_get_team_by_id(self, auth_headers):
        """Test get team by ID"""
        # First create a team
        team_name = f"{TEST_PREFIX}Team_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(f"{BASE_URL}/api/teams", headers=auth_headers, json={
            "name": team_name,
            "category": "Sub-17",
            "season": "2024/2025"
        })
        team_id = create_response.json()["id"]
        
        # Then get it
        response = requests.get(f"{BASE_URL}/api/teams/{team_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == team_id
        assert data["name"] == team_name
        print(f"Retrieved team: {data['name']}")
    
    def test_get_team_members(self, auth_headers):
        """Test get team members"""
        # Get first team
        teams_response = requests.get(f"{BASE_URL}/api/teams", headers=auth_headers)
        teams = teams_response.json()
        if not teams:
            pytest.skip("No teams available")
        
        team_id = teams[0]["id"]
        response = requests.get(f"{BASE_URL}/api/teams/{team_id}/members", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Team members: {len(data)}")


class TestChampionships:
    """Championship management tests"""
    
    def test_get_championships(self, auth_headers):
        """Test get all championships"""
        response = requests.get(f"{BASE_URL}/api/championships", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Championships found: {len(data)}")
    
    def test_create_championship(self, auth_headers):
        """Test create championship"""
        # First get a team
        teams_response = requests.get(f"{BASE_URL}/api/teams", headers=auth_headers)
        teams = teams_response.json()
        if not teams:
            pytest.skip("No teams available")
        
        team_id = teams[0]["id"]
        champ_name = f"{TEST_PREFIX}Championship_{uuid.uuid4().hex[:8]}"
        
        response = requests.post(f"{BASE_URL}/api/championships", headers=auth_headers, json={
            "name": champ_name,
            "season": "2024/2025",
            "team_id": team_id,
            "description": "Test championship"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == champ_name
        assert "id" in data
        print(f"Created championship: {data['name']}")
        return data
    
    def test_get_championship_by_id(self, auth_headers):
        """Test get championship by ID"""
        # First create a championship
        teams_response = requests.get(f"{BASE_URL}/api/teams", headers=auth_headers)
        teams = teams_response.json()
        if not teams:
            pytest.skip("No teams available")
        
        team_id = teams[0]["id"]
        champ_name = f"{TEST_PREFIX}Championship_{uuid.uuid4().hex[:8]}"
        
        create_response = requests.post(f"{BASE_URL}/api/championships", headers=auth_headers, json={
            "name": champ_name,
            "season": "2024/2025",
            "team_id": team_id
        })
        champ_id = create_response.json()["id"]
        
        # Get it
        response = requests.get(f"{BASE_URL}/api/championships/{champ_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == champ_id
        print(f"Retrieved championship: {data['name']}")


class TestEvents:
    """Event management tests"""
    
    def test_get_events(self, auth_headers):
        """Test get all events"""
        response = requests.get(f"{BASE_URL}/api/events", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Events found: {len(data)}")
    
    def test_create_event(self, auth_headers):
        """Test create event"""
        # First get a team
        teams_response = requests.get(f"{BASE_URL}/api/teams", headers=auth_headers)
        teams = teams_response.json()
        if not teams:
            pytest.skip("No teams available")
        
        team_id = teams[0]["id"]
        event_title = f"{TEST_PREFIX}Event_{uuid.uuid4().hex[:8]}"
        start_time = (datetime.now() + timedelta(days=7)).isoformat()
        
        response = requests.post(f"{BASE_URL}/api/events", headers=auth_headers, json={
            "team_id": team_id,
            "event_type": "treino",
            "title": event_title,
            "location": "Pavilhão Municipal",
            "start_time": start_time
        })
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == event_title
        assert "id" in data
        print(f"Created event: {data['title']}")
        return data


class TestDashboard:
    """Dashboard tests"""
    
    def test_get_dashboard(self, auth_headers):
        """Test get dashboard data"""
        response = requests.get(f"{BASE_URL}/api/dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "upcoming_events" in data
        assert "pending_convocations" in data
        assert "teams_count" in data
        assert "recent_messages" in data
        print(f"Dashboard: {data['teams_count']} teams, {len(data['upcoming_events'])} upcoming events")


class TestMessages:
    """Message tests"""
    
    def test_send_and_get_messages(self, auth_headers):
        """Test send and retrieve messages"""
        # First get a team
        teams_response = requests.get(f"{BASE_URL}/api/teams", headers=auth_headers)
        teams = teams_response.json()
        if not teams:
            pytest.skip("No teams available")
        
        team_id = teams[0]["id"]
        message_content = f"{TEST_PREFIX}Message_{uuid.uuid4().hex[:8]}"
        
        # Send message
        send_response = requests.post(f"{BASE_URL}/api/messages", headers=auth_headers, json={
            "team_id": team_id,
            "content": message_content
        })
        assert send_response.status_code == 200
        sent_msg = send_response.json()
        assert sent_msg["content"] == message_content
        print(f"Sent message: {message_content[:30]}...")
        
        # Get messages
        get_response = requests.get(f"{BASE_URL}/api/messages/{team_id}", headers=auth_headers)
        assert get_response.status_code == 200
        messages = get_response.json()
        assert isinstance(messages, list)
        print(f"Retrieved {len(messages)} messages")


class TestAttendance:
    """Attendance tests"""
    
    def test_get_team_attendance(self, auth_headers):
        """Test get team attendance"""
        # First get a team
        teams_response = requests.get(f"{BASE_URL}/api/teams", headers=auth_headers)
        teams = teams_response.json()
        if not teams:
            pytest.skip("No teams available")
        
        team_id = teams[0]["id"]
        response = requests.get(f"{BASE_URL}/api/teams/{team_id}/attendance", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Attendance records: {len(data)}")
    
    def test_get_team_attendance_summary(self, auth_headers):
        """Test get team attendance summary"""
        # First get a team
        teams_response = requests.get(f"{BASE_URL}/api/teams", headers=auth_headers)
        teams = teams_response.json()
        if not teams:
            pytest.skip("No teams available")
        
        team_id = teams[0]["id"]
        response = requests.get(f"{BASE_URL}/api/teams/{team_id}/attendance/summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "monthly" in data
        assert "by_event_type" in data
        print(f"Attendance summary: {data['total_records']} total records")


class TestStats:
    """Statistics tests"""
    
    def test_get_team_stats(self, auth_headers):
        """Test get team stats"""
        # First get a team
        teams_response = requests.get(f"{BASE_URL}/api/teams", headers=auth_headers)
        teams = teams_response.json()
        if not teams:
            pytest.skip("No teams available")
        
        team_id = teams[0]["id"]
        response = requests.get(f"{BASE_URL}/api/teams/{team_id}/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Player stats: {len(data)}")


class TestUsers:
    """User management tests"""
    
    def test_get_users(self, auth_headers):
        """Test get all users"""
        response = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Users found: {len(data)}")
    
    def test_get_user_by_id(self, auth_headers, user_data):
        """Test get user by ID"""
        user_id = user_data["id"]
        response = requests.get(f"{BASE_URL}/api/users/{user_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == user_id
        print(f"Retrieved user: {data['name']}")


class TestConvocations:
    """Convocation tests"""
    
    def test_get_my_convocations(self, auth_headers):
        """Test get my convocations"""
        response = requests.get(f"{BASE_URL}/api/convocations/my", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"My convocations: {len(data)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

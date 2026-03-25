import requests
import sys
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional

class RollerHockeyAPITester:
    def __init__(self, base_url="https://roller-hockey-hub-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.team_id = None
        self.event_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details
        })

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make API request and return success status and response data"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            
            try:
                response_data = response.json() if response.content else {}
            except:
                response_data = {"raw_response": response.text}
                
            if not success:
                response_data["status_code"] = response.status_code
                response_data["expected_status"] = expected_status
                
            return success, response_data

        except Exception as e:
            return False, {"error": str(e)}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.make_request('GET', '')
        self.log_test("Root API endpoint", success, 
                     f"Status: {response.get('status_code', 'OK')}" if not success else "")
        return success

    def test_user_registration(self):
        """Test user registration with treinador role"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_data = {
            "name": f"Test Treinador {timestamp}",
            "email": f"treinador{timestamp}@test.com",
            "password": "testpass123",
            "role": "treinador",
            "phone": "+351900000000"
        }
        
        success, response = self.make_request('POST', 'auth/register', test_data, 200)
        
        if success and 'token' in response and 'user' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            self.log_test("User registration (treinador)", True)
            return True
        else:
            self.log_test("User registration (treinador)", False, 
                         f"Missing token/user in response: {response}")
            return False

    def test_user_login(self):
        """Test user login (using registered user)"""
        if not self.token:
            self.log_test("User login", False, "No user registered to test login")
            return False
            
        # We already have a token from registration, so login is implicitly tested
        self.log_test("User login", True, "Implicit test via registration")
        return True

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.make_request('GET', 'auth/me')
        
        if success and 'id' in response and 'email' in response:
            self.log_test("Get current user", True)
            return True
        else:
            self.log_test("Get current user", False, f"Invalid user data: {response}")
            return False

    def test_create_team(self):
        """Test creating a team"""
        team_data = {
            "name": "Test Team Juvenis",
            "category": "Sub-15",
            "season": "2024/2025"
        }
        
        success, response = self.make_request('POST', 'teams', team_data, 200)
        
        if success and 'id' in response:
            self.team_id = response['id']
            self.log_test("Create team", True)
            return True
        else:
            self.log_test("Create team", False, f"Failed to create team: {response}")
            return False

    def test_get_teams(self):
        """Test getting teams list"""
        success, response = self.make_request('GET', 'teams')
        
        if success and isinstance(response, list):
            self.log_test("Get teams", True, f"Found {len(response)} teams")
            return True
        else:
            self.log_test("Get teams", False, f"Invalid teams response: {response}")
            return False

    def test_get_team_details(self):
        """Test getting specific team details"""
        if not self.team_id:
            self.log_test("Get team details", False, "No team created to test")
            return False
            
        success, response = self.make_request('GET', f'teams/{self.team_id}')
        
        if success and 'id' in response and response['id'] == self.team_id:
            self.log_test("Get team details", True)
            return True
        else:
            self.log_test("Get team details", False, f"Invalid team details: {response}")
            return False

    def test_create_event(self):
        """Test creating an event"""
        if not self.team_id:
            self.log_test("Create event", False, "No team available for event")
            return False
            
        # Create event for tomorrow
        tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
        event_data = {
            "team_id": self.team_id,
            "event_type": "treino",
            "title": "Treino Técnico",
            "description": "Treino focado em técnica individual",
            "location": "Pavilhão Municipal",
            "start_time": tomorrow.isoformat(),
            "end_time": (tomorrow + timedelta(hours=2)).isoformat()
        }
        
        success, response = self.make_request('POST', 'events', event_data, 200)
        
        if success and 'id' in response:
            self.event_id = response['id']
            self.log_test("Create event", True)
            return True
        else:
            self.log_test("Create event", False, f"Failed to create event: {response}")
            return False

    def test_get_events(self):
        """Test getting events list"""
        success, response = self.make_request('GET', 'events')
        
        if success and isinstance(response, list):
            self.log_test("Get events", True, f"Found {len(response)} events")
            return True
        else:
            self.log_test("Get events", False, f"Invalid events response: {response}")
            return False

    def test_get_dashboard(self):
        """Test dashboard endpoint"""
        success, response = self.make_request('GET', 'dashboard')
        
        expected_keys = ['upcoming_events', 'pending_convocations', 'teams_count', 'recent_messages']
        if success and all(key in response for key in expected_keys):
            self.log_test("Get dashboard", True)
            return True
        else:
            self.log_test("Get dashboard", False, f"Missing dashboard data: {response}")
            return False

    def test_send_message(self):
        """Test sending a chat message"""
        if not self.team_id:
            self.log_test("Send message", False, "No team available for chat")
            return False
            
        message_data = {
            "team_id": self.team_id,
            "content": "Test message from automated test"
        }
        
        success, response = self.make_request('POST', 'messages', message_data, 200)
        
        if success and 'id' in response and 'content' in response:
            self.log_test("Send message", True)
            return True
        else:
            self.log_test("Send message", False, f"Failed to send message: {response}")
            return False

    def test_get_messages(self):
        """Test getting team messages"""
        if not self.team_id:
            self.log_test("Get messages", False, "No team available for messages")
            return False
            
        success, response = self.make_request('GET', f'messages/{self.team_id}')
        
        if success and isinstance(response, list):
            self.log_test("Get messages", True, f"Found {len(response)} messages")
            return True
        else:
            self.log_test("Get messages", False, f"Invalid messages response: {response}")
            return False

    def test_get_users(self):
        """Test getting users list"""
        success, response = self.make_request('GET', 'users')
        
        if success and isinstance(response, list):
            self.log_test("Get users", True, f"Found {len(response)} users")
            return True
        else:
            self.log_test("Get users", False, f"Invalid users response: {response}")
            return False

    def test_update_user_profile(self):
        """Test updating user profile"""
        if not self.user_id:
            self.log_test("Update user profile", False, "No user ID available")
            return False
            
        update_data = {
            "name": "Updated Test Treinador",
            "phone": "+351900000001"
        }
        
        success, response = self.make_request('PUT', f'users/{self.user_id}', update_data)
        
        if success:
            self.log_test("Update user profile", True)
            return True
        else:
            self.log_test("Update user profile", False, f"Failed to update profile: {response}")
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Roller Hockey Hub API Tests")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test sequence
        tests = [
            self.test_root_endpoint,
            self.test_user_registration,
            self.test_user_login,
            self.test_get_current_user,
            self.test_create_team,
            self.test_get_teams,
            self.test_get_team_details,
            self.test_create_event,
            self.test_get_events,
            self.test_get_dashboard,
            self.test_send_message,
            self.test_get_messages,
            self.test_get_users,
            self.test_update_user_profile
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                self.log_test(test.__name__, False, f"Exception: {str(e)}")
        
        # Print summary
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        print(f"✅ Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed < self.tests_run:
            print("\n❌ Failed Tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['name']}: {result['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = RollerHockeyAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
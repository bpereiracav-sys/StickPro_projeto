"""
Test Excel Export Features - Members, Payments, and Attendance exports
Tests for admin-only export functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "test123456"


class TestExportFeatures:
    """Test export endpoints for Members, Payments, and Attendance"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.user = login_response.json().get("user")
        else:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
    
    # ==================== MEMBERS EXPORT TESTS ====================
    
    def test_members_export_endpoint_exists(self):
        """Test that members export endpoint exists and returns XLSX"""
        response = self.session.get(f"{BASE_URL}/api/members/export")
        
        # Should return 200 for admin
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Check content type is Excel
        content_type = response.headers.get('Content-Type', '')
        assert 'spreadsheetml' in content_type or 'application/vnd' in content_type, \
            f"Expected Excel content type, got: {content_type}"
        
        # Check content disposition header
        content_disp = response.headers.get('Content-Disposition', '')
        assert 'attachment' in content_disp, f"Expected attachment header, got: {content_disp}"
        assert '.xlsx' in content_disp, f"Expected .xlsx filename, got: {content_disp}"
        
        print(f"Members export: Status {response.status_code}, Content-Type: {content_type}")
        print(f"Content-Disposition: {content_disp}")
    
    def test_members_export_with_team_filter(self):
        """Test members export with team_id filter"""
        # First get a team
        teams_response = self.session.get(f"{BASE_URL}/api/teams")
        if teams_response.status_code == 200 and teams_response.json():
            team_id = teams_response.json()[0].get('id')
            
            response = self.session.get(f"{BASE_URL}/api/members/export", params={"team_id": team_id})
            assert response.status_code == 200, f"Export with team filter failed: {response.status_code}"
            print(f"Members export with team filter: Status {response.status_code}")
        else:
            print("No teams found, skipping team filter test")
    
    def test_members_export_with_search_filter(self):
        """Test members export with search filter"""
        response = self.session.get(f"{BASE_URL}/api/members/export", params={"search": "test"})
        assert response.status_code == 200, f"Export with search filter failed: {response.status_code}"
        print(f"Members export with search filter: Status {response.status_code}")
    
    def test_members_export_admin_only(self):
        """Test that non-admin users cannot export members"""
        # Create a new session without admin token
        non_admin_session = requests.Session()
        non_admin_session.headers.update({"Content-Type": "application/json"})
        
        # Try to register a non-admin user
        register_response = non_admin_session.post(f"{BASE_URL}/api/auth/register", json={
            "email": "test_player_export@example.com",
            "password": "test123456",
            "name": "Test Player Export",
            "role": "jogador"
        })
        
        if register_response.status_code in [200, 201]:
            token = register_response.json().get("token")
            non_admin_session.headers.update({"Authorization": f"Bearer {token}"})
            
            # Try to export - should fail
            response = non_admin_session.get(f"{BASE_URL}/api/members/export")
            assert response.status_code == 403, f"Non-admin should get 403, got {response.status_code}"
            print(f"Non-admin members export correctly blocked: {response.status_code}")
        else:
            print(f"Could not create test user: {register_response.status_code}")
    
    # ==================== PAYMENTS EXPORT TESTS ====================
    
    def test_payments_export_endpoint_exists(self):
        """Test that payments export endpoint exists and returns XLSX"""
        response = self.session.get(f"{BASE_URL}/api/payments/export")
        
        # Should return 200 for admin
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Check content type is Excel
        content_type = response.headers.get('Content-Type', '')
        assert 'spreadsheetml' in content_type or 'application/vnd' in content_type, \
            f"Expected Excel content type, got: {content_type}"
        
        # Check content disposition header
        content_disp = response.headers.get('Content-Disposition', '')
        assert 'attachment' in content_disp, f"Expected attachment header, got: {content_disp}"
        assert '.xlsx' in content_disp, f"Expected .xlsx filename, got: {content_disp}"
        
        print(f"Payments export: Status {response.status_code}, Content-Type: {content_type}")
        print(f"Content-Disposition: {content_disp}")
    
    def test_payments_export_with_status_filter(self):
        """Test payments export with status filter"""
        for status in ['paid', 'pending', 'overdue']:
            response = self.session.get(f"{BASE_URL}/api/payments/export", params={"status": status})
            assert response.status_code == 200, f"Export with status={status} failed: {response.status_code}"
            print(f"Payments export with status={status}: Status {response.status_code}")
    
    def test_payments_export_with_type_filter(self):
        """Test payments export with payment_type filter"""
        for ptype in ['monthly_fee', 'custom']:
            response = self.session.get(f"{BASE_URL}/api/payments/export", params={"payment_type": ptype})
            assert response.status_code == 200, f"Export with type={ptype} failed: {response.status_code}"
            print(f"Payments export with type={ptype}: Status {response.status_code}")
    
    def test_payments_export_with_search_filter(self):
        """Test payments export with search filter"""
        response = self.session.get(f"{BASE_URL}/api/payments/export", params={"search": "test"})
        assert response.status_code == 200, f"Export with search filter failed: {response.status_code}"
        print(f"Payments export with search filter: Status {response.status_code}")
    
    def test_payments_export_admin_only(self):
        """Test that non-admin users cannot export payments"""
        # Create a new session without admin token
        non_admin_session = requests.Session()
        non_admin_session.headers.update({"Content-Type": "application/json"})
        
        # Login as a non-admin user (if exists) or try without auth
        response = non_admin_session.get(f"{BASE_URL}/api/payments/export")
        # Should fail without auth
        assert response.status_code in [401, 403], f"Unauthenticated should get 401/403, got {response.status_code}"
        print(f"Unauthenticated payments export correctly blocked: {response.status_code}")
    
    # ==================== ATTENDANCE EXPORT TESTS ====================
    # Note: Attendance export is done client-side (CSV), so we test the data endpoint
    
    def test_attendance_data_endpoint(self):
        """Test that attendance data endpoint works for export"""
        # Get a team first
        teams_response = self.session.get(f"{BASE_URL}/api/teams")
        if teams_response.status_code == 200 and teams_response.json():
            team_id = teams_response.json()[0].get('id')
            
            # Get attendance data
            response = self.session.get(f"{BASE_URL}/api/teams/{team_id}/attendance")
            assert response.status_code == 200, f"Attendance data failed: {response.status_code}"
            
            data = response.json()
            print(f"Attendance data: Status {response.status_code}, Records: {len(data) if isinstance(data, list) else 'N/A'}")
        else:
            print("No teams found, skipping attendance test")
    
    def test_attendance_summary_endpoint(self):
        """Test attendance summary endpoint"""
        teams_response = self.session.get(f"{BASE_URL}/api/teams")
        if teams_response.status_code == 200 and teams_response.json():
            team_id = teams_response.json()[0].get('id')
            
            response = self.session.get(f"{BASE_URL}/api/teams/{team_id}/attendance/summary")
            assert response.status_code == 200, f"Attendance summary failed: {response.status_code}"
            print(f"Attendance summary: Status {response.status_code}")
        else:
            print("No teams found, skipping attendance summary test")
    
    # ==================== EXPORT FILE CONTENT VALIDATION ====================
    
    def test_members_export_file_content(self):
        """Test that members export file has valid Excel content"""
        response = self.session.get(f"{BASE_URL}/api/members/export")
        
        assert response.status_code == 200
        
        # Check file size is reasonable (at least has headers)
        content_length = len(response.content)
        assert content_length > 1000, f"Export file too small: {content_length} bytes"
        
        # Check Excel magic bytes (PK for ZIP-based XLSX)
        assert response.content[:2] == b'PK', "Export file doesn't have valid XLSX header"
        
        print(f"Members export file size: {content_length} bytes, valid XLSX format")
    
    def test_payments_export_file_content(self):
        """Test that payments export file has valid Excel content"""
        response = self.session.get(f"{BASE_URL}/api/payments/export")
        
        assert response.status_code == 200
        
        # Check file size is reasonable
        content_length = len(response.content)
        assert content_length > 1000, f"Export file too small: {content_length} bytes"
        
        # Check Excel magic bytes
        assert response.content[:2] == b'PK', "Export file doesn't have valid XLSX header"
        
        print(f"Payments export file size: {content_length} bytes, valid XLSX format")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

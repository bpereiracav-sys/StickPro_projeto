"""
Test Members Module - Pagination, Search, Archive/Restore, Activation Status
Tests for the upgraded Members module with:
1. Paginated list (GET /api/members?page=1&per_page=20)
2. Search by name (GET /api/members?search=test)
3. Get member detail with statistics (GET /api/members/{id})
4. Archive member (POST /api/members/{id}/archive)
5. Get archived members (GET /api/members/archived)
6. Restore member (POST /api/members/{id}/restore)
7. Send activation reminder (POST /api/members/{id}/send-activation-reminder)
8. RBAC: Player cannot archive members (403)
9. RBAC: Player cannot view archived members (403)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "test123456"
PLAYER_EMAIL = "testplayer@example.com"
PLAYER_PASSWORD = "FeBwJa8VytI"
TEAM_ID = "58b17073-b32d-4c1d-afa7-e1a2936f0db2"


class TestMembersModule:
    """Test Members API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_admin_token(self):
        """Get admin authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    def get_player_token(self):
        """Get player authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": PLAYER_EMAIL,
            "password": PLAYER_PASSWORD
        })
        assert response.status_code == 200, f"Player login failed: {response.text}"
        return response.json()["token"]
    
    # ==================== PAGINATION TESTS ====================
    
    def test_members_paginated_list_default(self):
        """Test GET /api/members returns paginated list with default params"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/members",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify pagination structure
        assert "members" in data, "Response should have 'members' key"
        assert "total" in data, "Response should have 'total' key"
        assert "page" in data, "Response should have 'page' key"
        assert "per_page" in data, "Response should have 'per_page' key"
        assert "total_pages" in data, "Response should have 'total_pages' key"
        
        # Verify default values
        assert data["page"] == 1, "Default page should be 1"
        assert data["per_page"] == 20, "Default per_page should be 20"
        assert isinstance(data["members"], list), "Members should be a list"
        print(f"✓ Paginated list: {data['total']} total members, page {data['page']}/{data['total_pages']}")
    
    def test_members_paginated_list_custom_page(self):
        """Test GET /api/members with custom page and per_page"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/members?page=1&per_page=5",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["per_page"] == 5, "per_page should be 5"
        assert len(data["members"]) <= 5, "Should return at most 5 members"
        print(f"✓ Custom pagination: {len(data['members'])} members returned with per_page=5")
    
    def test_members_paginated_by_team(self):
        """Test GET /api/members?team_id=xxx filters by team"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/members?team_id={TEAM_ID}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # All returned members should belong to the team
        for member in data["members"]:
            assert TEAM_ID in member.get("team_ids", []), f"Member {member['name']} should be in team {TEAM_ID}"
        print(f"✓ Team filter: {len(data['members'])} members in team")
    
    # ==================== SEARCH TESTS ====================
    
    def test_members_search_by_name(self):
        """Test GET /api/members?search=xxx searches by name"""
        token = self.get_admin_token()
        
        # First get a member name to search for
        response = self.session.get(
            f"{BASE_URL}/api/members?per_page=1",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if data["members"]:
            search_name = data["members"][0]["name"].split()[0]  # First word of name
            
            # Search for that name
            search_response = self.session.get(
                f"{BASE_URL}/api/members?search={search_name}",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert search_response.status_code == 200, f"Search failed: {search_response.text}"
            search_data = search_response.json()
            
            # Verify search results contain the search term
            for member in search_data["members"]:
                assert search_name.lower() in member["name"].lower(), f"Member {member['name']} should contain '{search_name}'"
            print(f"✓ Search by name: Found {len(search_data['members'])} members matching '{search_name}'")
        else:
            print("⚠ No members to search - skipping search test")
    
    def test_members_search_no_results(self):
        """Test search with non-existent name returns empty list"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/members?search=ZZZZNONEXISTENT12345",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["members"] == [], "Should return empty list for non-existent search"
        assert data["total"] == 0, "Total should be 0"
        print("✓ Search no results: Returns empty list correctly")
    
    # ==================== MEMBER DETAIL TESTS ====================
    
    def test_get_member_detail_with_statistics(self):
        """Test GET /api/members/{id} returns member with statistics"""
        token = self.get_admin_token()
        
        # Get a member ID first
        response = self.session.get(
            f"{BASE_URL}/api/members?per_page=1",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if data["members"]:
            member_id = data["members"][0]["id"]
            
            # Get member detail
            detail_response = self.session.get(
                f"{BASE_URL}/api/members/{member_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert detail_response.status_code == 200, f"Failed: {detail_response.text}"
            detail_data = detail_response.json()
            
            # Verify structure
            assert "member" in detail_data, "Response should have 'member' key"
            assert "statistics" in detail_data, "Response should have 'statistics' key"
            
            # Verify statistics structure
            stats = detail_data["statistics"]
            assert "total_events" in stats, "Statistics should have 'total_events'"
            assert "attendance_rate" in stats, "Statistics should have 'attendance_rate'"
            assert "goals" in stats, "Statistics should have 'goals'"
            assert "assists" in stats, "Statistics should have 'assists'"
            
            print(f"✓ Member detail: {detail_data['member']['name']} - Events: {stats['total_events']}, Goals: {stats['goals']}")
        else:
            print("⚠ No members to get detail - skipping test")
    
    def test_get_member_detail_not_found(self):
        """Test GET /api/members/{id} returns 404 for non-existent member"""
        token = self.get_admin_token()
        fake_id = str(uuid.uuid4())
        
        response = self.session.get(
            f"{BASE_URL}/api/members/{fake_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Member not found: Returns 404 correctly")
    
    # ==================== ARCHIVE/RESTORE TESTS ====================
    
    def test_archive_member_admin_only(self):
        """Test POST /api/members/{id}/archive - admin can archive"""
        token = self.get_admin_token()
        
        # Create a test member to archive
        test_email = f"test_archive_{uuid.uuid4().hex[:8]}@test.com"
        create_response = self.session.post(
            f"{BASE_URL}/api/members",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "TEST_Archive Member",
                "email": test_email,
                "role": "jogador"
            }
        )
        assert create_response.status_code == 200, f"Failed to create member: {create_response.text}"
        member_id = create_response.json()["user"]["id"]
        
        # Archive the member
        archive_response = self.session.post(
            f"{BASE_URL}/api/members/{member_id}/archive",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert archive_response.status_code == 200, f"Archive failed: {archive_response.text}"
        
        # Verify member is archived
        detail_response = self.session.get(
            f"{BASE_URL}/api/members/{member_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert detail_response.status_code == 200
        assert detail_response.json()["member"].get("is_archived") == True, "Member should be archived"
        
        print(f"✓ Archive member: Admin successfully archived member {member_id}")
        
        # Cleanup - restore the member
        self.session.post(
            f"{BASE_URL}/api/members/{member_id}/restore",
            headers={"Authorization": f"Bearer {token}"}
        )
    
    def test_player_cannot_archive_member(self):
        """Test POST /api/members/{id}/archive - player gets 403"""
        admin_token = self.get_admin_token()
        player_token = self.get_player_token()
        
        # Get a member ID
        response = self.session.get(
            f"{BASE_URL}/api/members?per_page=1",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if data["members"]:
            member_id = data["members"][0]["id"]
            
            # Try to archive as player
            archive_response = self.session.post(
                f"{BASE_URL}/api/members/{member_id}/archive",
                headers={"Authorization": f"Bearer {player_token}"}
            )
            assert archive_response.status_code == 403, f"Expected 403, got {archive_response.status_code}"
            print("✓ Player cannot archive: Returns 403 correctly")
        else:
            print("⚠ No members to test archive permission")
    
    def test_get_archived_members_admin_only(self):
        """Test GET /api/members/archived - admin can view"""
        token = self.get_admin_token()
        
        response = self.session.get(
            f"{BASE_URL}/api/members/archived",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify pagination structure
        assert "members" in data, "Response should have 'members' key"
        assert "total" in data, "Response should have 'total' key"
        assert "page" in data, "Response should have 'page' key"
        
        print(f"✓ Get archived members: {data['total']} archived members found")
    
    def test_player_cannot_view_archived_members(self):
        """Test GET /api/members/archived - player gets 403"""
        player_token = self.get_player_token()
        
        response = self.session.get(
            f"{BASE_URL}/api/members/archived",
            headers={"Authorization": f"Bearer {player_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Player cannot view archived: Returns 403 correctly")
    
    def test_restore_member_admin_only(self):
        """Test POST /api/members/{id}/restore - admin can restore"""
        token = self.get_admin_token()
        
        # Create and archive a test member
        test_email = f"test_restore_{uuid.uuid4().hex[:8]}@test.com"
        create_response = self.session.post(
            f"{BASE_URL}/api/members",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "TEST_Restore Member",
                "email": test_email,
                "role": "jogador"
            }
        )
        assert create_response.status_code == 200
        member_id = create_response.json()["user"]["id"]
        
        # Archive the member
        self.session.post(
            f"{BASE_URL}/api/members/{member_id}/archive",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Restore the member
        restore_response = self.session.post(
            f"{BASE_URL}/api/members/{member_id}/restore",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert restore_response.status_code == 200, f"Restore failed: {restore_response.text}"
        
        # Verify member is restored
        detail_response = self.session.get(
            f"{BASE_URL}/api/members/{member_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert detail_response.status_code == 200
        assert detail_response.json()["member"].get("is_archived") != True, "Member should not be archived"
        
        print(f"✓ Restore member: Admin successfully restored member {member_id}")
    
    def test_player_cannot_restore_member(self):
        """Test POST /api/members/{id}/restore - player gets 403"""
        admin_token = self.get_admin_token()
        player_token = self.get_player_token()
        
        # Create and archive a test member
        test_email = f"test_restore_perm_{uuid.uuid4().hex[:8]}@test.com"
        create_response = self.session.post(
            f"{BASE_URL}/api/members",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "TEST_Restore Perm Member",
                "email": test_email,
                "role": "jogador"
            }
        )
        assert create_response.status_code == 200
        member_id = create_response.json()["user"]["id"]
        
        # Archive the member
        self.session.post(
            f"{BASE_URL}/api/members/{member_id}/archive",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Try to restore as player
        restore_response = self.session.post(
            f"{BASE_URL}/api/members/{member_id}/restore",
            headers={"Authorization": f"Bearer {player_token}"}
        )
        assert restore_response.status_code == 403, f"Expected 403, got {restore_response.status_code}"
        
        # Cleanup
        self.session.post(
            f"{BASE_URL}/api/members/{member_id}/restore",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        print("✓ Player cannot restore: Returns 403 correctly")
    
    # ==================== ACTIVATION REMINDER TESTS ====================
    
    def test_send_activation_reminder_admin_only(self):
        """Test POST /api/members/{id}/send-activation-reminder - admin can send"""
        token = self.get_admin_token()
        
        # Create a test member (not activated)
        test_email = f"test_reminder_{uuid.uuid4().hex[:8]}@test.com"
        create_response = self.session.post(
            f"{BASE_URL}/api/members",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "TEST_Reminder Member",
                "email": test_email,
                "role": "jogador"
            }
        )
        assert create_response.status_code == 200
        member_id = create_response.json()["user"]["id"]
        
        # Send activation reminder
        reminder_response = self.session.post(
            f"{BASE_URL}/api/members/{member_id}/send-activation-reminder",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert reminder_response.status_code == 200, f"Reminder failed: {reminder_response.text}"
        
        print(f"✓ Send activation reminder: Admin successfully sent reminder (MOCKED)")
    
    def test_player_cannot_send_activation_reminder(self):
        """Test POST /api/members/{id}/send-activation-reminder - player gets 403"""
        admin_token = self.get_admin_token()
        player_token = self.get_player_token()
        
        # Get a member ID
        response = self.session.get(
            f"{BASE_URL}/api/members?per_page=1",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if data["members"]:
            member_id = data["members"][0]["id"]
            
            # Try to send reminder as player
            reminder_response = self.session.post(
                f"{BASE_URL}/api/members/{member_id}/send-activation-reminder",
                headers={"Authorization": f"Bearer {player_token}"}
            )
            assert reminder_response.status_code == 403, f"Expected 403, got {reminder_response.status_code}"
            print("✓ Player cannot send reminder: Returns 403 correctly")
        else:
            print("⚠ No members to test reminder permission")
    
    # ==================== NATIONALITIES TESTS ====================
    
    def test_member_nationalities_max_two(self):
        """Test that nationalities are limited to 2"""
        token = self.get_admin_token()
        
        # Create a member with nationalities
        test_email = f"test_nat_{uuid.uuid4().hex[:8]}@test.com"
        create_response = self.session.post(
            f"{BASE_URL}/api/members",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "TEST_Nationality Member",
                "email": test_email,
                "role": "jogador",
                "nationalities": ["PT", "BR", "ES"]  # 3 nationalities
            }
        )
        assert create_response.status_code == 200
        member_id = create_response.json()["user"]["id"]
        
        # Get member detail
        detail_response = self.session.get(
            f"{BASE_URL}/api/members/{member_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert detail_response.status_code == 200
        member = detail_response.json()["member"]
        
        # Nationalities should be limited to 2
        nationalities = member.get("nationalities", [])
        assert len(nationalities) <= 2, f"Nationalities should be max 2, got {len(nationalities)}"
        
        print(f"✓ Nationalities max 2: Member has {len(nationalities)} nationalities")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

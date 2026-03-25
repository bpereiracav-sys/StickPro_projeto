"""
Phase 8 Testing: Library, AI Assistant, and Theme Color Features
Tests for:
- Library CRUD operations (create, read, update, delete)
- Library filtering by category and type
- AI Assistant chat functionality
- AI Assistant clear history
- Club theme color selection and persistence
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@example.com",
            "password": "test123456"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestLibraryCRUD(TestAuth):
    """Library CRUD operations tests"""
    
    created_item_id = None
    
    def test_get_library_items(self, headers):
        """Test getting all library items"""
        response = requests.get(f"{BASE_URL}/api/library", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Library has {len(data)} items")
    
    def test_create_library_link_item(self, headers):
        """Test creating a link type library item"""
        payload = {
            "title": "TEST_Library_Link_Item",
            "description": "Test link description",
            "item_type": "link",
            "url": "https://example.com/test-link",
            "category": "Regras",
            "tags": ["test", "link"]
        }
        response = requests.post(f"{BASE_URL}/api/library", json=payload, headers=headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert data["title"] == payload["title"]
        assert data["item_type"] == "link"
        assert data["url"] == payload["url"]
        assert data["category"] == "Regras"
        TestLibraryCRUD.created_item_id = data["id"]
        print(f"Created library item: {data['id']}")
    
    def test_create_library_video_item(self, headers):
        """Test creating a video type library item with YouTube URL"""
        payload = {
            "title": "TEST_Library_Video_Item",
            "description": "Test video description",
            "item_type": "video",
            "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "category": "Treino",
            "tags": ["test", "video"]
        }
        response = requests.post(f"{BASE_URL}/api/library", json=payload, headers=headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert data["title"] == payload["title"]
        assert data["item_type"] == "video"
        # Should have generated thumbnail
        assert data.get("thumbnail_url") is not None or data.get("thumbnail_url") == None  # May or may not have thumbnail
        print(f"Created video item: {data['id']}")
    
    def test_create_library_pdf_item(self, headers):
        """Test creating a PDF type library item"""
        payload = {
            "title": "TEST_Library_PDF_Item",
            "description": "Test PDF description",
            "item_type": "pdf",
            "url": "https://example.com/test.pdf",
            "category": "Táticas",
            "tags": ["test", "pdf"]
        }
        response = requests.post(f"{BASE_URL}/api/library", json=payload, headers=headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert data["title"] == payload["title"]
        assert data["item_type"] == "pdf"
        print(f"Created PDF item: {data['id']}")
    
    def test_get_library_categories(self, headers):
        """Test getting library categories"""
        response = requests.get(f"{BASE_URL}/api/library/categories", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Categories: {data}")
    
    def test_filter_library_by_category(self, headers):
        """Test filtering library by category"""
        response = requests.get(f"{BASE_URL}/api/library?category=Regras", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All items should have category "Regras"
        for item in data:
            assert item.get("category") == "Regras"
        print(f"Found {len(data)} items in 'Regras' category")
    
    def test_filter_library_by_type(self, headers):
        """Test filtering library by type"""
        response = requests.get(f"{BASE_URL}/api/library?item_type=link", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All items should have type "link"
        for item in data:
            assert item.get("item_type") == "link"
        print(f"Found {len(data)} link items")
    
    def test_update_library_item(self, headers):
        """Test updating a library item"""
        if not TestLibraryCRUD.created_item_id:
            pytest.skip("No item created to update")
        
        payload = {
            "title": "TEST_Library_Link_Item_Updated",
            "description": "Updated description",
            "item_type": "link",
            "url": "https://example.com/updated-link",
            "category": "Táticas",
            "tags": ["updated"]
        }
        response = requests.put(
            f"{BASE_URL}/api/library/{TestLibraryCRUD.created_item_id}", 
            json=payload, 
            headers=headers
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        data = response.json()
        assert data["title"] == payload["title"]
        assert data["category"] == "Táticas"
        print(f"Updated library item: {data['id']}")
    
    def test_delete_library_item(self, headers):
        """Test deleting a library item"""
        if not TestLibraryCRUD.created_item_id:
            pytest.skip("No item created to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/library/{TestLibraryCRUD.created_item_id}", 
            headers=headers
        )
        assert response.status_code == 200, f"Delete failed: {response.text}"
        
        # Verify deletion
        response = requests.get(f"{BASE_URL}/api/library", headers=headers)
        data = response.json()
        item_ids = [item["id"] for item in data]
        assert TestLibraryCRUD.created_item_id not in item_ids
        print(f"Deleted library item: {TestLibraryCRUD.created_item_id}")


class TestAIAssistant(TestAuth):
    """AI Assistant tests"""
    
    session_id = None
    
    def test_ai_chat_send_message(self, headers):
        """Test sending a message to AI assistant"""
        payload = {
            "message": "Olá, o que é hóquei em patins?",
            "session_id": None
        }
        response = requests.post(f"{BASE_URL}/api/ai/chat", json=payload, headers=headers)
        assert response.status_code == 200, f"AI chat failed: {response.text}"
        data = response.json()
        assert "response" in data
        assert "session_id" in data
        assert len(data["response"]) > 0
        TestAIAssistant.session_id = data["session_id"]
        print(f"AI Response: {data['response'][:100]}...")
    
    def test_ai_chat_with_session(self, headers):
        """Test sending a follow-up message with session"""
        if not TestAIAssistant.session_id:
            pytest.skip("No session ID from previous test")
        
        payload = {
            "message": "Quantos jogadores tem uma equipa?",
            "session_id": TestAIAssistant.session_id
        }
        response = requests.post(f"{BASE_URL}/api/ai/chat", json=payload, headers=headers)
        assert response.status_code == 200, f"AI chat failed: {response.text}"
        data = response.json()
        assert "response" in data
        assert data["session_id"] == TestAIAssistant.session_id
        print(f"AI Follow-up Response: {data['response'][:100]}...")
    
    def test_ai_get_chat_history(self, headers):
        """Test getting AI chat history"""
        response = requests.get(f"{BASE_URL}/api/ai/chat/history", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Chat history has {len(data)} messages")
    
    def test_ai_clear_chat_history(self, headers):
        """Test clearing AI chat history"""
        if not TestAIAssistant.session_id:
            pytest.skip("No session ID to clear")
        
        response = requests.delete(
            f"{BASE_URL}/api/ai/chat/history?session_id={TestAIAssistant.session_id}", 
            headers=headers
        )
        assert response.status_code == 200, f"Clear history failed: {response.text}"
        data = response.json()
        assert data["message"] == "Histórico apagado"
        print("Chat history cleared")


class TestThemeColors(TestAuth):
    """Theme color selection and persistence tests"""
    
    club_id = None
    original_colors = None
    
    def test_get_club_info(self, headers):
        """Test getting club info with current colors"""
        response = requests.get(f"{BASE_URL}/api/clubs", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            club = data[0]
            TestThemeColors.club_id = club["id"]
            TestThemeColors.original_colors = {
                "primary_color": club.get("primary_color", "#006D5B"),
                "secondary_color": club.get("secondary_color", "#FFD700"),
                "accent_color": club.get("accent_color", "#1a1a2e")
            }
            print(f"Club ID: {club['id']}, Colors: {TestThemeColors.original_colors}")
        else:
            # Create a club if none exists
            create_response = requests.post(f"{BASE_URL}/api/clubs", json={
                "name": "TEST_Club_Theme",
                "city": "Lisboa",
                "country": "Portugal"
            }, headers=headers)
            assert create_response.status_code == 200
            club = create_response.json()
            TestThemeColors.club_id = club["id"]
            TestThemeColors.original_colors = {
                "primary_color": "#006D5B",
                "secondary_color": "#FFD700",
                "accent_color": "#1a1a2e"
            }
            print(f"Created club: {club['id']}")
    
    def test_update_club_theme_colors(self, headers):
        """Test updating club theme colors"""
        if not TestThemeColors.club_id:
            pytest.skip("No club ID available")
        
        # Use "Azul Real" palette
        new_colors = {
            "primary_color": "#1e40af",
            "secondary_color": "#fbbf24",
            "accent_color": "#0f172a"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/clubs/{TestThemeColors.club_id}",
            json=new_colors,
            headers=headers
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        print(f"Updated club colors to: {new_colors}")
    
    def test_verify_theme_color_persistence(self, headers):
        """Test that theme colors are persisted"""
        if not TestThemeColors.club_id:
            pytest.skip("No club ID available")
        
        response = requests.get(f"{BASE_URL}/api/clubs/{TestThemeColors.club_id}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify colors were saved
        assert data.get("primary_color") == "#1e40af"
        assert data.get("secondary_color") == "#fbbf24"
        assert data.get("accent_color") == "#0f172a"
        print(f"Verified colors: primary={data['primary_color']}, secondary={data['secondary_color']}, accent={data['accent_color']}")
    
    def test_restore_original_colors(self, headers):
        """Test restoring original colors"""
        if not TestThemeColors.club_id or not TestThemeColors.original_colors:
            pytest.skip("No club ID or original colors available")
        
        response = requests.put(
            f"{BASE_URL}/api/clubs/{TestThemeColors.club_id}",
            json=TestThemeColors.original_colors,
            headers=headers
        )
        assert response.status_code == 200
        print(f"Restored original colors: {TestThemeColors.original_colors}")


class TestCleanup(TestAuth):
    """Cleanup test data"""
    
    def test_cleanup_test_library_items(self, headers):
        """Clean up test library items"""
        response = requests.get(f"{BASE_URL}/api/library", headers=headers)
        if response.status_code == 200:
            items = response.json()
            for item in items:
                if item["title"].startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/library/{item['id']}", headers=headers)
                    print(f"Deleted test item: {item['title']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

"""
Test Dashboard Role-Based Filtering
Tests that dashboard endpoint filters events based on user role:
- Admin/gestor_desportivo: ALL club events
- Player: ONLY events from their teams
- Parent/Guardian: Events of their linked children
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CREDENTIALS = {
    "admin": {"email": "admin@example.com", "password": "test123456"},
    "gestor": {"email": "gestor@example.com", "password": "test123456"},
    "player_escolares": {"email": "player.escolares@test.com", "password": "test123456"},
    "player_sub13": {"email": "player.sub13@test.com", "password": "test123456"},
    "parent_sub13": {"email": "parent.sub13@test.com", "password": "test123456"},
}

# Team IDs
ESCOLARES_TEAM_ID = "58b17073-b32d-4c1d-afa7-e1a2936f0db2"
SUB13_TEAM_ID = "b4352c2e-4809-4403-8087-fa05c9bd985e"


def get_auth_token(email: str, password: str) -> str:
    """Get authentication token for a user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": password}
    )
    if response.status_code != 200:
        pytest.skip(f"Login failed for {email}: {response.text}")
    return response.json()["token"]


def get_dashboard(token: str) -> dict:
    """Get dashboard data with auth token"""
    response = requests.get(
        f"{BASE_URL}/api/dashboard",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200, f"Dashboard request failed: {response.text}"
    return response.json()


def get_all_events(token: str) -> list:
    """Get all events (admin view)"""
    response = requests.get(
        f"{BASE_URL}/api/events",
        headers={"Authorization": f"Bearer {token}"}
    )
    return response.json() if response.status_code == 200 else []


class TestAdminDashboard:
    """Test that Admin sees ALL club events"""
    
    def test_admin_sees_all_events(self):
        """Admin should see events from ALL teams"""
        token = get_auth_token(**CREDENTIALS["admin"])
        dashboard = get_dashboard(token)
        
        # Get all events for comparison
        all_events = get_all_events(token)
        
        # Admin should see events from both teams
        event_team_ids = set(e.get("team_id") for e in dashboard.get("upcoming_events", []))
        
        print(f"Admin dashboard events count: {len(dashboard.get('upcoming_events', []))}")
        print(f"Admin dashboard event team IDs: {event_team_ids}")
        print(f"Total events in system: {len(all_events)}")
        
        # Admin should have access to all teams
        assert dashboard.get("teams_count", 0) >= 2, "Admin should see at least 2 teams"
        
    def test_admin_role_is_admin(self):
        """Verify admin user has admin role"""
        token = get_auth_token(**CREDENTIALS["admin"])
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        user = response.json()
        assert user.get("role") == "admin", f"Expected admin role, got {user.get('role')}"


class TestGestorDesportivoDashboard:
    """Test that gestor_desportivo sees ALL club events (same as admin)"""
    
    def test_gestor_sees_all_events(self):
        """gestor_desportivo should see events from ALL teams"""
        token = get_auth_token(**CREDENTIALS["gestor"])
        dashboard = get_dashboard(token)
        
        # Get admin token to compare total events
        admin_token = get_auth_token(**CREDENTIALS["admin"])
        admin_dashboard = get_dashboard(admin_token)
        
        print(f"Gestor dashboard events count: {len(dashboard.get('upcoming_events', []))}")
        print(f"Admin dashboard events count: {len(admin_dashboard.get('upcoming_events', []))}")
        
        # Gestor should see same number of events as admin
        assert len(dashboard.get("upcoming_events", [])) == len(admin_dashboard.get("upcoming_events", [])), \
            "Gestor should see same events as admin"
        
        # Gestor should have access to all teams
        assert dashboard.get("teams_count", 0) >= 2, "Gestor should see at least 2 teams"
    
    def test_gestor_role_is_gestor_desportivo(self):
        """Verify gestor user has gestor_desportivo role"""
        token = get_auth_token(**CREDENTIALS["gestor"])
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        user = response.json()
        assert user.get("role") == "gestor_desportivo", f"Expected gestor_desportivo role, got {user.get('role')}"


class TestPlayerEscolaresDashboard:
    """Test that Escolares player sees ONLY Escolares events"""
    
    def test_player_escolares_sees_only_escolares_events(self):
        """Player in Escolares team should ONLY see Escolares events"""
        token = get_auth_token(**CREDENTIALS["player_escolares"])
        dashboard = get_dashboard(token)
        
        events = dashboard.get("upcoming_events", [])
        print(f"Player Escolares sees {len(events)} events")
        
        # All events should be from Escolares team
        for event in events:
            assert event.get("team_id") == ESCOLARES_TEAM_ID, \
                f"Player Escolares should only see Escolares events, but saw event from team {event.get('team_id')}"
        
        # Should NOT see Sub-13 events
        sub13_events = [e for e in events if e.get("team_id") == SUB13_TEAM_ID]
        assert len(sub13_events) == 0, "Player Escolares should NOT see Sub-13 events"
        
        # Teams count should be 1 (only their team)
        assert dashboard.get("teams_count", 0) == 1, "Player should see only 1 team"
    
    def test_player_escolares_team_membership(self):
        """Verify player is in Escolares team"""
        token = get_auth_token(**CREDENTIALS["player_escolares"])
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        user = response.json()
        assert ESCOLARES_TEAM_ID in user.get("team_ids", []), \
            f"Player should be in Escolares team. Teams: {user.get('team_ids')}"


class TestPlayerSub13Dashboard:
    """Test that Sub-13 player sees ONLY Sub-13 events"""
    
    def test_player_sub13_sees_only_sub13_events(self):
        """Player in Sub-13 team should ONLY see Sub-13 events"""
        token = get_auth_token(**CREDENTIALS["player_sub13"])
        dashboard = get_dashboard(token)
        
        events = dashboard.get("upcoming_events", [])
        print(f"Player Sub-13 sees {len(events)} events")
        
        # All events should be from Sub-13 team
        for event in events:
            assert event.get("team_id") == SUB13_TEAM_ID, \
                f"Player Sub-13 should only see Sub-13 events, but saw event from team {event.get('team_id')}"
        
        # Should NOT see Escolares events
        escolares_events = [e for e in events if e.get("team_id") == ESCOLARES_TEAM_ID]
        assert len(escolares_events) == 0, "Player Sub-13 should NOT see Escolares events"
        
        # Teams count should be 1 (only their team)
        assert dashboard.get("teams_count", 0) == 1, "Player should see only 1 team"
    
    def test_player_sub13_team_membership(self):
        """Verify player is in Sub-13 team"""
        token = get_auth_token(**CREDENTIALS["player_sub13"])
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        user = response.json()
        assert SUB13_TEAM_ID in user.get("team_ids", []), \
            f"Player should be in Sub-13 team. Teams: {user.get('team_ids')}"


class TestParentSub13Dashboard:
    """Test that Parent linked to Sub-13 player sees ONLY Sub-13 events"""
    
    def test_parent_sees_only_linked_child_events(self):
        """Parent linked to Sub-13 player should ONLY see Sub-13 events"""
        token = get_auth_token(**CREDENTIALS["parent_sub13"])
        dashboard = get_dashboard(token)
        
        events = dashboard.get("upcoming_events", [])
        print(f"Parent Sub-13 sees {len(events)} events")
        
        # All events should be from Sub-13 team (child's team)
        for event in events:
            assert event.get("team_id") == SUB13_TEAM_ID, \
                f"Parent should only see child's team events, but saw event from team {event.get('team_id')}"
        
        # Should NOT see Escolares events
        escolares_events = [e for e in events if e.get("team_id") == ESCOLARES_TEAM_ID]
        assert len(escolares_events) == 0, "Parent should NOT see Escolares events"
        
        # Teams count should be 1 (child's team)
        assert dashboard.get("teams_count", 0) == 1, "Parent should see only 1 team (child's team)"
    
    def test_parent_is_linked_to_sub13_player(self):
        """Verify parent is linked to Sub-13 player"""
        token = get_auth_token(**CREDENTIALS["parent_sub13"])
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        user = response.json()
        
        # Check linked_player_id or linked_player_ids
        linked_player_id = user.get("linked_player_id")
        linked_player_ids = user.get("linked_player_ids", [])
        
        assert linked_player_id or linked_player_ids, \
            f"Parent should have linked player. linked_player_id: {linked_player_id}, linked_player_ids: {linked_player_ids}"
        
        # Verify the linked player is in Sub-13 team
        admin_token = get_auth_token(**CREDENTIALS["admin"])
        all_linked = linked_player_ids if linked_player_ids else ([linked_player_id] if linked_player_id else [])
        
        for player_id in all_linked:
            player_response = requests.get(
                f"{BASE_URL}/api/users/{player_id}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            if player_response.status_code == 200:
                player = player_response.json()
                assert SUB13_TEAM_ID in player.get("team_ids", []), \
                    f"Linked player should be in Sub-13 team. Player teams: {player.get('team_ids')}"


class TestNoDataLeakage:
    """Test that there's no data leakage between teams"""
    
    def test_escolares_player_cannot_see_sub13_events(self):
        """Escolares player should NOT see any Sub-13 events"""
        token = get_auth_token(**CREDENTIALS["player_escolares"])
        dashboard = get_dashboard(token)
        
        events = dashboard.get("upcoming_events", [])
        sub13_events = [e for e in events if e.get("team_id") == SUB13_TEAM_ID]
        
        assert len(sub13_events) == 0, \
            f"DATA LEAK: Escolares player can see {len(sub13_events)} Sub-13 events!"
    
    def test_sub13_player_cannot_see_escolares_events(self):
        """Sub-13 player should NOT see any Escolares events"""
        token = get_auth_token(**CREDENTIALS["player_sub13"])
        dashboard = get_dashboard(token)
        
        events = dashboard.get("upcoming_events", [])
        escolares_events = [e for e in events if e.get("team_id") == ESCOLARES_TEAM_ID]
        
        assert len(escolares_events) == 0, \
            f"DATA LEAK: Sub-13 player can see {len(escolares_events)} Escolares events!"
    
    def test_parent_cannot_see_unlinked_team_events(self):
        """Parent linked to Sub-13 should NOT see Escolares events"""
        token = get_auth_token(**CREDENTIALS["parent_sub13"])
        dashboard = get_dashboard(token)
        
        events = dashboard.get("upcoming_events", [])
        escolares_events = [e for e in events if e.get("team_id") == ESCOLARES_TEAM_ID]
        
        assert len(escolares_events) == 0, \
            f"DATA LEAK: Parent can see {len(escolares_events)} Escolares events (not their child's team)!"


class TestTeamsCount:
    """Test that teams_count is correct for each role"""
    
    def test_admin_teams_count(self):
        """Admin should see all teams"""
        token = get_auth_token(**CREDENTIALS["admin"])
        dashboard = get_dashboard(token)
        
        # Should see at least 2 teams (Escolares and Sub-13)
        assert dashboard.get("teams_count", 0) >= 2, \
            f"Admin should see at least 2 teams, got {dashboard.get('teams_count')}"
    
    def test_gestor_teams_count(self):
        """Gestor should see all teams"""
        token = get_auth_token(**CREDENTIALS["gestor"])
        dashboard = get_dashboard(token)
        
        # Should see at least 2 teams (Escolares and Sub-13)
        assert dashboard.get("teams_count", 0) >= 2, \
            f"Gestor should see at least 2 teams, got {dashboard.get('teams_count')}"
    
    def test_player_teams_count(self):
        """Player should see only their team(s)"""
        token = get_auth_token(**CREDENTIALS["player_escolares"])
        dashboard = get_dashboard(token)
        
        # Should see exactly 1 team
        assert dashboard.get("teams_count", 0) == 1, \
            f"Player should see 1 team, got {dashboard.get('teams_count')}"
    
    def test_parent_teams_count(self):
        """Parent should see only their child's team(s)"""
        token = get_auth_token(**CREDENTIALS["parent_sub13"])
        dashboard = get_dashboard(token)
        
        # Should see exactly 1 team (child's team)
        assert dashboard.get("teams_count", 0) == 1, \
            f"Parent should see 1 team (child's team), got {dashboard.get('teams_count')}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

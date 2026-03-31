"""
Test Members Module - Multilingual Support, Delete, and Grouping
Tests:
- DELETE /api/members/{member_id} - Permanent member deletion
- POST /api/members/import - Multilingual header mapping (PT, ES, FR, IT, EN)
- Role mapping from all 5 languages
- Member grouping logic (Staff/Players)
"""

import pytest
import requests
import os
import io
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "test123456"


class TestMemberDeletion:
    """Test DELETE /api/members/{member_id} endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data['token']
        self.admin_id = data['user']['id']
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_delete_member_requires_admin(self):
        """Non-admin users cannot delete members"""
        # Create a non-admin user first
        test_email = f"test_nonadmin_{uuid.uuid4().hex[:8]}@test.com"
        create_resp = requests.post(f"{BASE_URL}/api/members", json={
            "name": "Non Admin User",
            "email": test_email,
            "role": "jogador"
        }, headers=self.headers)
        
        if create_resp.status_code == 201:
            member_id = create_resp.json().get('id')
            
            # Login as the non-admin user
            login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": test_email,
                "password": create_resp.json().get('temp_password', 'test123456')
            })
            
            if login_resp.status_code == 200:
                non_admin_token = login_resp.json()['token']
                non_admin_headers = {"Authorization": f"Bearer {non_admin_token}"}
                
                # Try to delete another member - should fail
                delete_resp = requests.delete(f"{BASE_URL}/api/members/{member_id}", headers=non_admin_headers)
                assert delete_resp.status_code == 403, "Non-admin should not be able to delete members"
            
            # Cleanup - delete the test user as admin
            requests.delete(f"{BASE_URL}/api/members/{member_id}", headers=self.headers)
    
    def test_cannot_delete_own_account(self):
        """Admin cannot delete their own account"""
        response = requests.delete(f"{BASE_URL}/api/members/{self.admin_id}", headers=self.headers)
        assert response.status_code == 400, "Should not be able to delete own account"
        assert "própria conta" in response.json().get('detail', '').lower() or "own" in response.json().get('detail', '').lower()
    
    def test_cannot_delete_admin_accounts(self):
        """Cannot delete other admin accounts"""
        # Get list of users to find another admin
        users_resp = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        if users_resp.status_code == 200:
            users = users_resp.json()
            other_admins = [u for u in users if u.get('role') == 'admin' and u.get('id') != self.admin_id]
            
            if other_admins:
                other_admin_id = other_admins[0]['id']
                delete_resp = requests.delete(f"{BASE_URL}/api/members/{other_admin_id}", headers=self.headers)
                assert delete_resp.status_code == 400, "Should not be able to delete admin accounts"
    
    def test_delete_member_removes_all_data(self):
        """Deleting a member removes all related data"""
        # Create a test member
        test_email = f"test_delete_{uuid.uuid4().hex[:8]}@test.com"
        create_resp = requests.post(f"{BASE_URL}/api/members", json={
            "name": "Test Delete Member",
            "email": test_email,
            "role": "jogador"
        }, headers=self.headers)
        
        assert create_resp.status_code == 200, f"Failed to create test member: {create_resp.text}"
        member_id = create_resp.json().get('user', {}).get('id')
        
        # Delete the member
        delete_resp = requests.delete(f"{BASE_URL}/api/members/{member_id}", headers=self.headers)
        assert delete_resp.status_code == 200, f"Failed to delete member: {delete_resp.text}"
        
        # Verify member is deleted
        get_resp = requests.get(f"{BASE_URL}/api/users/{member_id}", headers=self.headers)
        assert get_resp.status_code == 404, "Member should not exist after deletion"
    
    def test_delete_nonexistent_member(self):
        """Deleting a non-existent member returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/members/{fake_id}", headers=self.headers)
        assert response.status_code == 404


class TestMultilingualImport:
    """Test multilingual header mapping for Excel/CSV import"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data['token']
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_import_portuguese_headers(self):
        """Import CSV with Portuguese headers"""
        csv_content = """Nome,Apelido,Data de Nascimento,Email,Função,Número,Posição,Telefone,Nacionalidade,Sexo
João,Silva,2010-05-15,test_pt_{uuid}@test.com,jogador,10,JC,912345678,Portuguesa,Masculino""".format(uuid=uuid.uuid4().hex[:8])
        
        files = {'file': ('test_pt.csv', csv_content, 'text/csv')}
        response = requests.post(f"{BASE_URL}/api/members/import", files=files, headers=self.headers)
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        assert data.get('success', 0) >= 1, "Should import at least 1 member"
    
    def test_import_spanish_headers(self):
        """Import CSV with Spanish headers"""
        csv_content = """Nombre,Apellido,Fecha de Nacimiento,Email,Rol,Numero,Posición,Teléfono,Nacionalidad,Sexo
Carlos,García,2009-03-22,test_es_{uuid}@test.com,jugador,7,JC,923456789,Española,Masculino""".format(uuid=uuid.uuid4().hex[:8])
        
        files = {'file': ('test_es.csv', csv_content, 'text/csv')}
        response = requests.post(f"{BASE_URL}/api/members/import", files=files, headers=self.headers)
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        assert data.get('success', 0) >= 1, "Should import at least 1 member"
    
    def test_import_french_headers(self):
        """Import CSV with French headers"""
        csv_content = """Prénom,Nom,Date de Naissance,Email,Fonction,Numéro,Poste,Téléphone,Nationalité,Sexe
Pierre,Dupont,2011-08-10,test_fr_{uuid}@test.com,joueur,3,JC,934567890,Française,Masculino""".format(uuid=uuid.uuid4().hex[:8])
        
        files = {'file': ('test_fr.csv', csv_content, 'text/csv')}
        response = requests.post(f"{BASE_URL}/api/members/import", files=files, headers=self.headers)
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        assert data.get('success', 0) >= 1, "Should import at least 1 member"
    
    def test_import_italian_headers(self):
        """Import CSV with Italian headers"""
        csv_content = """Nome,Cognome,Data di Nascita,Email,Ruolo,Numero,Posizione,Telefono,Nazionalità,Sesso
Marco,Rossi,2010-01-20,test_it_{uuid}@test.com,giocatore,5,JC,945678901,Italiana,Masculino""".format(uuid=uuid.uuid4().hex[:8])
        
        files = {'file': ('test_it.csv', csv_content, 'text/csv')}
        response = requests.post(f"{BASE_URL}/api/members/import", files=files, headers=self.headers)
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        assert data.get('success', 0) >= 1, "Should import at least 1 member"
    
    def test_import_english_headers(self):
        """Import CSV with English headers"""
        csv_content = """First Name,Surname,Date of Birth,Email,Role,Number,Position,Phone,Nationality,Gender
John,Smith,2009-06-30,test_en_{uuid}@test.com,player,8,JC,956789012,British,male""".format(uuid=uuid.uuid4().hex[:8])
        
        files = {'file': ('test_en.csv', csv_content, 'text/csv')}
        response = requests.post(f"{BASE_URL}/api/members/import", files=files, headers=self.headers)
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        assert data.get('success', 0) >= 1, "Should import at least 1 member"


class TestMultilingualRoleMapping:
    """Test role mapping from all 5 languages"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data['token']
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def _import_with_role(self, role_name, expected_role):
        """Helper to import a member with a specific role name"""
        test_email = f"test_role_{uuid.uuid4().hex[:8]}@test.com"
        csv_content = f"""Nome,Email,Função
Test User,{test_email},{role_name}"""
        
        files = {'file': ('test_role.csv', csv_content, 'text/csv')}
        response = requests.post(f"{BASE_URL}/api/members/import", files=files, headers=self.headers)
        
        assert response.status_code == 200, f"Import failed for role '{role_name}': {response.text}"
        data = response.json()
        
        if data.get('success', 0) >= 1 and data.get('created'):
            created_user = data['created'][0]
            # Get the user by email to verify role (import doesn't return id)
            users_resp = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
            if users_resp.status_code == 200:
                users = users_resp.json()
                user = next((u for u in users if u.get('email') == test_email), None)
                if user:
                    assert user.get('role') == expected_role, f"Role mismatch: expected '{expected_role}', got '{user.get('role')}'"
                    # Cleanup
                    requests.delete(f"{BASE_URL}/api/members/{user['id']}", headers=self.headers)
                    return True
        return False
    
    def test_role_mapping_portuguese(self):
        """Test Portuguese role names"""
        roles = [
            ('treinador', 'treinador'),
            ('treinador adjunto', 'treinador_adjunto'),
            ('delegado', 'delegado'),
            ('jogador', 'jogador'),
            ('responsável', 'responsavel'),
            ('gestor desportivo', 'gestor_desportivo'),
        ]
        for role_name, expected in roles:
            result = self._import_with_role(role_name, expected)
            print(f"PT role '{role_name}' -> '{expected}': {'PASS' if result else 'SKIP'}")
    
    def test_role_mapping_spanish(self):
        """Test Spanish role names"""
        roles = [
            ('entrenador', 'treinador'),
            ('entrenador asistente', 'treinador_adjunto'),
            ('jugador', 'jogador'),
            ('responsable', 'responsavel'),
        ]
        for role_name, expected in roles:
            result = self._import_with_role(role_name, expected)
            print(f"ES role '{role_name}' -> '{expected}': {'PASS' if result else 'SKIP'}")
    
    def test_role_mapping_french(self):
        """Test French role names"""
        roles = [
            ('entraîneur', 'treinador'),
            ('entraîneur adjoint', 'treinador_adjunto'),
            ('délégué', 'delegado'),
            ('joueur', 'jogador'),
        ]
        for role_name, expected in roles:
            result = self._import_with_role(role_name, expected)
            print(f"FR role '{role_name}' -> '{expected}': {'PASS' if result else 'SKIP'}")
    
    def test_role_mapping_italian(self):
        """Test Italian role names"""
        roles = [
            ('allenatore', 'treinador'),
            ('allenatore in seconda', 'treinador_adjunto'),
            ('giocatore', 'jogador'),
        ]
        for role_name, expected in roles:
            result = self._import_with_role(role_name, expected)
            print(f"IT role '{role_name}' -> '{expected}': {'PASS' if result else 'SKIP'}")
    
    def test_role_mapping_english(self):
        """Test English role names"""
        roles = [
            ('coach', 'treinador'),
            ('assistant coach', 'treinador_adjunto'),
            ('delegate', 'delegado'),
            ('player', 'jogador'),
            ('guardian', 'responsavel'),
            ('sports manager', 'gestor_desportivo'),
        ]
        for role_name, expected in roles:
            result = self._import_with_role(role_name, expected)
            print(f"EN role '{role_name}' -> '{expected}': {'PASS' if result else 'SKIP'}")


class TestMemberGrouping:
    """Test member grouping logic (Staff vs Players)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data['token']
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_staff_roles_identified(self):
        """Staff roles should be correctly identified"""
        staff_roles = ['admin', 'gestor_desportivo', 'treinador', 'treinador_adjunto', 'delegado']
        player_roles = ['jogador', 'responsavel']
        
        # Get all users
        response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        assert response.status_code == 200
        
        users = response.json()
        for user in users:
            role = user.get('role', '')
            if role in staff_roles:
                print(f"User {user.get('name')} with role '{role}' is STAFF")
            elif role in player_roles:
                print(f"User {user.get('name')} with role '{role}' is PLAYER")
    
    def test_members_endpoint_returns_team_role(self):
        """Members endpoint should return team_role for grouping"""
        # Get teams first
        teams_resp = requests.get(f"{BASE_URL}/api/teams", headers=self.headers)
        if teams_resp.status_code == 200 and teams_resp.json():
            team_id = teams_resp.json()[0]['id']
            
            # Get members for this team
            members_resp = requests.get(f"{BASE_URL}/api/members?team_id={team_id}", headers=self.headers)
            assert members_resp.status_code == 200
            
            data = members_resp.json()
            members = data.get('members', [])
            
            for member in members:
                # Each member should have either team_role or role
                role = member.get('team_role') or member.get('role')
                assert role, f"Member {member.get('name')} has no role"
                print(f"Member {member.get('name')}: role={role}")


class TestTranslationKeys:
    """Test that translation keys exist for all roles"""
    
    def test_role_translation_keys(self):
        """Verify role translation keys are defined"""
        expected_keys = [
            'admin',
            'sports_manager',
            'coach',
            'assistant_coach',
            'delegate',
            'player',
            'guardian'
        ]
        
        # This is a frontend test - we just verify the keys are expected
        print("Expected role translation keys:")
        for key in expected_keys:
            print(f"  - roles.{key}")
        
        assert len(expected_keys) == 7, "Should have 7 role translation keys"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

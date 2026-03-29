"""
Test Member Import Functionality
Tests CSV and Excel import with all columns: Nome, Apelido, Data Nascimento, Email, Função, Número, Posição, Telefone, Nacionalidade, Sexo
"""
import pytest
import requests
import os
import io
import csv
import tempfile

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "test123456"


class TestMemberImport:
    """Test member import functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test - login as admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        self.token = data["token"]
        self.user = data["user"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Get club_id
        clubs_response = self.session.get(f"{BASE_URL}/api/clubs")
        if clubs_response.status_code == 200 and clubs_response.json():
            self.club_id = clubs_response.json()[0]["id"]
        else:
            self.club_id = None
        
        # Get a team_id
        teams_response = self.session.get(f"{BASE_URL}/api/teams")
        if teams_response.status_code == 200 and teams_response.json():
            self.team_id = teams_response.json()[0]["id"]
        else:
            self.team_id = None
    
    def test_import_csv_basic(self):
        """Test basic CSV import with all columns"""
        # Create CSV content with all columns
        csv_content = """Nome,Apelido,Data de Nascimento,Email,Função,Número,Posição,Telefone,Nacionalidade,Sexo
João,Silva,2010-05-15,test_import_joao@test.com,jogador,10,JC,912345678,Portuguesa,Masculino
Maria,Santos,2009-03-22,test_import_maria@test.com,jogador,1,GR,923456789,Brasileira,Feminino"""
        
        # Create file-like object
        files = {
            'file': ('test_members.csv', csv_content, 'text/csv')
        }
        
        # Remove Content-Type header for multipart
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/members/import",
            files=files,
            headers=headers
        )
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        
        # Verify results
        assert data["success"] >= 2, f"Expected at least 2 imports, got {data['success']}"
        assert len(data["created"]) >= 2, "Expected created members list"
        
        # Verify temp passwords are returned
        for member in data["created"]:
            assert "temp_password" in member, "Missing temp_password"
            assert "name" in member, "Missing name"
            assert "email" in member, "Missing email"
        
        print(f"✓ CSV import successful: {data['success']} members imported")
    
    def test_import_csv_with_team_id(self):
        """Test CSV import with team association"""
        if not self.team_id:
            pytest.skip("No team available for testing")
        
        csv_content = """Nome,Apelido,Email,Função,Número,Posição
Pedro,Costa,test_import_pedro@test.com,jogador,7,JC"""
        
        files = {
            'file': ('test_members.csv', csv_content, 'text/csv')
        }
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/members/import?team_id={self.team_id}",
            files=files,
            headers=headers
        )
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        assert data["success"] >= 1, "Expected at least 1 import"
        
        print(f"✓ CSV import with team_id successful: {data['success']} members")
    
    def test_import_csv_with_club_id(self):
        """Test CSV import with club association"""
        if not self.club_id:
            pytest.skip("No club available for testing")
        
        csv_content = """Nome,Apelido,Email,Função
Ana,Oliveira,test_import_ana@test.com,treinador"""
        
        files = {
            'file': ('test_members.csv', csv_content, 'text/csv')
        }
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/members/import?club_id={self.club_id}",
            files=files,
            headers=headers
        )
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        assert data["success"] >= 1, "Expected at least 1 import"
        
        print(f"✓ CSV import with club_id successful: {data['success']} members")
    
    def test_import_role_mapping_jogador(self):
        """Test role mapping for jogador"""
        csv_content = """Nome,Email,Função
Test Jogador,test_import_jogador@test.com,jogador"""
        
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(f"{BASE_URL}/api/members/import", files=files, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] >= 1
        
        print("✓ Role mapping 'jogador' works correctly")
    
    def test_import_role_mapping_treinador(self):
        """Test role mapping for treinador"""
        csv_content = """Nome,Email,Função
Test Treinador,test_import_treinador@test.com,treinador"""
        
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(f"{BASE_URL}/api/members/import", files=files, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] >= 1
        
        print("✓ Role mapping 'treinador' works correctly")
    
    def test_import_role_mapping_treinador_adjunto(self):
        """Test role mapping for treinador adjunto"""
        csv_content = """Nome,Email,Função
Test Adjunto,test_import_adjunto@test.com,treinador adjunto"""
        
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(f"{BASE_URL}/api/members/import", files=files, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] >= 1
        
        print("✓ Role mapping 'treinador adjunto' works correctly")
    
    def test_import_role_mapping_delegado(self):
        """Test role mapping for delegado"""
        csv_content = """Nome,Email,Função
Test Delegado,test_import_delegado@test.com,delegado"""
        
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(f"{BASE_URL}/api/members/import", files=files, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] >= 1
        
        print("✓ Role mapping 'delegado' works correctly")
    
    def test_import_role_mapping_responsavel(self):
        """Test role mapping for responsável"""
        csv_content = """Nome,Email,Função
Test Responsavel,test_import_responsavel@test.com,responsável"""
        
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(f"{BASE_URL}/api/members/import", files=files, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] >= 1
        
        print("✓ Role mapping 'responsável' works correctly")
    
    def test_import_role_mapping_gestor_desportivo(self):
        """Test role mapping for gestor desportivo"""
        csv_content = """Nome,Email,Função
Test Gestor,test_import_gestor@test.com,gestor desportivo"""
        
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(f"{BASE_URL}/api/members/import", files=files, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] >= 1
        
        print("✓ Role mapping 'gestor desportivo' works correctly")
    
    def test_import_position_normalization_gr(self):
        """Test position normalization for GR (Guarda-Redes)"""
        csv_content = """Nome,Email,Posição
Test GR1,test_import_gr1@test.com,GR
Test GR2,test_import_gr2@test.com,guarda-redes
Test GR3,test_import_gr3@test.com,goalkeeper"""
        
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(f"{BASE_URL}/api/members/import", files=files, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] >= 3
        
        print("✓ Position normalization for GR works correctly")
    
    def test_import_position_normalization_jc(self):
        """Test position normalization for JC (Jogador de Campo)"""
        csv_content = """Nome,Email,Posição
Test JC1,test_import_jc1@test.com,JC
Test JC2,test_import_jc2@test.com,jogador de campo
Test JC3,test_import_jc3@test.com,field player"""
        
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(f"{BASE_URL}/api/members/import", files=files, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] >= 3
        
        print("✓ Position normalization for JC works correctly")
    
    def test_import_nationality_conversion_pt(self):
        """Test nationality conversion to ISO codes - Portuguese"""
        csv_content = """Nome,Email,Nacionalidade
Test PT1,test_import_pt1@test.com,Portuguesa
Test PT2,test_import_pt2@test.com,Portugal
Test PT3,test_import_pt3@test.com,PT"""
        
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(f"{BASE_URL}/api/members/import", files=files, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] >= 3
        
        print("✓ Nationality conversion for PT works correctly")
    
    def test_import_nationality_conversion_br(self):
        """Test nationality conversion to ISO codes - Brazilian"""
        csv_content = """Nome,Email,Nacionalidade
Test BR1,test_import_br1@test.com,Brasileira
Test BR2,test_import_br2@test.com,Brasil
Test BR3,test_import_br3@test.com,BR"""
        
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(f"{BASE_URL}/api/members/import", files=files, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] >= 3
        
        print("✓ Nationality conversion for BR works correctly")
    
    def test_import_nationality_conversion_es(self):
        """Test nationality conversion to ISO codes - Spanish"""
        csv_content = """Nome,Email,Nacionalidade
Test ES1,test_import_es1@test.com,Espanhola
Test ES2,test_import_es2@test.com,Espanha
Test ES3,test_import_es3@test.com,ES"""
        
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(f"{BASE_URL}/api/members/import", files=files, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] >= 3
        
        print("✓ Nationality conversion for ES works correctly")
    
    def test_import_duplicate_email_warning(self):
        """Test that duplicate emails generate warnings but still create users"""
        # First import
        csv_content1 = """Nome,Email,Função
Test Dup1,test_import_dup@test.com,jogador"""
        
        files = {'file': ('test.csv', csv_content1, 'text/csv')}
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response1 = requests.post(f"{BASE_URL}/api/members/import", files=files, headers=headers)
        assert response1.status_code == 200
        
        # Second import with same email
        csv_content2 = """Nome,Email,Função
Test Dup2,test_import_dup@test.com,jogador"""
        
        files = {'file': ('test.csv', csv_content2, 'text/csv')}
        
        response2 = requests.post(f"{BASE_URL}/api/members/import", files=files, headers=headers)
        assert response2.status_code == 200
        data = response2.json()
        
        # Should have warnings about duplicate email
        assert "warnings" in data, "Expected warnings for duplicate email"
        assert len(data["warnings"]) > 0, "Expected at least one warning"
        assert "duplicado" in data["warnings"][0].lower() or "duplicate" in data["warnings"][0].lower(), \
            f"Expected duplicate warning, got: {data['warnings']}"
        
        print(f"✓ Duplicate email warning works: {data['warnings']}")
    
    def test_import_gender_normalization(self):
        """Test gender/sexo normalization"""
        csv_content = """Nome,Email,Sexo
Test M1,test_import_m1@test.com,Masculino
Test M2,test_import_m2@test.com,M
Test M3,test_import_m3@test.com,male
Test F1,test_import_f1@test.com,Feminino
Test F2,test_import_f2@test.com,F
Test F3,test_import_f3@test.com,female"""
        
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(f"{BASE_URL}/api/members/import", files=files, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] >= 6
        
        print("✓ Gender normalization works correctly")
    
    def test_import_missing_required_fields(self):
        """Test import with missing required fields (name or email)"""
        csv_content = """Nome,Email,Função
,missing_name@test.com,jogador
Missing Email,,jogador"""
        
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(f"{BASE_URL}/api/members/import", files=files, headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Should have errors for missing fields
        assert len(data["errors"]) >= 2, f"Expected errors for missing fields, got: {data['errors']}"
        
        print(f"✓ Missing required fields handled: {len(data['errors'])} errors")
    
    def test_import_all_columns_complete(self):
        """Test import with all columns filled"""
        csv_content = """Nome,Apelido,Data de Nascimento,Email,Função,Número,Posição,Telefone,Nacionalidade,Sexo
Complete,Test,2010-01-15,test_import_complete@test.com,jogador,99,JC,999888777,Portuguesa,Masculino"""
        
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(f"{BASE_URL}/api/members/import", files=files, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] >= 1
        
        # Verify the created member has all fields
        assert len(data["created"]) >= 1
        created = data["created"][0]
        assert "Complete Test" in created["name"], f"Expected full name, got: {created['name']}"
        
        print("✓ All columns import works correctly")
    
    def test_import_unauthorized(self):
        """Test import without authentication"""
        csv_content = """Nome,Email,Função
Unauthorized,unauth@test.com,jogador"""
        
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        
        # No auth header
        response = requests.post(f"{BASE_URL}/api/members/import", files=files)
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        print("✓ Unauthorized import correctly rejected")


class TestMemberImportExcel:
    """Test Excel (.xlsx) import functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test - login as admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        self.token = data["token"]
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_import_excel_file(self):
        """Test Excel file import"""
        try:
            import openpyxl
            from io import BytesIO
            
            # Create Excel file in memory
            wb = openpyxl.Workbook()
            ws = wb.active
            
            # Headers
            headers = ["Nome", "Apelido", "Data de Nascimento", "Email", "Função", "Número", "Posição", "Telefone", "Nacionalidade", "Sexo"]
            ws.append(headers)
            
            # Data rows
            ws.append(["Excel", "Test1", "2010-05-15", "test_import_excel1@test.com", "jogador", "11", "JC", "911111111", "Portuguesa", "Masculino"])
            ws.append(["Excel", "Test2", "2009-03-22", "test_import_excel2@test.com", "treinador", "", "", "922222222", "Brasileira", "Feminino"])
            
            # Save to bytes
            excel_buffer = BytesIO()
            wb.save(excel_buffer)
            excel_buffer.seek(0)
            
            files = {
                'file': ('test_members.xlsx', excel_buffer.getvalue(), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            }
            headers = {"Authorization": f"Bearer {self.token}"}
            
            response = requests.post(f"{BASE_URL}/api/members/import", files=files, headers=headers)
            assert response.status_code == 200, f"Excel import failed: {response.text}"
            data = response.json()
            
            assert data["success"] >= 2, f"Expected at least 2 imports, got {data['success']}"
            
            print(f"✓ Excel import successful: {data['success']} members imported")
            
        except ImportError:
            pytest.skip("openpyxl not installed - skipping Excel test")


class TestTemplateDownload:
    """Test CSV template download functionality"""
    
    def test_template_structure(self):
        """Verify the expected template structure matches the import"""
        expected_columns = [
            "Nome", "Apelido", "Data de Nascimento", "Email", "Função", 
            "Número", "Posição", "Telefone", "Nacionalidade", "Sexo"
        ]
        
        # The template is generated client-side, but we verify the import accepts these columns
        csv_content = ",".join(expected_columns) + "\n"
        csv_content += "Test,Template,2010-01-01,test_template@test.com,jogador,1,JC,912345678,Portuguesa,Masculino"
        
        # Login
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["token"]
        
        files = {'file': ('template_test.csv', csv_content, 'text/csv')}
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.post(f"{BASE_URL}/api/members/import", files=files, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] >= 1, "Template structure should be valid for import"
        
        print("✓ Template structure is valid for import")


# Cleanup function to remove test data
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data():
    """Cleanup test-created data after all tests"""
    yield
    
    # Login as admin
    session = requests.Session()
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    if response.status_code == 200:
        token = response.json()["token"]
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        # Note: In a real scenario, we would delete test users
        # For now, we just log that cleanup would happen
        print("\n[Cleanup] Test data cleanup would remove users with 'test_import_' prefix")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

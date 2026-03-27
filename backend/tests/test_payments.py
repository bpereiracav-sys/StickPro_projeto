"""
Payments Module Tests
Tests for: Monthly fees, Custom payments, Payment status, Mark as paid, RBAC
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "test123456"

# Test data
TEST_PLAYER_EMAIL = f"test_player_payments_{datetime.now().strftime('%H%M%S')}@example.com"
TEST_PLAYER_NAME = "TEST_PaymentPlayer"


class TestPaymentsModule:
    """Test suite for Payments Module"""
    
    admin_token = None
    player_token = None
    player_id = None
    created_fee_id = None
    created_custom_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self, request):
        """Setup test fixtures"""
        if not TestPaymentsModule.admin_token:
            # Login as admin
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            assert response.status_code == 200, f"Admin login failed: {response.text}"
            TestPaymentsModule.admin_token = response.json()['token']
    
    def get_admin_headers(self):
        return {"Authorization": f"Bearer {TestPaymentsModule.admin_token}"}
    
    def get_player_headers(self):
        if TestPaymentsModule.player_token:
            return {"Authorization": f"Bearer {TestPaymentsModule.player_token}"}
        return None
    
    # ==================== AUTH TESTS ====================
    
    def test_01_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data['user']['role'] == 'admin'
        print("✓ Admin login successful")
    
    def test_02_create_test_player(self):
        """Create a test player for payment tests"""
        response = requests.post(f"{BASE_URL}/api/members", 
            headers=self.get_admin_headers(),
            json={
                "name": TEST_PLAYER_NAME,
                "email": TEST_PLAYER_EMAIL,
                "role": "jogador"
            }
        )
        assert response.status_code == 200, f"Failed to create player: {response.text}"
        data = response.json()
        TestPaymentsModule.player_id = data['user']['id']
        
        # Login as player
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_PLAYER_EMAIL,
            "password": data['temp_password']
        })
        if login_resp.status_code == 200:
            TestPaymentsModule.player_token = login_resp.json()['token']
        
        print(f"✓ Test player created: {TestPaymentsModule.player_id}")
    
    # ==================== PAYMENT STATUS TESTS ====================
    
    def test_03_get_payment_status_admin(self):
        """GET /api/payments/status - Admin can get their payment status"""
        response = requests.get(f"{BASE_URL}/api/payments/status",
            headers=self.get_admin_headers()
        )
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data['status'] in ['paid', 'pending', 'overdue', 'disabled']
        print(f"✓ Payment status retrieved: {data['status']}")
    
    def test_04_get_my_payments_admin(self):
        """GET /api/payments/my - Admin can get their own payments"""
        response = requests.get(f"{BASE_URL}/api/payments/my",
            headers=self.get_admin_headers()
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ My payments retrieved: {len(data)} payments")
    
    # ==================== ADMIN PAYMENT MANAGEMENT TESTS ====================
    
    def test_05_get_payments_summary_admin(self):
        """GET /api/payments/summary - Admin can get payments summary"""
        response = requests.get(f"{BASE_URL}/api/payments/summary",
            headers=self.get_admin_headers()
        )
        assert response.status_code == 200
        data = response.json()
        assert "overdue_count" in data
        assert "pending_count" in data
        assert "total_overdue" in data
        assert "total_pending" in data
        assert "collected_this_month" in data
        assert "paid_count_this_month" in data
        print(f"✓ Payments summary: Overdue={data['overdue_count']}, Pending={data['pending_count']}")
    
    def test_06_get_all_payments_admin(self):
        """GET /api/payments/admin - Admin can get all payments"""
        response = requests.get(f"{BASE_URL}/api/payments/admin",
            headers=self.get_admin_headers()
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ All payments retrieved: {len(data)} payments")
    
    def test_07_create_monthly_fee(self):
        """POST /api/payments/monthly-fees - Admin can create monthly fee"""
        assert TestPaymentsModule.player_id, "Player ID not set"
        
        due_date = (datetime.now() + timedelta(days=30)).isoformat()
        response = requests.post(f"{BASE_URL}/api/payments/monthly-fees",
            headers=self.get_admin_headers(),
            json={
                "user_id": TestPaymentsModule.player_id,
                "amount": 25.00,
                "month": 1,
                "year": 2026,
                "due_date": due_date,
                "notes": "TEST monthly fee"
            }
        )
        assert response.status_code == 200, f"Failed to create fee: {response.text}"
        data = response.json()
        assert "id" in data
        assert data['amount'] == 25.00
        assert data['month'] == 1
        assert data['year'] == 2026
        TestPaymentsModule.created_fee_id = data['id']
        print(f"✓ Monthly fee created: {data['id']}")
    
    def test_08_create_duplicate_monthly_fee_fails(self):
        """POST /api/payments/monthly-fees - Duplicate fee for same month/year fails"""
        assert TestPaymentsModule.player_id, "Player ID not set"
        
        due_date = (datetime.now() + timedelta(days=30)).isoformat()
        response = requests.post(f"{BASE_URL}/api/payments/monthly-fees",
            headers=self.get_admin_headers(),
            json={
                "user_id": TestPaymentsModule.player_id,
                "amount": 25.00,
                "month": 1,
                "year": 2026,
                "due_date": due_date
            }
        )
        assert response.status_code == 400
        assert "Já existe" in response.json().get('detail', '')
        print("✓ Duplicate monthly fee correctly rejected")
    
    def test_09_create_custom_payment(self):
        """POST /api/payments/custom - Admin can create custom payment"""
        assert TestPaymentsModule.player_id, "Player ID not set"
        
        due_date = (datetime.now() + timedelta(days=15)).isoformat()
        response = requests.post(f"{BASE_URL}/api/payments/custom",
            headers=self.get_admin_headers(),
            json={
                "user_id": TestPaymentsModule.player_id,
                "title": "TEST Equipment Fee",
                "description": "Test equipment purchase",
                "amount": 50.00,
                "due_date": due_date
            }
        )
        assert response.status_code == 200, f"Failed to create custom payment: {response.text}"
        data = response.json()
        assert "id" in data
        assert data['title'] == "TEST Equipment Fee"
        assert data['amount'] == 50.00
        TestPaymentsModule.created_custom_id = data['id']
        print(f"✓ Custom payment created: {data['id']}")
    
    def test_10_get_user_payments(self):
        """GET /api/users/{user_id}/payments - Admin can get user's payments"""
        assert TestPaymentsModule.player_id, "Player ID not set"
        
        response = requests.get(f"{BASE_URL}/api/users/{TestPaymentsModule.player_id}/payments",
            headers=self.get_admin_headers()
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2  # At least the fee and custom payment we created
        
        # Verify our created payments are in the list
        payment_ids = [p['id'] for p in data]
        assert TestPaymentsModule.created_fee_id in payment_ids
        assert TestPaymentsModule.created_custom_id in payment_ids
        print(f"✓ User payments retrieved: {len(data)} payments")
    
    def test_11_filter_payments_by_status(self):
        """GET /api/payments/admin?status=pending - Filter by status works"""
        response = requests.get(f"{BASE_URL}/api/payments/admin",
            headers=self.get_admin_headers(),
            params={"status": "pending"}
        )
        assert response.status_code == 200
        data = response.json()
        # All returned payments should be pending
        for payment in data:
            assert payment.get('status') == 'pending', f"Expected pending, got {payment.get('status')}"
        print(f"✓ Filtered payments by status: {len(data)} pending payments")
    
    def test_12_mark_payment_as_paid(self):
        """PUT /api/payments/{type}/{id}/mark-paid - Admin can mark as paid"""
        assert TestPaymentsModule.created_fee_id, "Fee ID not set"
        
        response = requests.put(
            f"{BASE_URL}/api/payments/monthly_fee/{TestPaymentsModule.created_fee_id}/mark-paid",
            headers=self.get_admin_headers()
        )
        assert response.status_code == 200
        assert "pago" in response.json().get('message', '').lower()
        
        # Verify the payment is now paid
        payments_resp = requests.get(f"{BASE_URL}/api/users/{TestPaymentsModule.player_id}/payments",
            headers=self.get_admin_headers()
        )
        payments = payments_resp.json()
        fee = next((p for p in payments if p['id'] == TestPaymentsModule.created_fee_id), None)
        assert fee is not None
        assert fee.get('paid_at') is not None
        print("✓ Payment marked as paid successfully")
    
    # ==================== PLAYER ACCESS TESTS ====================
    
    def test_13_player_can_see_own_payments(self):
        """GET /api/payments/my - Player can see their own payments"""
        if not TestPaymentsModule.player_token:
            pytest.skip("Player token not available")
        
        response = requests.get(f"{BASE_URL}/api/payments/my",
            headers=self.get_player_headers()
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should see the payments we created for this player
        assert len(data) >= 2
        print(f"✓ Player can see own payments: {len(data)} payments")
    
    def test_14_player_can_get_payment_status(self):
        """GET /api/payments/status - Player can get their payment status"""
        if not TestPaymentsModule.player_token:
            pytest.skip("Player token not available")
        
        response = requests.get(f"{BASE_URL}/api/payments/status",
            headers=self.get_player_headers()
        )
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        print(f"✓ Player payment status: {data['status']}")
    
    # ==================== RBAC TESTS ====================
    
    def test_15_player_cannot_access_admin_payments(self):
        """GET /api/payments/admin - Player cannot access admin endpoint"""
        if not TestPaymentsModule.player_token:
            pytest.skip("Player token not available")
        
        response = requests.get(f"{BASE_URL}/api/payments/admin",
            headers=self.get_player_headers()
        )
        assert response.status_code == 403
        print("✓ Player correctly denied access to admin payments")
    
    def test_16_player_cannot_access_summary(self):
        """GET /api/payments/summary - Player cannot access summary"""
        if not TestPaymentsModule.player_token:
            pytest.skip("Player token not available")
        
        response = requests.get(f"{BASE_URL}/api/payments/summary",
            headers=self.get_player_headers()
        )
        assert response.status_code == 403
        print("✓ Player correctly denied access to payments summary")
    
    def test_17_player_cannot_create_monthly_fee(self):
        """POST /api/payments/monthly-fees - Player cannot create fees"""
        if not TestPaymentsModule.player_token:
            pytest.skip("Player token not available")
        
        response = requests.post(f"{BASE_URL}/api/payments/monthly-fees",
            headers=self.get_player_headers(),
            json={
                "user_id": TestPaymentsModule.player_id,
                "amount": 25.00,
                "month": 2,
                "year": 2026,
                "due_date": datetime.now().isoformat()
            }
        )
        assert response.status_code == 403
        print("✓ Player correctly denied creating monthly fee")
    
    def test_18_player_cannot_create_custom_payment(self):
        """POST /api/payments/custom - Player cannot create custom payments"""
        if not TestPaymentsModule.player_token:
            pytest.skip("Player token not available")
        
        response = requests.post(f"{BASE_URL}/api/payments/custom",
            headers=self.get_player_headers(),
            json={
                "user_id": TestPaymentsModule.player_id,
                "title": "Unauthorized Payment",
                "amount": 100.00,
                "due_date": datetime.now().isoformat()
            }
        )
        assert response.status_code == 403
        print("✓ Player correctly denied creating custom payment")
    
    def test_19_player_cannot_mark_as_paid(self):
        """PUT /api/payments/{type}/{id}/mark-paid - Player cannot mark as paid"""
        if not TestPaymentsModule.player_token:
            pytest.skip("Player token not available")
        
        response = requests.put(
            f"{BASE_URL}/api/payments/custom/{TestPaymentsModule.created_custom_id}/mark-paid",
            headers=self.get_player_headers()
        )
        assert response.status_code == 403
        print("✓ Player correctly denied marking payment as paid")
    
    def test_20_player_cannot_delete_payment(self):
        """DELETE /api/payments/{type}/{id} - Player cannot delete payments"""
        if not TestPaymentsModule.player_token:
            pytest.skip("Player token not available")
        
        response = requests.delete(
            f"{BASE_URL}/api/payments/custom/{TestPaymentsModule.created_custom_id}",
            headers=self.get_player_headers()
        )
        assert response.status_code == 403
        print("✓ Player correctly denied deleting payment")
    
    # ==================== BULK OPERATIONS TESTS ====================
    
    def test_21_create_bulk_monthly_fees(self):
        """POST /api/payments/monthly-fees/bulk - Admin can create bulk fees"""
        due_date = (datetime.now() + timedelta(days=30)).isoformat()
        response = requests.post(f"{BASE_URL}/api/payments/monthly-fees/bulk",
            headers=self.get_admin_headers(),
            params={
                "month": 2,
                "year": 2026,
                "amount": 30.00,
                "due_date": due_date
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "criadas" in data['message'].lower() or "created" in data['message'].lower()
        print(f"✓ Bulk fees created: {data['message']}")
    
    # ==================== CLEANUP TESTS ====================
    
    def test_22_delete_custom_payment(self):
        """DELETE /api/payments/{type}/{id} - Admin can delete payment"""
        assert TestPaymentsModule.created_custom_id, "Custom payment ID not set"
        
        response = requests.delete(
            f"{BASE_URL}/api/payments/custom/{TestPaymentsModule.created_custom_id}",
            headers=self.get_admin_headers()
        )
        assert response.status_code == 200
        print("✓ Custom payment deleted successfully")
    
    def test_23_delete_monthly_fee(self):
        """DELETE /api/payments/{type}/{id} - Admin can delete monthly fee"""
        assert TestPaymentsModule.created_fee_id, "Fee ID not set"
        
        response = requests.delete(
            f"{BASE_URL}/api/payments/monthly_fee/{TestPaymentsModule.created_fee_id}",
            headers=self.get_admin_headers()
        )
        assert response.status_code == 200
        print("✓ Monthly fee deleted successfully")
    
    def test_24_delete_nonexistent_payment_fails(self):
        """DELETE /api/payments/{type}/{id} - Deleting nonexistent payment returns 404"""
        response = requests.delete(
            f"{BASE_URL}/api/payments/monthly_fee/nonexistent-id-12345",
            headers=self.get_admin_headers()
        )
        assert response.status_code == 404
        print("✓ Nonexistent payment correctly returns 404")


class TestCoachDelegateRBAC:
    """Test that coach and delegate cannot access payments"""
    
    def test_coach_cannot_access_payments_admin(self):
        """Coach role should not have access to payments admin"""
        # First create a coach user
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        admin_token = admin_resp.json()['token']
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create coach
        coach_email = f"test_coach_payments_{datetime.now().strftime('%H%M%S')}@example.com"
        create_resp = requests.post(f"{BASE_URL}/api/members",
            headers=admin_headers,
            json={
                "name": "TEST_Coach",
                "email": coach_email,
                "role": "treinador"
            }
        )
        
        if create_resp.status_code == 200:
            temp_password = create_resp.json()['temp_password']
            
            # Login as coach
            coach_login = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": coach_email,
                "password": temp_password
            })
            
            if coach_login.status_code == 200:
                coach_token = coach_login.json()['token']
                coach_headers = {"Authorization": f"Bearer {coach_token}"}
                
                # Try to access payments admin
                response = requests.get(f"{BASE_URL}/api/payments/admin",
                    headers=coach_headers
                )
                assert response.status_code == 403
                print("✓ Coach correctly denied access to payments admin")
                
                # Try to access payments summary
                response = requests.get(f"{BASE_URL}/api/payments/summary",
                    headers=coach_headers
                )
                assert response.status_code == 403
                print("✓ Coach correctly denied access to payments summary")
            else:
                pytest.skip("Could not login as coach")
        else:
            pytest.skip("Could not create coach user")
    
    def test_delegate_cannot_access_payments_admin(self):
        """Delegate role should not have access to payments admin"""
        # First create a delegate user
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        admin_token = admin_resp.json()['token']
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create delegate
        delegate_email = f"test_delegate_payments_{datetime.now().strftime('%H%M%S')}@example.com"
        create_resp = requests.post(f"{BASE_URL}/api/members",
            headers=admin_headers,
            json={
                "name": "TEST_Delegate",
                "email": delegate_email,
                "role": "delegado"
            }
        )
        
        if create_resp.status_code == 200:
            temp_password = create_resp.json()['temp_password']
            
            # Login as delegate
            delegate_login = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": delegate_email,
                "password": temp_password
            })
            
            if delegate_login.status_code == 200:
                delegate_token = delegate_login.json()['token']
                delegate_headers = {"Authorization": f"Bearer {delegate_token}"}
                
                # Try to access payments admin
                response = requests.get(f"{BASE_URL}/api/payments/admin",
                    headers=delegate_headers
                )
                assert response.status_code == 403
                print("✓ Delegate correctly denied access to payments admin")
                
                # Try to create monthly fee
                response = requests.post(f"{BASE_URL}/api/payments/monthly-fees",
                    headers=delegate_headers,
                    json={
                        "user_id": "some-id",
                        "amount": 25.00,
                        "month": 3,
                        "year": 2026,
                        "due_date": datetime.now().isoformat()
                    }
                )
                assert response.status_code == 403
                print("✓ Delegate correctly denied creating monthly fee")
            else:
                pytest.skip("Could not login as delegate")
        else:
            pytest.skip("Could not create delegate user")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

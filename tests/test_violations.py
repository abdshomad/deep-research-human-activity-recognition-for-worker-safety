import unittest
import os
import sys
import sqlite3
from unittest.mock import MagicMock, AsyncMock

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set testing environment variable to use a test database
os.environ["TESTING"] = "1"

# Import will be tested once db.py is created
class TestViolationsDBAndAPI(unittest.TestCase):
    def setUp(self):
        # Ensure we start with a clean test database file
        self.db_path = "test_violations.db"
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
            
        # Re-initialize the test database
        from app.services.db import init_db
        init_db(db_path=self.db_path)

    def tearDown(self):
        # Clean up the test database file
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def test_database_crud(self):
        from app.services.db import (
            create_violation,
            get_violation,
            get_all_violations,
            update_violation
        )
        
        # 1. Create a violation
        v_id = create_violation(
            worker_id=2,
            risk_level="BAHAYA",
            reasons="Membungkuk berlebih, Zona terlarang",
            image_path="/static/violations/test_snap.jpg",
            db_path=self.db_path
        )
        self.assertIsNotNone(v_id)
        self.assertEqual(v_id, 1)

        # 2. Get the violation
        v = get_violation(v_id, db_path=self.db_path)
        self.assertIsNotNone(v)
        self.assertEqual(v["id"], v_id)
        self.assertEqual(v["worker_id"], 2)
        self.assertEqual(v["risk_level"], "BAHAYA")
        self.assertEqual(v["reasons"], "Membungkuk berlebih, Zona terlarang")
        self.assertEqual(v["image_path"], "/static/violations/test_snap.jpg")
        self.assertEqual(v["status"], "draft")
        self.assertEqual(v["action_taken"], "none")

        # 3. Update the violation
        rows_updated = update_violation(
            v_id,
            status="confirmed",
            action_taken="warning_sent",
            notes="Pekerja telah diperingatkan oleh supervisor.",
            db_path=self.db_path
        )
        self.assertEqual(rows_updated, 1)

        # 4. Check the updated violation
        v_updated = get_violation(v_id, db_path=self.db_path)
        self.assertEqual(v_updated["status"], "confirmed")
        self.assertEqual(v_updated["action_taken"], "warning_sent")
        self.assertEqual(v_updated["notes"], "Pekerja telah diperingatkan oleh supervisor.")

        # 5. List all violations
        all_v = get_all_violations(db_path=self.db_path)
        self.assertEqual(len(all_v), 1)
        self.assertEqual(all_v[0]["id"], v_id)

    def test_routes_exist_and_callable(self):
        # Test route modules can be imported and contain the expected endpoints
        from app.routes.hud import get_violation_detail, get_violations_history
        from app.routes.api import post_violation_action
        
        self.assertTrue(callable(get_violation_detail))
        self.assertTrue(callable(get_violations_history))
        self.assertTrue(callable(post_violation_action))

if __name__ == "__main__":
    unittest.main()

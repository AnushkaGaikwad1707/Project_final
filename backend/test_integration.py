"""
test_integration.py — Complete test suite for SIH26170 application backend.
"""
import sys
import unittest
from fastapi.testclient import TestClient

from main import app
import data_loader

class TestSIH26170Integration(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_health_check(self):
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json().get("status"), "ok")

    def test_02_system_status(self):
        res = self.client.get("/api/system/status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "ok")
        self.assertEqual(data.get("fusion_records"), 1343)
        self.assertEqual(data.get("module_a_records_168h"), 1343)
        self.assertEqual(data.get("module_b_records"), 1343)

    def test_03_analysis_summary(self):
        res = self.client.get("/api/analysis/summary")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("total"), 1343)
        self.assertIn("PASS", data.get("by_disposition", {}))
        self.assertIn("MONITOR", data.get("by_disposition", {}))

    def test_04_analysis_search(self):
        res = self.client.get("/api/analysis/search?q=C00158")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreaterEqual(len(data), 1)
        first = data[0]
        self.assertEqual(first.get("component_id"), "C00158")
        self.assertIn("disposition", first)

    def test_05_component_detail_full(self):
        res = self.client.get("/api/analysis/C00158")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("component_id"), "C00158")
        
        # Module A
        mod_a = data.get("module_a", {})
        self.assertIn("disposition", mod_a)
        self.assertIn("score", mod_a)
        self.assertIn("evidence_tier", mod_a)
        
        # Module B
        mod_b = data.get("module_b", {})
        self.assertIn("predictions", mod_b)
        self.assertIn("predicted_IDDQ_168h", mod_b)
        self.assertIn("primary_parameter", mod_b)
        
        # Evidence & Explanation
        evidence = data.get("evidence", {})
        self.assertIn("explanation", evidence)
        self.assertTrue(len(evidence.get("explanation", "")) > 10)
        
        # Historical measurements
        hist = data.get("historical_measurements", [])
        self.assertGreaterEqual(len(hist), 2)  # 0h and 24h

    def test_06_components_pagination(self):
        res = self.client.get("/api/components?page=1&per_page=20")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("page"), 1)
        self.assertEqual(data.get("per_page"), 20)
        self.assertEqual(len(data.get("data", [])), 20)

    def test_07_models_info(self):
        res = self.client.get("/api/models/info")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("module_a", data)
        self.assertIn("module_b", data)
        self.assertIn("integration", data)
        self.assertEqual(data["integration"].get("status"), "VERIFIED_PASS")

    def test_08_operational_measurement_lifecycle(self):
        cid = "OP_TEST_VERIF_01"
        payload = {
            "component_id": cid,
            "lot_id": "LOT_OP_01",
            "device_variant": "CMOS_B",
            "epoch_h": 0,
            "IDDQ": 1.45,
            "Input_Leakage_Current": 0.018,
            "Active_Supply_Current": 92.1,
            "Propagation_Delay": 9.5,
            "Output_Rise_Time": 8.0,
            "Output_Fall_Time": 8.1
        }
        res = self.client.post("/api/measurements", json=payload)
        # Can be 200 or 409 if already run
        self.assertIn(res.status_code, [200, 409])

        # Test validation rejection: negative value
        invalid_payload = {**payload, "component_id": "OP_BAD", "IDDQ": -1.0}
        bad_res = self.client.post("/api/measurements", json=invalid_payload)
        self.assertEqual(bad_res.status_code, 400)

    def test_09_reference_endpoints(self):
        specs_res = self.client.get("/api/reference/specs")
        self.assertEqual(specs_res.status_code, 200)
        
        dict_res = self.client.get("/api/reference/dictionary")
        self.assertEqual(dict_res.status_code, 200)

    def test_10_models_evaluation(self):
        res = self.client.get("/api/models/evaluation")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("baseline", data)
        base = data["baseline"]
        self.assertEqual(base.get("tp"), 65)
        self.assertEqual(base.get("tn"), 1240)
        self.assertEqual(base.get("fp"), 13)
        self.assertEqual(base.get("fn"), 25)
        self.assertAlmostEqual(base.get("f2"), 0.7420, places=3)
        
        # Verify D2 sensitivity comparison
        self.assertIn("comparison", data)
        comp = data["comparison"]
        self.assertEqual(comp.get("tp_delta"), 1)
        self.assertEqual(comp.get("fp_delta"), 5)
        self.assertEqual(comp.get("fn_delta"), -1)

    def test_11_lots_summary(self):
        res = self.client.get("/api/lots")
        self.assertEqual(res.status_code, 200)
        lots = res.json()
        self.assertEqual(len(lots), 18)
        self.assertEqual(lots[0].get("lot_id"), "A_L03")

    def test_12_pipeline_architecture(self):
        res = self.client.get("/api/pipeline/architecture")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(len(data.get("stages", [])), 7)


if __name__ == "__main__":
    unittest.main()


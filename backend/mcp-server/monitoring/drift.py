from evidently.report import Report
from evidently.metric_preset import DataDriftPreset, TargetDriftPreset
import pandas as pd
import os
from typing import Dict, List
import json
from datetime import datetime


class ModelMonitor:
    """
    Model drift and performance monitoring using Evidently AI.
    Saves reports to Supabase for the Admin Portal dashboard.
    """

    def __init__(self):
        self.reference_data_path = os.getenv(
            "REFERENCE_DATA_PATH", "data/reference/anemia_baseline.csv"
        )
        self.reports_dir = "data/reports"
        os.makedirs(self.reports_dir, exist_ok=True)

    def run_drift_analysis(self, current_data: List[Dict], model_name: str) -> Dict:
        """
        Compare current inference data against baseline to detect drift.
        """
        if not os.path.exists(self.reference_data_path):
            return {"status": "skipped", "reason": "baseline data missing"}

        ref_df = pd.read_csv(self.reference_data_path)
        cur_df = pd.DataFrame(current_data)

        drift_report = Report(metrics=[DataDriftPreset(), TargetDriftPreset()])

        drift_report.run(reference_data=ref_df, current_data=cur_df)

        report_json = drift_report.json()
        report_dict = json.loads(report_json)

        # Save to Supabase for Admin Portal
        self._save_report_to_db(model_name, report_dict)

        return report_dict

    def _save_report_to_db(self, model_name: str, report: Dict):
        from supabase import create_client

        supabase = create_client(
            os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY")
        )

        data = {
            "model_id": model_name,
            "alert_type": "drift_report",
            "severity": "info",
            "details": report,
            "timestamp": datetime.now().isoformat(),
        }
        supabase.table("model_alerts").insert(data).execute()


model_monitor = ModelMonitor()

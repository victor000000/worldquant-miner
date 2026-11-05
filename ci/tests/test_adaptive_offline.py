"""Regression tests with synthetic data; no authentication or external services."""
import importlib.util
import json
import logging
import os
from pathlib import Path
import pickle
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[2]
COMPONENT = ROOT / "consultant-multi-arm-bandit-ollama"


def load_module(name, filename):
    spec = importlib.util.spec_from_file_location(name, COMPONENT / filename)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    with patch("logging.FileHandler", return_value=logging.NullHandler()), patch("logging.basicConfig"):
        spec.loader.exec_module(module)
    return module


miner_module = load_module("offline_adaptive", "adaptive_alpha_miner.py")
dashboard = load_module("offline_dashboard", "web_dashboard.py")


class OfflineTest(unittest.TestCase):
    def setUp(self):
        # Unexpected HTTP or socket calls fail before contacting any service.
        self.addCleanup(patch.stopall)
        http = patch("requests.sessions.Session.request", side_effect=AssertionError("HTTP forbidden in offline tests")).start()
        socket_connect = patch("socket.socket.connect", side_effect=AssertionError("Network forbidden in offline tests")).start()
        self.addCleanup(http.assert_not_called)
        self.addCleanup(socket_connect.assert_not_called)

    def new_miner(self, region="USA"):
        miner = miner_module.AdaptiveAlphaMiner.__new__(miner_module.AdaptiveAlphaMiner)
        miner.selected_region = region
        miner.selected_universe = miner._get_universe_for_region(region)
        miner.bandit = miner_module.MultiArmBandit(exploration_rate=0)
        return miner


class BanditTests(OfflineTest):
    def test_settings_preserve_delay_and_max_trade_variations(self):
        for region, delays, trades in [("USA", {0, 1}, {"OFF"}), ("CHN", {1}, {"ON", "OFF"})]:
            with self.subTest(region=region):
                miner = self.new_miner(region)
                miner._initialize_settings_variations()
                settings = [arm["settings"] for arm in miner.bandit.arms.values()]
                self.assertEqual(len(settings), 56)
                self.assertEqual({s.delay for s in settings}, delays)
                self.assertEqual({s.maxTrade for s in settings}, trades)
                self.assertEqual({s.region for s in settings}, {region})

    def test_reward_updates_are_separate_and_best_arm_uses_average(self):
        bandit = miner_module.MultiArmBandit(exploration_rate=0)
        first = miner_module.SimulationSettings(delay=0)
        second = miner_module.SimulationSettings(delay=1)
        for settings in [first, second]:
            bandit.add_arm(settings)
        bandit.update_reward(first, 3)
        bandit.update_reward(first, 1)
        bandit.update_reward(second, 1)
        self.assertEqual(bandit.get_best_arm(), (first, 2))
        self.assertEqual(bandit.select_arm(), first)
        self.assertEqual(bandit.total_pulls, 3)

    def test_legacy_local_state_is_rekeyed_without_losing_reward(self):
        settings = miner_module.SimulationSettings(delay=1)
        arm = {"settings": settings, "reward_sum": 6, "count": 2, "avg_reward": 3}
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "synthetic.pkl"
            path.write_bytes(pickle.dumps({"old-key-format": arm}))
            bandit = miner_module.MultiArmBandit()
            bandit.load_state(path)
            bandit.update_reward(settings, 3)
            self.assertEqual(bandit.get_best_arm(), (settings, 3))
            self.assertEqual(bandit.total_pulls, 3)


class ExpressionTests(OfflineTest):
    def generate(self, responses, region="USA"):
        miner = self.new_miner(region)
        miner.credentials_path = "unused-synthetic-credential-file"
        miner.ollama_url = "http://unused.invalid"
        miner.genetic_algo = Mock()
        miner._get_data_fields_for_region = Mock(return_value=[{"id": "close", "description": "Synthetic price"}])
        miner._call_ollama = Mock(side_effect=responses)
        fake_generator = Mock()
        fake_generator.get_operators.return_value = [{"name": "ts_rank", "description": "Synthetic operator"}]
        module = SimpleNamespace(AlphaGenerator=Mock(return_value=fake_generator))
        with patch.dict(sys.modules, {"alpha_generator_ollama": module}):
            result = miner.generate_alpha_expressions(count=len(responses))
        return miner, result

    def test_valid_json_expression_is_retained(self):
        miner, result = self.generate(['{"expressions": ["ts_rank(close, 5)"]}'])
        self.assertEqual(result, ["ts_rank(close, 5)"])
        self.assertEqual([call.kwargs["delay"] for call in miner._get_data_fields_for_region.call_args_list], [0, 1])
        miner.genetic_algo.set_data_fields.assert_called_once_with(["close"])

    def test_china_uses_only_delay_one(self):
        miner, result = self.generate(['{"expression": "ts_rank(close, 10)"}'], region="CHN")
        self.assertEqual(result, ["ts_rank(close, 10)"])
        self.assertEqual([call.kwargs["delay"] for call in miner._get_data_fields_for_region.call_args_list], [1])

    def test_markdown_and_thinking_are_removed(self):
        _, result = self.generate(['<think>synthetic reasoning</think>```json\n{"expressions": ["ts_rank(close, 5)"]}\n```'])
        self.assertEqual(result, ["ts_rank(close, 5)"])

    def test_bad_second_response_still_gets_its_own_fallback(self):
        for response in ['{"expressions": ["rank(unrelated)"]}', '{', None, '{"expressions": []}']:
            with self.subTest(response=response):
                _, result = self.generate(['{"expression": "ts_rank(close, 5)"}', response])
                self.assertEqual(len(result), 2)
                self.assertEqual(result[0], "ts_rank(close, 5)")
                self.assertRegex(result[1], r"^ts_rank\(close, \d+\)$")

    def test_repairable_json_preserves_expression(self):
        _, result = self.generate(["{'expressions': ['ts_rank(close, 5)']}"])
        self.assertEqual(result, ["ts_rank(close, 5)"])


class DashboardTests(OfflineTest):
    def test_gpu_unavailable_does_not_hide_cpu_metrics(self):
        with patch.object(dashboard.psutil, "cpu_percent", return_value=25), \
             patch.object(dashboard.psutil, "virtual_memory", return_value=SimpleNamespace(percent=40)), \
             patch.object(dashboard.psutil, "disk_usage", return_value=SimpleNamespace(used=20, total=100)), \
             patch.object(dashboard, "GPUtil", None):
            metrics = dashboard.get_system_metrics()
        self.assertEqual(metrics["cpu_percent"], 25)
        self.assertEqual(metrics["disk_percent"], 20)
        self.assertEqual(metrics["gpu_info"], [])

    def test_ollama_connection_error_returns_offline_and_unknown(self):
        import requests
        with patch("requests.get", side_effect=requests.ConnectionError("synthetic outage")):
            self.assertFalse(dashboard.get_ollama_status())
            self.assertFalse(dashboard.get_ollama_info()["model_loaded"])

    def test_orchestrator_access_error_returns_false(self):
        with patch.object(dashboard.os.path, "exists", side_effect=OSError("synthetic permission failure")):
            self.assertFalse(dashboard.get_orchestrator_status())

    def test_state_reads_use_synthetic_files_and_corruption_is_handled(self):
        original = Path.cwd()
        with tempfile.TemporaryDirectory() as directory:
            try:
                os.chdir(directory)
                self.assertEqual(dashboard.get_mining_stats()["total_cycles"], 0)
                path = Path("orchestrator_state.json")
                path.write_text(json.dumps({"total_cycles": 7, "best_sharpe": 1.2}))
                self.assertEqual(dashboard.get_mining_stats()["total_cycles"], 7)
                self.assertEqual(dashboard.get_mining_stats()["best_sharpe"], 1.2)
                path.write_text("{invalid")
                self.assertEqual(dashboard.get_mining_stats()["total_cycles"], 0)
            finally:
                os.chdir(original)

    def test_status_route_serializes_mocked_status_without_live_services(self):
        with patch.object(dashboard, "get_system_metrics", return_value={"cpu_percent": 12}), \
             patch.object(dashboard, "get_orchestrator_status", return_value=False), \
             patch.object(dashboard, "get_ollama_status", return_value=False), \
             patch.object(dashboard, "get_mining_stats", return_value={"total_cycles": 2}), \
             patch.object(dashboard, "get_ollama_info", return_value={"model_loaded": False}):
            response = dashboard.app.test_client().get("/api/status")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json["system_status"]["ollama_online"])
        self.assertEqual(response.json["mining_stats"]["total_cycles"], 2)


if __name__ == "__main__":
    unittest.main()

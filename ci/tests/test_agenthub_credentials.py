"""Use the real hub ORM with ephemeral SQLite; never connect to a service DB."""
import ast
import asyncio
import logging
from typing import List, Optional
import importlib
import os
from pathlib import Path
import sys
from types import ModuleType
import unittest
from unittest.mock import patch

from sqlalchemy import create_engine, select
from sqlalchemy.orm import declarative_base, Session

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "agent-n8n/agent-hub/src"
package = ModuleType("offline_agenthub")
package.__path__ = [str(SOURCE)]
sys.modules[package.__name__] = package
# Replace only the connection/bootstrap module before loading the real model mappings.
# No production DB URL, engine or credentials are read.
database = ModuleType("offline_agenthub.database")
database.Base = declarative_base()
sys.modules[database.__name__] = database
policy = importlib.import_module("offline_agenthub.credential_policy")
guard = importlib.import_module("offline_agenthub.database_credential_guard")
models = importlib.import_module("offline_agenthub.models")
guard.install_database_credential_guard()


class OperatorAuthenticationTests(unittest.TestCase):
    def test_missing_environment_never_enables_demo_login_or_signing_key(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertFalse(policy.authenticate_operator("admin", "admin123"))
            with self.assertRaises(policy.CredentialConfigurationError):
                policy.signing_key()

    def test_configured_operator_login_and_key_are_environment_only(self):
        settings = {"AGENT_HUB_USERNAME": "synthetic-user", "AGENT_HUB_PASSWORD": "synthetic-password", "JWT_SECRET": "synthetic-jwt-fixture-" * 3}
        with patch.dict(os.environ, settings, clear=True):
            self.assertTrue(policy.authenticate_operator("synthetic-user", "synthetic-password"))
            self.assertFalse(policy.authenticate_operator("admin", "admin123"))
            self.assertFalse(policy.authenticate_operator("synthetic-user", "wrong"))
            self.assertFalse(policy.authenticate_operator(None, None))
            self.assertEqual(policy.signing_key(), settings["JWT_SECRET"])

    def test_empty_or_weak_signing_values_are_rejected_without_echo(self):
        for value in ["", "short", "your-super-secret-jwt-key", "your-super-secret-jwt-key-change-this-in-production"]:
            with patch.dict(os.environ, {"JWT_SECRET": value}, clear=True):
                with self.assertRaises(policy.CredentialConfigurationError) as caught:
                    policy.signing_key()
                if value:
                    self.assertNotIn(value, str(caught.exception))

    def test_login_and_jwt_paths_use_the_policy(self):
        # Check integration wiring without importing FastAPI or initializing the service.
        auth = ast.parse((SOURCE / "auth.py").read_text())
        main = ast.parse((SOURCE / "main.py").read_text())
        functions = {node.name: node for node in auth.body if isinstance(node, ast.FunctionDef)}
        authenticate = ast.Module(body=[functions["authenticate_user"]], type_ignores=[])
        namespace = {"authenticate_operator": policy.authenticate_operator}
        exec(compile(authenticate, "auth-policy-wrapper", "exec"), namespace)
        with patch.dict(os.environ, {}, clear=True):
            self.assertFalse(namespace["authenticate_user"]("admin", "admin123"))
        login = next(node for node in main.body if isinstance(node, ast.AsyncFunctionDef) and node.name == "login")
        self.assertIn("authenticate_user", {node.func.id for node in ast.walk(login) if isinstance(node, ast.Call) and isinstance(node.func, ast.Name)})
        for name in ["create_access_token", "verify_token"]:
            self.assertIn("signing_key", {node.func.id for node in ast.walk(functions[name]) if isinstance(node, ast.Call) and isinstance(node.func, ast.Name)})


class DatabaseCredentialGuardTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", hide_parameters=True)
        database.Base.metadata.create_all(self.engine)
        self.session = Session(self.engine)
        self.addCleanup(self.engine.dispose)
        self.addCleanup(self.session.close)
        self.safe = models.Agent(name="synthetic", agent_type="analysis", capabilities={"window": 5}, agent_metadata={"region": "USA"})
        self.session.add(self.safe)
        self.session.commit()

    def test_business_metadata_is_retained_in_existing_column(self):
        found = self.session.scalar(select(models.Agent))
        self.assertEqual(found.agent_metadata, {"region": "USA"})
        self.assertIn("metadata", models.Agent.__table__.columns.keys())

    def test_nested_credentials_never_commit_and_business_rows_survive(self):
        cases = [
            {"nodes": [{"api_key": "synthetic-private-value"}]},
            {"authorization": "Bearer synthetic-private-value"},
            {"url": "https://user:synthetic-private-value@example.invalid"},
            {"serialized": '{"password": "synthetic-private-value"}'},
        ]
        for value in cases:
            with self.subTest(value_type=list(value)):
                workflow = models.Workflow(name="synthetic", agent_id=self.safe.id, workflow_type="custom", configuration=value)
                self.session.add(workflow)
                with self.assertRaises(ValueError) as caught:
                    self.session.commit()
                self.assertNotIn("synthetic-private-value", str(caught.exception))
                self.session.rollback()
                self.assertEqual(list(self.session.scalars(select(models.Workflow))), [])
                self.assertEqual(self.session.scalar(select(models.Agent)).agent_metadata, {"region": "USA"})

    def test_message_and_event_payloads_are_guarded(self):
        for record in [
            models.Message(sender_id=self.safe.id, recipient_id=self.safe.id, message_type="event", payload={"token": "synthetic-private-value"}),
            models.SystemEvent(event_type="synthetic", agent_id=self.safe.id, payload={"password": "synthetic-private-value"}),
        ]:
            self.session.add(record)
            with self.assertRaises(ValueError):
                self.session.commit()
            self.session.rollback()

    def test_secret_update_rolls_back_without_deleting_business_data(self):
        self.safe.agent_metadata = {"password": "synthetic-private-value"}
        with self.assertRaises(ValueError):
            self.session.commit()
        self.session.rollback()
        self.assertEqual(self.safe.agent_metadata, {"region": "USA"})

    def test_configured_secret_cannot_hide_under_an_unrelated_field(self):
        with patch.dict(os.environ, {"MOONSHOT_API_KEY": "synthetic-private-value"}):
            self.safe.name = "note synthetic-private-value"
            with self.assertRaises(ValueError):
                self.session.commit()
            self.session.rollback()
        self.assertEqual(self.safe.name, "synthetic")

    def test_manager_reads_use_orm_mappings_without_losing_metadata(self):
        # Execute the real read-method bodies against a synchronous in-memory
        # session adapter; no FastAPI bootstrap, HTTP client or external DB.
        tree = ast.parse((SOURCE / "agent_manager.py").read_text())
        manager_class = next(node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == "AgentManager")
        names = {"list_agents", "get_agent", "get_messages", "list_workflows"}
        manager_class.body = [node for node in manager_class.body if isinstance(node, ast.AsyncFunctionDef) and node.name in names]
        namespace = {"AsyncSession": object, "List": List, "Optional": Optional,
                     "Agent": models.Agent, "Message": models.Message, "Workflow": models.Workflow,
                     "select": select, "logger": logging.getLogger("offline-agent-manager")}
        exec(compile(ast.Module(body=[manager_class], type_ignores=[]), "agent-manager-read-methods", "exec"), namespace)
        manager = namespace["AgentManager"]()
        session = self.session

        class Adapter:
            async def execute(self, statement):
                return session.execute(statement)

        message = models.Message(sender_id=self.safe.id, recipient_id=self.safe.id,
                                 message_type="event", payload={"result": 2}, message_metadata={"source": "synthetic"})
        workflow = models.Workflow(name="synthetic", agent_id=self.safe.id,
                                   workflow_type="custom", configuration={"lookback": 5})
        session.add_all([message, workflow])
        session.commit()
        self.assertEqual(asyncio.run(manager.list_agents(Adapter())), [self.safe])
        self.assertIs(asyncio.run(manager.get_agent(self.safe.id, Adapter())), self.safe)
        self.assertIsNone(asyncio.run(manager.get_agent("missing", Adapter())))
        self.assertEqual(asyncio.run(manager.get_messages(self.safe.id, Adapter())), [message])
        self.assertEqual(asyncio.run(manager.list_workflows(Adapter())), [workflow])

    def test_environment_references_are_allowed_without_values(self):
        self.safe.agent_metadata = {"credential_env": "MOONSHOT_API_KEY", "credential_file": "/private/operator.json"}
        self.session.commit()
        self.assertEqual(self.safe.agent_metadata["credential_env"], "MOONSHOT_API_KEY")


if __name__ == "__main__":
    unittest.main()

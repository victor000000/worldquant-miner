# Offline validation

The `Offline Python checks` workflow runs on pushes, pull requests and manual
requests under Python 3.11 and 3.12. It has read-only repository permissions,
SHA-pinned Actions, no project credentials, and no deployment step.

Run locally from the repository root in a disposable virtual environment:

```sh
python3.11 -m venv /tmp/worldquant-ci
/tmp/worldquant-ci/bin/python -m pip install -r ci/requirements.txt
/tmp/worldquant-ci/bin/python -m pip check
/tmp/worldquant-ci/bin/python ci/check_python_syntax.py
/tmp/worldquant-ci/bin/python -m unittest discover -s ci/tests -v
```

Repeat with Python 3.12 to reproduce both matrix entries. Package installation
requires package-index access; the checks themselves do not require network,
credentials, models, GPUs or running application services.

## What passes mean

- The syntax gate compiles every tracked `.py` file, without importing or executing it.
- Focused regression tests cover the adaptive miner's settings variations,
  separate rewards, legacy local-state key migration, generated-expression
  parsing and fallback, and the dashboard's error paths and JSON response.
- Tests construct synthetic miner objects without invoking their authentication
  constructors, mock Brain/Ollama responses, use temporary state files, and
  reject unexpected HTTP/socket calls. They do not run simulations or submit
  alphas. GPU reporting is optional; CPU metrics work without GPUtil installed.
- Test dependencies are an explicit subset of component runtime dependencies;
  installing the full GPU/mining stack is not needed for these checks.

## Scope and exclusions

A green run is not full application or integration acceptance. It does not
validate Brain account entitlements or responses, AI model quality, investment
performance, GPU execution, real credentials, Docker orchestration, the Rust
application, JavaScript applications, or platform service integrations. Existing component scripts named `test_*` are not
blindly collected: some access live services or start applications. They need a
separately configured, deliberately authorized integration environment.

There is no configured continuous-deployment target. Existing Docker and
startup files are operational entry points, not evidence of a deployed service;
this workflow does not build or run them. No live submission or service restart
is part of CI.

Legacy bandit pickle files are trusted local state only. Loading untrusted
pickles remains unsafe; these tests generate their own fixtures.

## Agent-hub operator credential policy

Operator login, JWT signing and database connection credentials come only from
explicit environment variables. The hub no longer accepts the hardcoded demo
login or JWT/database defaults. Supply `AGENT_HUB_USERNAME`,
`AGENT_HUB_PASSWORD`, `JWT_SECRET` (at least 32 characters), and `DATABASE_URL`;
Compose reads `AGENT_DATABASE_URL` for the latter. Keep any environment files
private and Git-ignored. Compose also requires explicit database, n8n basic-auth
and Grafana passwords instead of shipped defaults. No new credential values
are generated, migrated or rotated by these changes.

The hub rejects known credential fields, token/userinfo-URL patterns, nested
serialized JSON credentials, and configured operator-secret values on ORM
inserts/updates before SQL is issued. Store only nonsecret environment/file
references in workflow configuration. Rejected writes leave prior business rows
intact; SQL parameter logging is disabled. This guard is not a general detector
of unknown secrets hidden in arbitrary encodings, nor a restriction on direct
SQL executed outside this application.

Regression tests use the hub's real SQLAlchemy model mappings with disposable
in-memory SQLite, never an existing DB. They cover insert/update rejection,
rollback preservation, metadata mapping/read paths, environment-only login and
missing/weak signing-key behavior. Full hub startup and PostgreSQL integration
remain unverified. Existing deployed databases, if any, require a separate
read-only inventory and private backup before credential removal; this source
change is not a completed runtime data migration.

The unused bundled Dify API/UI have been removed from the source tree, along
with their obsolete root tutorial. The remaining n8n platform still has its own
generic authentication and provider-credential persistence; the hub guard does
not govern n8n's internal database. No claim is made that all credential-capable
storage in that third-party platform is removed.

The supplied n8n custom node defines no credential objects and no exported n8n
workflows/credential imports are shipped. Compose disables execution-payload
saving; the project policy keeps reusable provider secrets in the agent-service
environment/private files. See [n8n storage boundary](../agent-n8n/README.md#n8n-storage-boundary)
for remaining platform persistence and deployment limitations.

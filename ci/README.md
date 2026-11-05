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

- The syntax gate compiles every tracked `.py` file, including vendored Dify
  Python code, without importing or executing it.
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
application, JavaScript applications, or vendored Dify UI/API dependency stacks
and service integrations. Existing component scripts named `test_*` are not
blindly collected: some access live services or start applications. They need a
separately configured, deliberately authorized integration environment.

There is no configured continuous-deployment target. Existing Docker and
startup files are operational entry points, not evidence of a deployed service;
this workflow does not build or run them. No live submission or service restart
is part of CI.

Legacy bandit pickle files are trusted local state only. Loading untrusted
pickles remains unsafe; these tests generate their own fixtures.

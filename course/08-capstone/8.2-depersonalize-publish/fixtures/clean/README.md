# Sample harness (CLEAN fixture)

This is the depersonalized version of the `dirty/` sample: no hardcoded key, the
provider-neutral `LLM_API_KEY` env var, and a runtime-resolved home path. Running
the check against this directory must PASS (exit 0).

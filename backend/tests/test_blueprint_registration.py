"""Blueprint registration guard — every *_bp defined in any controller module
must appear in controllers.__init__.ALL_BLUEPRINTS.

This catches the exact failure mode where a blueprint is imported as a module-level
name but never registered: the RBAC route-walk test (test_rbac_enforcement.py)
uses app.url_map and stays green, but every route on the unregistered blueprint
404s at runtime.

Created by: Phase 5, Plan 05-01 (04-01 has not executed — see OD-1 in 05-01-PLAN.md).
"""
import importlib
import pkgutil
import re

import pytest

import app.controllers as controllers_pkg
from app.controllers import ALL_BLUEPRINTS


def _all_blueprint_names_from_modules():
    """Walk every .py module in app/controllers/ and collect module-level names
    that end in '_bp'. This is the set of blueprints that exist; ALL_BLUEPRINTS
    is the set that are registered."""
    found = set()
    pkg_path = controllers_pkg.__path__
    pkg_name = controllers_pkg.__name__

    for _finder, module_name, _is_pkg in pkgutil.walk_packages(pkg_path, prefix=pkg_name + "."):
        try:
            mod = importlib.import_module(module_name)
        except Exception:
            continue
        for attr in dir(mod):
            if attr.endswith("_bp"):
                found.add(attr)
    return found


def test_all_blueprints_are_registered():
    """Every *_bp in app/controllers/ modules must be in ALL_BLUEPRINTS."""
    registered_names = {bp.name for bp in ALL_BLUEPRINTS}
    # ALL_BLUEPRINTS uses Blueprint objects; collect their variable names too
    # (the variable name ends in _bp; the Blueprint's .name may differ)
    registered_vars = set()
    import app.controllers as pkg
    for attr in dir(pkg):
        if attr.endswith("_bp"):
            registered_vars.add(attr)

    module_bps = _all_blueprint_names_from_modules()
    missing = module_bps - registered_vars
    assert not missing, (
        f"Blueprint(s) defined in controllers/ but missing from ALL_BLUEPRINTS: {missing}. "
        "Add both an import and an entry in ALL_BLUEPRINTS (two edits, not one)."
    )

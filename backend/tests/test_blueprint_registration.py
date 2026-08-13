"""Every Blueprint under app/controllers/ is actually routed.

Registering a blueprint takes two edits in app/controllers/__init__.py — an
import and an ALL_BLUEPRINTS entry — and Phase 2 shipped an endpoint that made
only the first. The result 404s for everyone, silently, and no other test in
this suite notices: the module imports cleanly, the view function is perfectly
correct, and nothing ever calls it. An authorization control on an unrouted
endpoint is a control that does not exist (T-04-06).

This phase adds two controller files, so the check is written structurally
rather than as a list somebody has to remember to extend. It discovers
blueprints by walking the package, which is why no controller is named here.
"""
import importlib
import pkgutil
from pathlib import Path

from flask import Blueprint

import app.controllers as controllers_package
from app.controllers import ALL_BLUEPRINTS

CONTROLLERS_DIR = Path(controllers_package.__file__).parent


def _declared_blueprints():
    """Every Blueprint constructed at module level under app/controllers/.

    `import_name` is the `__name__` each controller passes to its Blueprint, so
    comparing it to the module identifies the module that DEFINES a blueprint
    rather than one that merely imports it — which keeps the failure message
    pointing at the file the author has to edit.
    """
    for module_info in pkgutil.iter_modules([str(CONTROLLERS_DIR)]):
        module = importlib.import_module(
            f"{controllers_package.__name__}.{module_info.name}"
        )
        for attr_name, value in vars(module).items():
            if isinstance(value, Blueprint) and value.import_name == module.__name__:
                yield value, attr_name, module_info.name


def test_every_controller_blueprint_is_registered():
    """The half that Phase 2 forgot.

    Compared by Blueprint.name rather than object identity: a module re-imported
    under a second name would otherwise produce a failure with nothing wrong
    behind it.
    """
    registered = {bp.name for bp in ALL_BLUEPRINTS}

    missing = sorted(
        f"{attr} (Blueprint {bp.name!r}) defined in app/controllers/{module}.py"
        for bp, attr, module in _declared_blueprints()
        if bp.name not in registered
    )

    assert not missing, (
        "These Blueprints are defined but never registered, so every route on "
        f"them 404s: {missing}. Registering one takes BOTH halves in "
        "app/controllers/__init__.py — the `from .x_controller import x_bp` "
        "line AND the ALL_BLUEPRINTS entry."
    )


def test_all_blueprints_are_mounted_on_the_app(app):
    """The mirror image: a declaration nobody consumes.

    ALL_BLUEPRINTS is only a list until create_app registers it, so an entry
    that never reaches app.blueprints is list rot rather than a route.
    """
    declared = {bp.name for bp in ALL_BLUEPRINTS}

    unmounted = sorted(declared - set(app.blueprints))

    assert not unmounted, (
        f"These ALL_BLUEPRINTS entries are not registered on the app: "
        f"{unmounted}. Check that create_app iterates ALL_BLUEPRINTS."
    )

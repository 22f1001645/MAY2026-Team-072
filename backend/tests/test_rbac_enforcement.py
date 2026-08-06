"""The RBAC-02 route-guard gate.

RBAC-02 says every Activity- and Org-scoped endpoint is guarded by the
resource-scoped predicates rather than the coarse `organiser_required`. Almost
all of those endpoints do not exist yet — Phases 3 through 8 add them, in other
sessions, months from now. A promise like that kept only in prose decays, so it
is kept here instead: these tests walk the live `app.url_map` on every suite run
and fail the build the moment a scoped route is guarded wrongly, or not at all.

The coarse guard cannot tell one event from another. Any POR holder anywhere
satisfies it, so a scoped route behind it hands every organiser in the country
authority over every event in it.
"""
import pytest

# Every activity-scoped route that already used the coarse guard before Phase 1,
# frozen verbatim. Retrofitting these is a behaviour change with no requirement
# behind it in Phase 1; RBAC-02 governs endpoints added from this point onward.
#
# THIS LIST NEVER GROWS. If test_no_new_scoped_route_uses_the_coarse_guard fails
# for your route, the fix is to switch that route to can_manage_activity_required,
# can_participate_in_activity_required, meetup_head_required or
# can_manage_org_required — never to add a line here. Adding a line reopens
# exactly the hole this file exists to keep shut.
LEGACY_COARSE_ROUTES = frozenset({
    ("GET", "/api/v1/events/<activity_id>/expenses"),
    ("POST", "/api/v1/activities/<activity_id>/report"),
    ("GET", "/api/v1/events/<activity_id>/registrations"),
    ("POST", "/api/v1/events/<activity_id>/attendance"),
    ("POST", "/api/v1/events/<activity_id>/broadcast"),
    ("POST", "/api/v1/events/<activity_id>/volunteer"),
})

COARSE_GUARD = "organiser_required"
SCOPED_PARAMS = ("<activity_id>", "<org_id>")
_IGNORED_METHODS = {"HEAD", "OPTIONS"}


def _scoped_rules(app):
    for rule in app.url_map.iter_rules():
        if any(param in rule.rule for param in SCOPED_PARAMS):
            yield rule


def _guards_of(app, rule):
    view = app.view_functions[rule.endpoint]
    return tuple(getattr(view, "_rbac_guards", ()))


def _methods_of(rule):
    return sorted((rule.methods or set()) - _IGNORED_METHODS)


def test_no_new_scoped_route_uses_the_coarse_guard(app):
    violations = []
    for rule in _scoped_rules(app):
        if COARSE_GUARD not in _guards_of(app, rule):
            continue
        for method in _methods_of(rule):
            if (method, rule.rule) not in LEGACY_COARSE_ROUTES:
                violations.append((method, rule.rule))

    assert not violations, (
        f"These Activity/Org-scoped routes are guarded by the coarse "
        f"{COARSE_GUARD}, which cannot tell one resource from another: "
        f"{sorted(violations)}. Replace the decorator with the matching scoped "
        f"guard (can_manage_activity_required, can_participate_in_activity_required, "
        f"meetup_head_required or can_manage_org_required). Do not add the route "
        f"to LEGACY_COARSE_ROUTES."
    )


def test_legacy_allowlist_has_no_dead_entries(app):
    """A stale exemption is worse than no exemption.

    If a legacy route were renamed or removed while its allowlist entry stayed,
    that entry would sit waiting to silently exempt a brand-new endpoint that
    later claimed the same path and method."""
    live = set()
    for rule in _scoped_rules(app):
        for method in _methods_of(rule):
            live.add((method, rule.rule))

    dead = sorted(LEGACY_COARSE_ROUTES - live)
    assert not dead, (
        f"These LEGACY_COARSE_ROUTES entries no longer match a live route: {dead}. "
        f"Delete them — an allowlist entry with nothing behind it is a trap."
    )


def test_every_scoped_route_carries_at_least_one_guard(app):
    """The genuinely dangerous case: a scoped route with no authorization at all.

    The coarse-guard test above would pass such a route in silence, because a
    route with no decorators trivially does not carry the coarse one."""
    unguarded = sorted(
        rule.rule for rule in _scoped_rules(app) if not _guards_of(app, rule)
    )
    assert not unguarded, (
        f"These routes name a resource id in the URL but carry no authorization "
        f"guard: {unguarded}. Any authenticated user can reach them for any id."
    )

import pytest
from app.services import org_service
from app.models import Organisation, User, Membership, PORAssignment


def _row(email, org_type, org_name, position, region="", term="May 2026"):
    return {
        "Email": email,
        "Organisation Type": org_type,
        "Organisation Name": org_name,
        "Position": position,
        "Region": region,
        "Term": term,
    }


def test_preview_valid_row_makes_no_db_changes(app):
    admin = User.query.filter_by(role="admin").first()
    crew = User.query.filter_by(email="crew@ekatva.os").first()
    house = Organisation.query.filter_by(name="Nilgiri House").first()

    row = _row(crew.email, "house", house.name, "House Secretary")
    result = org_service.bulk_assign_pors([row], admin, preview=True)

    assert result[0]["status"] == "valid"
    assert result[0]["errors"] == []
    assert Membership.query.filter_by(user_id=crew.id, org_id=house.id).first() is None


def test_execute_valid_row_creates_membership_and_por(app):
    admin = User.query.filter_by(role="admin").first()
    crew = User.query.filter_by(email="crew@ekatva.os").first()
    house = Organisation.query.filter_by(name="Nilgiri House").first()

    row = _row(crew.email, "house", house.name, "House Secretary")
    result = org_service.bulk_assign_pors([row], admin, preview=False)

    assert result[0]["status"] == "valid"
    mem = Membership.query.filter_by(user_id=crew.id, org_id=house.id).first()
    assert mem is not None
    por = PORAssignment.query.filter_by(membership_id=mem.id, active=True).first()
    assert por.por_type == "House Secretary"
    assert por.council_tier == "upper_house_council"


def test_execute_deactivates_old_por_for_same_user(app):
    admin = User.query.filter_by(role="admin").first()
    secretary = User.query.filter_by(email="secretary@ekatva.os").first()
    kanha = Organisation.query.filter_by(name="Kanha House").first()

    old_mem = Membership.query.filter_by(user_id=secretary.id, org_id=kanha.id).first()
    old_por = PORAssignment.query.filter_by(membership_id=old_mem.id, active=True).first()
    assert old_por.por_type == "House Secretary"

    row = _row(secretary.email, "house", kanha.name, "Deputy House Secretary")
    org_service.bulk_assign_pors([row], admin, preview=False)

    assert old_por.active is False
    new_por = PORAssignment.query.filter_by(membership_id=old_mem.id, active=True).first()
    assert new_por.por_type == "Deputy House Secretary"


def test_unknown_user_reported_as_error(app):
    admin = User.query.filter_by(role="admin").first()
    house = Organisation.query.filter_by(name="Nilgiri House").first()

    row = _row("ghost@ekatva.os", "house", house.name, "House Secretary")
    result = org_service.bulk_assign_pors([row], admin, preview=True)

    assert result[0]["status"] == "error"
    assert "not found" in result[0]["errors"][0]


def test_wrong_org_type_for_position_rejected(app):
    admin = User.query.filter_by(role="admin").first()
    crew = User.query.filter_by(email="crew@ekatva.os").first()
    society = Organisation.query.filter_by(name="Shutterbugs Society").first()

    row = _row(crew.email, "society", society.name, "House Secretary")
    result = org_service.bulk_assign_pors([row], admin, preview=True)

    assert result[0]["status"] == "error"
    assert any("can only be assigned to a house" in e for e in result[0]["errors"])


def test_single_seat_collision_leaves_no_orphan_membership(app):
    """Regression test for the pre-fix ordering bug: a Membership row was
    created before the collision check ran, so a rejected row still left a
    dangling Membership behind once the batch committed."""
    admin = User.query.filter_by(role="admin").first()
    head = User.query.filter_by(email="head@ekatva.os").first()
    society = Organisation.query.filter_by(name="Shutterbugs Society").first()

    # `deputy` already holds an active "Society Deputy Secretary" POR here (seed data).
    row = _row(head.email, "society", society.name, "Society Deputy Secretary")
    result = org_service.bulk_assign_pors([row], admin, preview=False)

    assert result[0]["status"] == "error"
    assert "Slot already filled" in result[0]["errors"][0]
    assert Membership.query.filter_by(user_id=head.id, org_id=society.id).first() is None


def test_regional_coordinator_success_and_collision(app):
    admin = User.query.filter_by(role="admin").first()
    crew = User.query.filter_by(email="crew@ekatva.os").first()
    head = User.query.filter_by(email="head@ekatva.os").first()
    house = Organisation.query.filter_by(name="Nilgiri House").first()
    region = Organisation.query.filter_by(type="region").first()

    row1 = _row(crew.email, "house", house.name, "Regional Coordinator", region=region.name)
    result1 = org_service.bulk_assign_pors([row1], admin, preview=False)

    assert result1[0]["status"] == "valid"
    mem1 = Membership.query.filter_by(user_id=crew.id, org_id=house.id).first()
    por1 = PORAssignment.query.filter_by(membership_id=mem1.id, active=True).first()
    assert por1.por_type == "Regional Coordinator"
    assert por1.region_id == region.id
    assert por1.council_tier == "lower_house_council"

    row2 = _row(head.email, "house", house.name, "Regional Coordinator", region=region.name)
    result2 = org_service.bulk_assign_pors([row2], admin, preview=False)

    assert result2[0]["status"] == "error"
    assert "Region slot already filled" in result2[0]["errors"][0]
    assert Membership.query.filter_by(user_id=head.id, org_id=house.id).first() is None


def test_regional_coordinator_missing_region_column(app):
    admin = User.query.filter_by(role="admin").first()
    crew = User.query.filter_by(email="crew@ekatva.os").first()
    house = Organisation.query.filter_by(name="Nilgiri House").first()

    row = _row(crew.email, "house", house.name, "Regional Coordinator")
    result = org_service.bulk_assign_pors([row], admin, preview=True)

    assert result[0]["status"] == "error"
    assert "Region column is required" in result[0]["errors"][0]


def test_bulk_endpoints_require_admin(client, student_headers):
    res = client.post("/api/v1/orgs/pors/bulk-preview", json=[], headers=student_headers)
    assert res.status_code == 403


def test_bulk_preview_endpoint(client, admin_headers):
    res = client.post(
        "/api/v1/orgs/pors/bulk-preview",
        json=[_row("crew@ekatva.os", "house", "Nilgiri House", "House Secretary")],
        headers=admin_headers,
    )
    assert res.status_code == 200
    body = res.get_json()
    assert body[0]["status"] == "valid"

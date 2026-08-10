from ..models import SystemConfig
from ..extensions import db
from ..constants import POINTS


def get_points():
    """Returns the current points configuration, falling back to constants.POINTS."""
    row = SystemConfig.query.filter_by(key="points").first()
    if row:
        return row.value
    return dict(POINTS)


def update_points(payload):
    """Updates point values. Each value must be a positive integer <= 500."""
    from ..errors import ApiError
    valid_keys = {"attended", "organised", "volunteered"}
    for k, v in payload.items():
        if k not in valid_keys:
            raise ApiError(f"Unknown point type: {k}", "invalid_point_type", 400)
        if not isinstance(v, int) or v < 1 or v > 500:
            raise ApiError(f"Point value for '{k}' must be an integer between 1 and 500", "invalid_point_value", 400)

    row = SystemConfig.query.filter_by(key="points").first()
    current = dict(POINTS)
    if row:
        current = row.value
        current.update(payload)
        row.value = current
        db.session.flag_modified(row, "value")
    else:
        current.update(payload)
        row = SystemConfig(key="points", value=current)
        db.session.add(row)
    db.session.commit()
    return current


def set_flag(key, value):
    """Sets a boolean flag in system config."""
    row = SystemConfig.query.filter_by(key=key).first()
    if row:
        row.value = value
        db.session.flag_modified(row, "value")
    else:
        row = SystemConfig(key=key, value=value)
        db.session.add(row)
    db.session.commit()


def get_flag(key, default=False):
    """Gets a flag from system config."""
    row = SystemConfig.query.filter_by(key=key).first()
    return row.value if row else default


def get_constants():
    """Returns standard system constants."""
    from ..constants import ORGANISER_PORS, REGIONS
    
    row = SystemConfig.query.filter_by(key="house_metadata").first()
    house_meta = row.value if row else {}
    
    return {
        "POR_TYPES": list(ORGANISER_PORS),
        "REGIONS": list(REGIONS),
        "HOUSE_META": house_meta
    }

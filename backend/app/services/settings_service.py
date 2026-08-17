from ..constants import POINTS
from ..extensions import db
from ..models import SystemSetting


def get_recognition_points() -> dict:
    setting = SystemSetting.query.filter_by(key="recognition_points").first()
    if setting and setting.value_json:
        return setting.value_json
    return POINTS


def update_recognition_points(data: dict) -> dict:
    setting = SystemSetting.query.filter_by(key="recognition_points").first()
    if not setting:
        setting = SystemSetting(key="recognition_points", value_json=data)
        db.session.add(setting)
    else:
        setting.value_json = data
    db.session.commit()
    return setting.value_json

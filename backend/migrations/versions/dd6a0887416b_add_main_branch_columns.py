"""add notifications.action_url and the organisation profile columns

Revision ID: dd6a0887416b
Revises: b1390b21ff7e
Create Date: 2026-08-22 21:29:30.843097

Authored on the studentdashboard branch against f53685e71b8e. Merging that
branch into main put it alongside b1390b21ff7e, which revises f53685e71b8e too,
so the graph had two heads. Repointing down_revision here linearises it — the
revision was never applied anywhere outside dev, and a second merge revision
that did nothing would have been the more expensive way to say the same thing.

`organisations.category`, `.tagline` and `.banner_url` are declared here rather
than patched into the SQLite file at boot, which is what the branch did. A
startup ALTER inside `except Exception: pass` is invisible when it fails and
says nothing at all about Postgres.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'dd6a0887416b'
down_revision = 'b1390b21ff7e'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('notifications', schema=None) as batch_op:
        batch_op.add_column(sa.Column('action_url', sa.String(length=500), nullable=True))

    with op.batch_alter_table('organisations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('category', sa.String(length=80), nullable=True))
        batch_op.add_column(sa.Column('tagline', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('banner_url', sa.String(length=300), nullable=True))


def downgrade():
    with op.batch_alter_table('organisations', schema=None) as batch_op:
        batch_op.drop_column('banner_url')
        batch_op.drop_column('tagline')
        batch_op.drop_column('category')

    with op.batch_alter_table('notifications', schema=None) as batch_op:
        batch_op.drop_column('action_url')

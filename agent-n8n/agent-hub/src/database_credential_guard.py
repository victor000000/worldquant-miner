"""Apply the operator-credential policy before ORM writes reach the database."""
from sqlalchemy import event, inspect
from sqlalchemy.orm import Session
from .credential_policy import reject_database_credentials


def reject_secret_changes(session, flush_context, instances):
    for record in session.new.union(session.dirty):
        state = inspect(record)
        for attribute in state.mapper.column_attrs:
            if record in session.new or state.attrs[attribute.key].history.has_changes():
                reject_database_credentials(getattr(record, attribute.key))


def install_database_credential_guard():
    if not event.contains(Session, "before_flush", reject_secret_changes):
        event.listen(Session, "before_flush", reject_secret_changes)

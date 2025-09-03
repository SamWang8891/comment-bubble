import os
import sqlite3

dbfile = os.path.join(os.path.dirname(__file__), "data.db")


def create_record(comment_text: str) -> bool:
    """
    Create a new comment record in the database
    :param comment_text: The comment text to store
    :return: True if created successfully
    """

    with sqlite3.connect(dbfile) as con:
        cur = con.cursor()
        cur.execute("INSERT INTO comments (text) VALUES (?)", (comment_text,))
        con.commit()
        return True


def purge_all_records():
    """
    Purge all records in the database
    """
    with sqlite3.connect(dbfile) as con:
        cur = con.cursor()
        cur.execute("DELETE FROM comments")
        con.commit()


def get_all_records() -> list[str]:
    """
    Get all records from the database
    :return: A list of all comments
    """
    with sqlite3.connect(dbfile) as con:
        cur = con.cursor()
        cur.execute("SELECT text FROM comments ORDER BY id DESC")
        records = cur.fetchall()

        return [record[0] for record in records]

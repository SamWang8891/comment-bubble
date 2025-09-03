import re
from sqlite3 import Cursor
from typing import Callable


def make_comments(commit: Callable, cur: Cursor):
    """
    Create the table to store the comments.
    :param commit: Callable to commit the transaction
    :param cur: Cursor of the database
    """
    cur.execute('DROP TABLE IF EXISTS comments')
    cur.execute('''
    CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL
    )
    ''')

    commit()


def make_login(commit: Callable, cur: Cursor):
    """
    Create the table to store the login credentials.
    :param commit: Callable to commit the transaction
    :param cur: Cursor of the database
    """
    cur.execute('DROP TABLE IF EXISTS login')
    cur.execute('''
    CREATE TABLE IF NOT EXISTS login (
        username TEXT PRIMARY KEY,
        password TEXT
    )
    ''')
    commit()

    # default username: admin, password: password
    username = "admin"
    password = "$argon2id$v=19$m=102400,t=2,p=8$l7bMrtz82jfIJk5Uq82mGQ$1ABNbzjrDJ6WPNnhGi5UpQ"
    cur.execute("INSERT INTO login (username, password) VALUES (?, ?)", (username, password))
    commit()


def sort_dict(text_file: str):
    """
    Sort the words in a text file alphabetically.
    :param text_file: The path to the text file containing the dictionary
    """
    # Read the contents of the file
    with open(text_file, 'r') as file:
        words = file.readlines()

    # Sort the words alphabetically
    sorted_words = sorted(word.strip() for word in words)

    # Write the sorted words back to the file
    with open(text_file, 'w') as file:
        for word in sorted_words:
            file.write(word + '\n')


def del_forbidden_word(textfile: str):
    """
    Cleans a text file by performing the following:
    - Removes lines that are either empty or match any forbidden words.
    - Removes lines containing characters other than alphanumeric (letters and numbers).
    - Removes duplicate lines (lines are deduplicated when saved back).

    Only overwrites the original file if at least one line is deemed illegal.

    :param textfile: The path to the text file to be cleaned.
    :return: None
    """

    forbidden: set[str] = {'login', 'admin', 'logout', 'api', 'index', 'index.html', 'change_pass', ''}
    legal: bool = True

    words = set()
    with open(textfile, 'r') as file:
        for line in file:
            line = line.strip()
            if (line in forbidden) or (re.match(r"^[A-Za-z0-9]*$", line) is None):
                legal = False
                continue

            words.add(line)

    if not legal:
        with open(textfile, 'w') as file:
            file.write('\n'.join(words))

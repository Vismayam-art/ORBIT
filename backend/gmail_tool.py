from typing import List, Dict


# Temporary Gmail data for ORBIT development.
# This will later be replaced by the real Gmail API connector.

MOCK_EMAILS = [
    {
        "id": "email_001",
        "sender": "team@orbitdemo.com",
        "subject": "Product Meeting - Tomorrow at 10 AM",
        "date": "2026-10-03",
        "body": (
            "Product meeting scheduled for tomorrow at 10 AM. "
            "Agenda: project progress, technical architecture, "
            "next milestones and open issues."
        ),
    },
    {
        "id": "email_002",
        "sender": "mentor@orbitdemo.com",
        "subject": "Meeting Preparation Notes",
        "date": "2026-10-02",
        "body": (
            "Please review the latest project status and prepare "
            "questions regarding the technical architecture."
        ),
    },
    {
        "id": "email_003",
        "sender": "team@orbitdemo.com",
        "subject": "Project Architecture Document",
        "date": "2026-10-01",
        "body": (
            "The latest architecture includes the agent core, "
            "tool router, executor, monitoring and verification layers."
        ),
    },
]


def search_emails(query: str) -> List[Dict]:
    """
    Search emails using a simple keyword match.

    This is a development connector.
    It will later be replaced with the real Gmail API.
    """

    query = query.lower().strip()

    if not query:
        return MOCK_EMAILS

    results = []

    for email in MOCK_EMAILS:
        searchable_text = (
            email["sender"]
            + " "
            + email["subject"]
            + " "
            + email["body"]
        ).lower()

        if query in searchable_text:
            results.append(email)

    return results


def get_email(email_id: str) -> Dict | None:
    """
    Retrieve one email by ID.
    """

    for email in MOCK_EMAILS:
        if email["id"] == email_id:
            return email

    return None
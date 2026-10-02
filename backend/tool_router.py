from gmail_tool import MOCK_EMAILS


# =========================================================
# ORBIT CONTROLLED MOCK DATA
# =========================================================

MOCK_CALENDAR_EVENTS = [
    {
        "id": "calendar_001",
        "title": "Product Meeting",
        "date": "2026-10-03",
        "time": "10:00 AM",
        "location": "Engineering Meeting Room",
        "description": (
            "Product meeting covering project progress, "
            "technical architecture, next milestones "
            "and open issues."
        ),
    },
    {
        "id": "calendar_002",
        "title": "Project Review",
        "date": "2026-10-02",
        "time": "3:00 PM",
        "location": "Online",
        "description": (
            "Weekly project review and progress discussion."
        ),
    },
]


MOCK_DRIVE_FILES = [
    {
        "id": "drive_001",
        "name": "Product Meeting Notes",
        "date": "2026-10-03",
        "content": (
            "Latest product meeting notes: project progress, "
            "technical architecture, next milestones "
            "and open issues."
        ),
    },
    {
        "id": "drive_002",
        "name": "Project Architecture Document",
        "date": "2026-10-01",
        "content": (
            "The latest architecture includes the agent core, "
            "tool router, executor, monitoring and "
            "verification layers."
        ),
    },
    {
        "id": "drive_003",
        "name": "Project Status Update",
        "date": "2026-10-02",
        "content": (
            "Current project status includes completed "
            "integration work and remaining testing activities."
        ),
    },
]


# =========================================================
# HELPERS
# =========================================================

def normalize_query(query):
    return str(query or "").strip().lower()


def search_mock_records(records, query):
    """
    Search controlled mock records using the query.
    """

    query = normalize_query(query)

    if not query:
        return records

    words = [
        word
        for word in query.replace(",", " ").split()
        if len(word) > 2
    ]

    results = []

    for record in records:

        searchable_text = " ".join(
            str(value)
            for value in record.values()
        ).lower()

        if all(
            word in searchable_text
            for word in words
        ):
            results.append(record)

    # If there is no exact match, return records
    # containing at least one relevant search word.
    if not results:

        for record in records:

            searchable_text = " ".join(
                str(value)
                for value in record.values()
            ).lower()

            if any(
                word in searchable_text
                for word in words
            ):
                results.append(record)

    return results


# =========================================================
# GMAIL
# =========================================================

def execute_gmail(action, parameters):

    query = parameters.get(
        "query",
        "",
    )

    if action == "search":

        results = search_mock_records(
            MOCK_EMAILS,
            query,
        )

        return {
            "status": "success",
            "results": results,
        }

    if action == "get":

        email_id = parameters.get(
            "email_id",
        )

        for email in MOCK_EMAILS:

            if email.get("id") == email_id:

                return {
                    "status": "success",
                    "results": [email],
                }

        return {
            "status": "error",
            "results": [],
            "message": (
                f"Email '{email_id}' was not found."
            ),
        }

    return {
        "status": "error",
        "results": [],
        "message": (
            f"Gmail action '{action}' "
            "is not implemented."
        ),
    }


# =========================================================
# CALENDAR
# =========================================================

def execute_calendar(action, parameters):

    query = parameters.get(
        "query",
        "",
    )

    if action in {
        "search",
        "get",
        "list",
    }:

        results = search_mock_records(
            MOCK_CALENDAR_EVENTS,
            query,
        )

        # For a broad meeting search, return
        # the latest product meeting.
        if not results:

            results = [
                MOCK_CALENDAR_EVENTS[0]
            ]

        return {
            "status": "success",
            "results": results,
        }

    return {
        "status": "error",
        "results": [],
        "message": (
            f"Calendar action '{action}' "
            "is not implemented."
        ),
    }


# =========================================================
# DRIVE
# =========================================================

def execute_drive(action, parameters):

    query = parameters.get(
        "query",
        "",
    )

    if action in {
        "search",
        "get",
        "list",
    }:

        results = search_mock_records(
            MOCK_DRIVE_FILES,
            query,
        )

        # For a broad search, return the available
        # project documents.
        if not results:

            results = [
                MOCK_DRIVE_FILES[0],
                MOCK_DRIVE_FILES[1],
                MOCK_DRIVE_FILES[2],
            ]

        return {
            "status": "success",
            "results": results,
        }

    return {
        "status": "error",
        "results": [],
        "message": (
            f"Drive action '{action}' "
            "is not implemented."
        ),
    }


# =========================================================
# ORBIT INTERNAL TOOL
# =========================================================

def execute_orbit(action, parameters):

    query = parameters.get(
        "query",
        "",
    )

    if action in {
        "draft",
        "compose",
        "generate",
    }:

        draft = {
            "id": "orbit_draft_001",
            "type": "email_draft",
            "subject": "Latest Project Meeting Update",
            "body": (
                "Hi Team,\n\n"
                "Here is the latest project meeting update. "
                "The discussion covered project progress, "
                "technical architecture, upcoming milestones "
                "and open issues.\n\n"
                "Regards,\n"
                "Project Team"
            ),
            "context": query,
        }

        return {
            "status": "success",
            "results": [draft],
        }

    return {
        "status": "error",
        "results": [],
        "message": (
            f"ORBIT action '{action}' "
            "is not implemented."
        ),
    }


# =========================================================
# MAIN TOOL ROUTER
# =========================================================

def execute_tool(
    tool,
    action,
    parameters=None,
):

    parameters = parameters or {}

    tool_name = str(
        tool or ""
    ).strip().lower()

    action_name = str(
        action or "search"
    ).strip().lower()


    # -----------------------------------------------------
    # GMAIL
    # -----------------------------------------------------

    if (
        "gmail" in tool_name
        or "email" in tool_name
    ):

        return execute_gmail(
            action_name,
            parameters,
        )


    # -----------------------------------------------------
    # CALENDAR
    # -----------------------------------------------------

    if "calendar" in tool_name:

        return execute_calendar(
            action_name,
            parameters,
        )


    # -----------------------------------------------------
    # DRIVE
    # -----------------------------------------------------

    if "drive" in tool_name:

        return execute_drive(
            action_name,
            parameters,
        )


    # -----------------------------------------------------
    # ORBIT INTERNAL TOOL
    # -----------------------------------------------------

    if (
        tool_name == "orbit"
        or "orbit" in tool_name
    ):

        return execute_orbit(
            action_name,
            parameters,
        )


    # -----------------------------------------------------
    # UNKNOWN TOOL
    # -----------------------------------------------------

    return {
        "status": "error",
        "results": [],
        "message": (
            f"Tool '{tool}' is not available "
            "in the current ORBIT MVP."
        ),
    }
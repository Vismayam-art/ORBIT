from tool_router import execute_tool
from risk_engine import assess_risk


# =========================================================
# ACTION SELECTION
# =========================================================

def get_task_action(task: dict) -> str:
    """
    Decide which action should be sent to the tool router.
    """

    tool = str(
        task.get("tool", "")
    ).lower()

    title = str(
        task.get("title", "")
    ).lower()

    description = str(
        task.get("description", "")
    ).lower()

    task_text = f"{title} {description}"


    # Gmail

    if "gmail" in tool or "email" in tool:

        if any(
            keyword in task_text
            for keyword in [
                "send email",
                "send an email",
                "send message",
                "send mail",
                "reply to",
                "reply email",
            ]
        ):
            return "send"

        return "search"


    # Calendar

    if "calendar" in tool:
        return "search"


    # Drive

    if "drive" in tool:
        return "search"


    # ORBIT internal tool

    if tool == "orbit" or "orbit" in tool:

        return "draft"


    return "search"


# =========================================================
# QUERY BUILDER
# =========================================================

def build_tool_query(task: dict) -> str:
    """
    Build a simple search query from the task.
    """

    title = str(
        task.get("title", "")
    ).strip()

    description = str(
        task.get("description", "")
    ).strip()

    if title and description:
        return f"{title}. {description}"

    return title or description


# =========================================================
# MAIN TASK EXECUTOR
# =========================================================

def execute_task(
    task: dict,
    approved: bool = False,
):
    """
    Execute a single ORBIT task.

    Read-only tools such as Gmail, Calendar and
    Drive can execute automatically.

    High-risk actions require human approval.
    """

    # -----------------------------------------------------
    # TASK INFORMATION
    # -----------------------------------------------------

    task_id = task.get(
        "id"
    )

    title = task.get(
        "title",
        "",
    )

    description = task.get(
        "description",
        "",
    )

    tool = task.get(
        "tool",
        "",
    )

    tool_name = str(
        tool
    ).lower()


    # -----------------------------------------------------
    # RISK ASSESSMENT
    # -----------------------------------------------------

    risk_result = assess_risk(
        task
    )

    decision = risk_result[
        "decision"
    ]


    # -----------------------------------------------------
    # HIGH-RISK TASK
    # -----------------------------------------------------

    if (
        decision == "approval_required"
        and not approved
    ):

        return {
            "task_id": task_id,
            "task_title": title,
            "status": "waiting",
            "risk": risk_result["risk"],
            "decision": "approval_required",
            "reason": risk_result["reason"],
            "tool": tool,
            "evidence": [],
        }


    # -----------------------------------------------------
    # APPROVED HIGH-RISK TASK
    # -----------------------------------------------------

    if (
        decision == "approval_required"
        and approved
    ):

        decision = "approved"


    # -----------------------------------------------------
    # DETERMINE ACTION
    # -----------------------------------------------------

    action = get_task_action(
        task
    )

    query = build_tool_query(
        task
    )


    # =====================================================
    # GMAIL
    # =====================================================

    if (
        "gmail" in tool_name
        or "email" in tool_name
    ):

        # -------------------------------------------------
        # GMAIL SEND
        # -------------------------------------------------

        if action == "send":

            if approved:

                return {
                    "task_id": task_id,
                    "task_title": title,
                    "status": "blocked",
                    "risk": risk_result["risk"],
                    "decision": (
                        "approved_but_tool_unavailable"
                    ),
                    "tool": "Gmail",
                    "message": (
                        "User approval received, "
                        "but the Gmail send/reply "
                        "action is not implemented "
                        "in the current ORBIT MVP."
                    ),
                    "evidence": [],
                }

            return {
                "task_id": task_id,
                "task_title": title,
                "status": "waiting",
                "risk": "high",
                "decision": "approval_required",
                "tool": "Gmail",
                "reason": (
                    "Sending an email requires "
                    "explicit human approval."
                ),
                "evidence": [],
            }


        # -------------------------------------------------
        # GMAIL SEARCH
        # -------------------------------------------------

        result = execute_tool(
            tool="Gmail",
            action="search",
            parameters={
                "query": query,
            },
        )

        return {
            "task_id": task_id,
            "task_title": title,
            "status": result.get(
                "status",
                "error",
            ),
            "risk": risk_result["risk"],
            "decision": decision,
            "tool": "Gmail",
            "query": query,
            "evidence": result.get(
                "results",
                [],
            ),
            "message": result.get(
                "message",
                "",
            ),
        }


    # =====================================================
    # CALENDAR
    # =====================================================

    if "calendar" in tool_name:

        result = execute_tool(
            tool="Calendar",
            action="search",
            parameters={
                "query": query,
            },
        )

        return {
            "task_id": task_id,
            "task_title": title,
            "status": result.get(
                "status",
                "error",
            ),
            "risk": risk_result["risk"],
            "decision": decision,
            "tool": "Calendar",
            "query": query,
            "evidence": result.get(
                "results",
                [],
            ),
            "message": result.get(
                "message",
                "",
            ),
        }


    # =====================================================
    # DRIVE
    # =====================================================

    if "drive" in tool_name:

        result = execute_tool(
            tool="Drive",
            action="search",
            parameters={
                "query": query,
            },
        )

        return {
            "task_id": task_id,
            "task_title": title,
            "status": result.get(
                "status",
                "error",
            ),
            "risk": risk_result["risk"],
            "decision": decision,
            "tool": "Drive",
            "query": query,
            "evidence": result.get(
                "results",
                [],
            ),
            "message": result.get(
                "message",
                "",
            ),
        }


    # =====================================================
    # ORBIT INTERNAL TOOL
    # =====================================================

    if (
        tool_name == "orbit"
        or "orbit" in tool_name
    ):

        result = execute_tool(
            tool="ORBIT",
            action="draft",
            parameters={
                "query": query,
            },
        )

        return {
            "task_id": task_id,
            "task_title": title,
            "status": result.get(
                "status",
                "error",
            ),
            "risk": risk_result["risk"],
            "decision": decision,
            "tool": "ORBIT",
            "query": query,
            "evidence": result.get(
                "results",
                [],
            ),
            "message": result.get(
                "message",
                "",
            ),
        }


    # =====================================================
    # UNKNOWN TOOL
    # =====================================================

    return {
        "task_id": task_id,
        "task_title": title,
        "status": "blocked",
        "risk": risk_result["risk"],
        "decision": (
            "approved_but_tool_unavailable"
            if approved
            else decision
        ),
        "tool": tool,
        "message": (
            f"No executor is available "
            f"for tool '{tool}'."
        ),
        "evidence": [],
    }
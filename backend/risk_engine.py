def assess_risk(task: dict) -> dict:
    """
    ORBIT Risk Engine

    Determines whether a planned task can be
    executed automatically.
    """

    # Get task information safely
    declared_risk = str(
        task.get("risk", "medium")
    ).lower().strip()

    tool = str(
        task.get("tool", "")
    ).lower().strip()

    title = str(
        task.get("title", "")
    ).lower()

    description = str(
        task.get("description", "")
    ).lower()

    task_text = f"{title} {description}"

    # ----------------------------------------
    # 1. Explicit HIGH risk
    # ----------------------------------------

    if declared_risk == "high":
        return {
            "risk": "high",
            "decision": "approval_required",
            "reason": "Task was explicitly classified as high risk.",
        }

    # ----------------------------------------
    # 2. Detect dangerous actions
    # ----------------------------------------

    high_risk_keywords = [
        "delete",
        "send email",
        "send message",
        "transfer money",
        "payment",
        "purchase",
        "cancel",
        "publish",
        "modify account",
    ]

    for keyword in high_risk_keywords:
        if keyword in task_text:
            return {
                "risk": "high",
                "decision": "approval_required",
                "reason": (
                    f"Task contains a potentially high-impact action: "
                    f"{keyword}"
                ),
            }

    # ----------------------------------------
    # 3. Gmail / Email read-only operations
    # ----------------------------------------

    if "gmail" in tool or "email" in tool:
        return {
            "risk": "low",
            "decision": "execute",
            "reason": "Gmail operation is read-only.",
        }

    # ----------------------------------------
    # 4. MEDIUM risk
    # ----------------------------------------

    if declared_risk == "medium":
        return {
            "risk": "medium",
            "decision": "execute_with_monitoring",
            "reason": (
                "Task has moderate risk and requires "
                "execution monitoring."
            ),
        }

    # ----------------------------------------
    # 5. LOW risk / default
    # ----------------------------------------

    return {
        "risk": "low",
        "decision": "execute",
        "reason": (
            "Task does not contain a high-impact action."
        ),
    }
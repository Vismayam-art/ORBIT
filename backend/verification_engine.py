def verify_task(task: dict, execution_result: dict) -> dict:
    """
    ORBIT Verification Engine

    Determines whether the evidence returned by a tool
    is sufficient to consider a task completed.
    """

    status = execution_result.get(
        "status",
        "error",
    )

    evidence = execution_result.get(
        "evidence",
        [],
    )

    # ----------------------------------------
    # 1. Execution failed
    # ----------------------------------------

    if status != "success":
        return {
            "status": "failed",
            "verified": False,
            "reason": "Task execution failed.",
            "evidence_count": len(evidence),
        }

    # ----------------------------------------
    # 2. No evidence
    # ----------------------------------------

    if not evidence:
        return {
            "status": "failed",
            "verified": False,
            "reason": (
                "Execution completed but produced "
                "no evidence."
            ),
            "evidence_count": 0,
        }

    # ----------------------------------------
    # 3. Gmail verification
    # ----------------------------------------

    tool = str(
        execution_result.get(
            "tool",
            "",
        )
    ).lower()

    if (
        "gmail" in tool
        or "email" in tool
    ):
        return {
            "status": "passed",
            "verified": True,
            "reason": (
                "Relevant Gmail evidence was "
                "successfully retrieved."
            ),
            "evidence_count": len(evidence),
        }

    # ----------------------------------------
    # 4. Generic verification
    # ----------------------------------------

    return {
        "status": "passed",
        "verified": True,
        "reason": (
            "Task executed successfully and "
            "produced evidence."
        ),
        "evidence_count": len(evidence),
    }
from agent_executor import execute_task
from verification_engine import verify_task


def execute_workflow(workflow: dict) -> dict:
    """
    Execute the tasks produced by ORBIT's goal compiler.

    Tasks are executed in dependency order.
    A task only runs when all of its dependencies
    have completed successfully.
    """

    tasks = workflow.get("tasks", [])

    completed = set()
    results = []

    remaining = tasks.copy()

    while remaining:

        progress = False

        for task in remaining[:]:

            dependencies = task.get(
                "depends_on",
                []
            )

            # Wait until all dependencies
            # have completed successfully.
            if not all(
                dependency in completed
                for dependency in dependencies
            ):
                continue

            # ----------------------------------------
            # Execute task
            # ----------------------------------------

            result = execute_task(task)

            # ----------------------------------------
            # Verify task
            # ----------------------------------------

            verification = verify_task(
                task,
                result
            )

            result["verification"] = verification

            results.append(result)

            # ----------------------------------------
            # Determine completion
            # ----------------------------------------

            status = result.get(
                "status",
                "error"
            )

            verified = verification.get(
                "verified",
                False
            )

            if (
                status == "success"
                and verified
            ):
                completed.add(
                    task.get("id")
                )

            # Remove task from remaining queue.
            remaining.remove(task)

            progress = True

        # ----------------------------------------
        # Prevent infinite dependency loops
        # ----------------------------------------

        if not progress:

            blocked_tasks = []

            for task in remaining:

                blocked_tasks.append({
                    "task_id": task.get("id"),
                    "task_title": task.get("title"),
                    "status": "blocked",
                    "reason": (
                        "Task dependencies could not "
                        "be satisfied."
                    ),
                })

            results.extend(
                blocked_tasks
            )

            break

    return {
        "status": "success",
        "completed_tasks": list(completed),
        "results": results,
    }
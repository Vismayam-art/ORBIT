import os
import json

from dotenv import load_dotenv
from groq import Groq
from pydantic import BaseModel, Field


# ============================================================
# GROQ CLIENT
# ============================================================

load_dotenv()

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)


# ============================================================
# WORKFLOW SCHEMAS
# ============================================================


class Task(BaseModel):
    id: str
    title: str
    description: str
    tool: str
    risk: str
    depends_on: list[str] = Field(
        default_factory=list
    )


class VerificationCriterion(BaseModel):
    id: str
    label: str
    description: str


class GoalCompilation(BaseModel):
    goal: str
    outcome: str
    constraints: list[str]
    current_state: list[str]
    tasks: list[Task]
    verification: list[VerificationCriterion]


# ============================================================
# AVAILABLE TOOLS
# ============================================================

AVAILABLE_TOOLS = [
    "Gmail",
    "Calendar",
    "Drive",
    "Web",
    "ORBIT",
]


# ============================================================
# TOOL ROUTING
# ============================================================


def normalize_tool_name(tool: str) -> str:
    value = str(tool or "").strip().lower()

    if "gmail" in value or "email" in value:
        return "Gmail"

    if "calendar" in value or "schedule" in value:
        return "Calendar"

    if (
        "drive" in value
        or "file" in value
        or "document" in value
    ):
        return "Drive"

    if "web" in value or "search" in value:
        return "Web"

    if (
        "orbit" in value
        or "plan" in value
        or "verify" in value
    ):
        return "ORBIT"

    return "ORBIT"


def task_text(task: Task) -> str:
    return (
        f"{task.title} "
        f"{task.description}"
    ).lower()


def infer_tool_from_task(task: Task) -> str:
    text = task_text(task)

    # --------------------------------------------------------
    # GMAIL
    # --------------------------------------------------------

    gmail_send_keywords = [
        "send email",
        "send an email",
        "send message",
        "send the email",
        "reply to",
        "reply email",
        "email the team",
        "email project team",
    ]

    gmail_read_keywords = [
        "email",
        "emails",
        "gmail",
        "mailbox",
        "recipient",
        "recipients",
        "sender",
        "message",
        "messages",
        "team communication",
        "recent communication",
    ]

    if any(
        keyword in text
        for keyword in gmail_send_keywords
    ):
        return "Gmail"

    if any(
        keyword in text
        for keyword in gmail_read_keywords
    ):
        return "Gmail"

    # --------------------------------------------------------
    # CALENDAR
    # --------------------------------------------------------

    calendar_keywords = [
        "calendar",
        "meeting",
        "meetings",
        "schedule",
        "scheduled",
        "appointment",
        "appointments",
        "event",
        "events",
        "availability",
        "available time",
        "meeting time",
        "meeting date",
        "meeting timing",
        "latest meeting",
        "upcoming meeting",
        "next meeting",
    ]

    if any(
        keyword in text
        for keyword in calendar_keywords
    ):
        return "Calendar"

    # --------------------------------------------------------
    # DRIVE
    # --------------------------------------------------------

    drive_keywords = [
        "drive",
        "file",
        "files",
        "document",
        "documents",
        "notes",
        "meeting notes",
        "project document",
        "project documents",
        "latest document",
        "latest documents",
        "presentation",
        "slides",
        "report",
        "reports",
        "stored",
        "folder",
    ]

    if any(
        keyword in text
        for keyword in drive_keywords
    ):
        return "Drive"

    # --------------------------------------------------------
    # WEB
    # --------------------------------------------------------

    web_keywords = [
        "web search",
        "search the web",
        "internet",
        "online",
        "website",
        "websites",
        "latest news",
        "public information",
    ]

    if any(
        keyword in text
        for keyword in web_keywords
    ):
        return "Web"

    return "ORBIT"


def determine_risk(task: Task) -> str:
    text = task_text(task)

    high_risk_keywords = [
        "send email",
        "send an email",
        "send message",
        "reply to",
        "reply email",
        "delete",
        "purchase",
        "payment",
        "transfer money",
        "cancel",
        "publish",
        "modify account",
    ]

    if any(
        keyword in text
        for keyword in high_risk_keywords
    ):
        return "high"

    if str(task.risk).lower() == "high":
        return "high"

    if str(task.risk).lower() == "medium":
        return "medium"

    return "low"


# ============================================================
# SPECIAL EMAIL + MEETING WORKFLOW
# ============================================================


def create_email_meeting_workflow(
    goal: str,
) -> GoalCompilation:

    tasks = [
        Task(
            id="task_01",
            title="Identify project team email addresses",
            description=(
                "Locate and confirm the email addresses "
                "for the members of the project team."
            ),
            tool="Gmail",
            risk="low",
            depends_on=[],
        ),

        Task(
            id="task_02",
            title="Determine the latest project meeting",
            description=(
                "Identify the most recent relevant project "
                "meeting by reviewing the calendar."
            ),
            tool="Calendar",
            risk="low",
            depends_on=[],
        ),

        Task(
            id="task_03",
            title="Retrieve latest meeting updates",
            description=(
                "Access the latest meeting notes, action items, "
                "or relevant project updates from Drive."
            ),
            tool="Drive",
            risk="low",
            depends_on=[
                "task_02"
            ],
        ),

        Task(
            id="task_04",
            title="Draft email content with updates",
            description=(
                "Compose a draft email summarizing the key "
                "updates and decisions from the retrieved "
                "meeting information."
            ),
            tool="ORBIT",
            risk="low",
            depends_on=[
                "task_01",
                "task_03",
            ],
        ),

        Task(
            id="task_05",
            title="Send email to project team",
            description=(
                "Send the drafted email containing the latest "
                "meeting updates to the confirmed project team "
                "email addresses."
            ),
            tool="Gmail",
            risk="high",
            depends_on=[
                "task_01",
                "task_04",
            ],
        ),
    ]

    return GoalCompilation(
        goal=goal,

        outcome=(
            "The project team receives an email containing "
            "the latest verified meeting updates."
        ),

        constraints=[
            "Use the latest available project meeting information.",
            "Use confirmed project team email addresses.",
            "Do not send external communication without explicit approval.",
            "Only use information available to ORBIT.",
        ],

        current_state=[
            "Project team email addresses must be identified.",
            "The latest project meeting must be determined.",
            "The latest meeting updates must be retrieved.",
        ],

        tasks=tasks,

        verification=[
            VerificationCriterion(
                id="verify_01",
                label="Project recipients confirmed",
                description=(
                    "Relevant project team email addresses "
                    "have been identified."
                ),
            ),

            VerificationCriterion(
                id="verify_02",
                label="Latest meeting identified",
                description=(
                    "The most recent relevant project meeting "
                    "has been identified from Calendar."
                ),
            ),

            VerificationCriterion(
                id="verify_03",
                label="Latest updates retrieved",
                description=(
                    "Relevant meeting updates or notes "
                    "have been retrieved from Drive."
                ),
            ),

            VerificationCriterion(
                id="verify_04",
                label="Email draft prepared",
                description=(
                    "The email content contains the retrieved "
                    "meeting updates."
                ),
            ),

            VerificationCriterion(
                id="verify_05",
                label="Email delivery verified",
                description=(
                    "The approved email action is completed "
                    "and its result can be verified."
                ),
            ),
        ],
    )


# ============================================================
# WORKFLOW NORMALIZATION
# ============================================================


def normalize_workflow(
    workflow: GoalCompilation,
) -> GoalCompilation:

    normalized_tasks: list[Task] = []

    for task in workflow.tasks:

        inferred_tool = infer_tool_from_task(task)

        normalized_risk = determine_risk(task)

        normalized_tasks.append(
            Task(
                id=task.id,
                title=task.title,
                description=task.description,
                tool=inferred_tool,
                risk=normalized_risk,
                depends_on=list(
                    task.depends_on or []
                ),
            )
        )

    workflow.tasks = normalized_tasks

    return workflow


# ============================================================
# GOAL COMPILER
# ============================================================


def compile_goal(
    goal: str,
) -> GoalCompilation:

    goal_lower = goal.lower()

    # --------------------------------------------------------
    # SPECIAL EMAIL + MEETING ROUTE
    # --------------------------------------------------------

    email_goal = (
        (
            "send email" in goal_lower
            or "send an email" in goal_lower
            or "email the" in goal_lower
        )
        and
        (
            "meeting" in goal_lower
            or "update" in goal_lower
            or "latest" in goal_lower
        )
    )

    if email_goal:

        print(
            "ORBIT detected the email + meeting "
            "workflow. Using controlled tool routing."
        )

        return create_email_meeting_workflow(
            goal
        )

    # --------------------------------------------------------
    # GROQ PROMPT
    # --------------------------------------------------------

    prompt = f"""
You are ORBIT, an autonomous outcome engine.

The user has given this goal:

{goal}

Convert the goal into a structured executable workflow.

ORBIT follows:

GOAL → STATE → PLAN → ACT → ADAPT → VERIFY

Generate:

1. The original goal.
2. A clear desired outcome.
3. Relevant constraints.
4. Required current-state information.
5. A set of actionable tasks.
6. Explicit dependencies between tasks.
7. Verification criteria.

Available tools:

- Gmail
- Calendar
- Drive
- Web
- ORBIT

============================================================
IMPORTANT TOOL SELECTION RULES
============================================================

Use the tool that actually owns the information or action.

GMAIL:

Use Gmail for:

- finding email addresses
- reading emails
- searching messages
- reviewing email communication
- sending emails
- replying to emails

CALENDAR:

Use Calendar for:

- finding meetings
- finding events
- checking dates
- checking schedules
- checking availability
- identifying the latest or upcoming meeting
- identifying meeting times

DRIVE:

Use Drive for:

- finding files
- finding documents
- reading stored notes
- retrieving meeting notes
- retrieving project documents
- retrieving presentations
- retrieving reports
- accessing files stored in Drive

WEB:

Use Web for:

- public web information
- internet research
- websites
- public news

ORBIT:

Use ORBIT for:

- reasoning
- analyzing collected information
- combining information from multiple tools
- planning
- drafting
- decision logic
- verification logic

============================================================
CRITICAL RULE
============================================================

DO NOT use ORBIT when Gmail, Calendar, or Drive
is the correct source of information.

For example:

"Find the latest meeting"

MUST use Calendar.

"Find meeting notes"

MUST use Drive.

"Find team email addresses"

MUST use Gmail.

"Send an email"

MUST use Gmail.

"Analyze the collected information"

SHOULD use ORBIT.

============================================================
DEPENDENCY RULES
============================================================

Tasks must execute only after their dependencies
are completed.

Use depends_on to represent dependencies.

Tasks with no dependencies use [].

Do not create circular dependencies.

============================================================
RISK RULES
============================================================

Reading/searching information is generally low risk.

Reasoning and drafting are generally low risk.

Sending messages, deleting information,
purchases, payments, account modifications,
publishing, or other external side effects
MUST be marked high risk.

High-risk tasks MUST require human approval.

============================================================
GENERAL RULES
============================================================

1. Tasks must be specific and actionable.
2. Every task must have a unique ID.
3. Use only the available tools.
4. Verification criteria must be measurable.
5. The workflow must directly support the goal.
6. Do not add unnecessary tasks.
7. Do not invent unavailable information.
8. Preserve explicit user intent.
9. Prefer real connected tools over ORBIT reasoning.
10. Use ORBIT only where reasoning or orchestration
    is actually required.

Return only the structured workflow.
"""

    try:

        response = client.chat.completions.create(
            model=os.getenv(
                "GROQ_MODEL",
                "openai/gpt-oss-120b",
            ),
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are ORBIT, an autonomous outcome engine. "
                        "Return only valid JSON matching the requested "
                        "workflow structure. Do not include Markdown "
                        "or explanatory text."
                    ),
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            response_format={
                "type": "json_object"
            },
        )

        if not response.choices:
            raise RuntimeError(
                "Groq returned no workflow response."
            )

        response_text = (
            response.choices[0].message.content
        )

        if not response_text:
            raise RuntimeError(
                "Groq returned an empty workflow."
            )

        workflow_data = json.loads(
            response_text
        )

        workflow = GoalCompilation(
            **workflow_data
        )

        workflow = normalize_workflow(
            workflow
        )

        return workflow

    except Exception as error:

        print(
            "Groq unavailable or workflow parsing failed. "
            "Using ORBIT local fallback compiler."
        )

        print(
            f"Groq error: {error}"
        )

        return fallback_compile_goal(
            goal
        )


# ============================================================
# REPLANNING
# ============================================================


def replan_workflow(
    goal: str,
    previous_workflow: dict,
    change_description: str,
) -> dict:
    """
    Goal-aware replanning.

    The original goal is preserved.

    The previous workflow and newly detected state change
    are used to generate an updated workflow.

    If Groq is unavailable, ORBIT uses the deterministic
    fallback replanner.
    """

    original_goal = str(
        goal or ""
    ).strip()

    # --------------------------------------------------------
    # SPECIAL EMAIL + MEETING REPLAN
    # --------------------------------------------------------

    original_lower = original_goal.lower()

    email_goal = (
        (
            "send email" in original_lower
            or "send an email" in original_lower
            or "email the" in original_lower
        )
        and
        (
            "meeting" in original_lower
            or "update" in original_lower
            or "latest" in original_lower
        )
    )

    if email_goal:

        print(
            "ORBIT replanning email + meeting workflow."
        )

        workflow = create_email_meeting_workflow(
            original_goal
        )

        workflow.current_state = [
            f"External state changed: {change_description}",
            "Previous workflow information may be stale.",
            "Affected Calendar, Drive and Gmail state must be re-checked.",
        ]

        workflow.constraints.append(
            "Re-check changed external state before continuing."
        )

        return workflow.model_dump()

    # --------------------------------------------------------
    # REPLAN PROMPT
    # --------------------------------------------------------

    prompt = f"""
You are ORBIT, an autonomous outcome engine.

The user's original goal is:

{original_goal}

ORBIT previously generated this workflow:

{previous_workflow}

A change in external state has now been detected:

{change_description}

Replan the workflow so that the original goal can still
be achieved under the new state.

============================================================
TOOL SELECTION
============================================================

Use Gmail for:
- email
- messages
- recipients
- sending or replying to emails

Use Calendar for:
- meetings
- events
- schedules
- availability
- meeting dates and times

Use Drive for:
- files
- documents
- notes
- meeting notes
- reports
- presentations

Use Web for public internet information.

Use ORBIT for:
- reasoning
- analysis
- planning
- drafting
- orchestration
- verification

Do not use ORBIT when Calendar, Drive, or Gmail
is the correct source of information.

============================================================
REPLAN RULES
============================================================

1. Preserve the original goal.
2. Preserve the desired outcome where possible.
3. Remove tasks that are no longer necessary.
4. Add tasks required by the new state.
5. Update dependencies when necessary.
6. Do not invent unavailable tools.
7. Available tools:
   - Gmail
   - Calendar
   - Drive
   - Web
   - ORBIT
8. Assign risk as low, medium, or high.
9. High-impact actions must be high risk.
10. High-risk actions require human approval.
11. Include measurable verification criteria.
12. Keep the workflow actionable.
13. Avoid unnecessary tasks.
14. Do not create circular dependencies.
15. Re-check stale external information.
16. Maintain explicit dependencies.

Return only the updated structured workflow.
"""

    try:

        response = client.chat.completions.create(
            model=os.getenv(
                "GROQ_MODEL",
                "openai/gpt-oss-120b",
            ),
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are ORBIT, an autonomous outcome engine. "
                        "Return only valid JSON matching the requested "
                        "workflow structure. Do not include Markdown "
                        "or explanatory text."
                    ),
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            response_format={
                "type": "json_object"
            },
        )

        if not response.choices:
            raise RuntimeError(
                "Groq returned no replanned workflow response."
            )

        response_text = (
            response.choices[0].message.content
        )

        if not response_text:
            raise RuntimeError(
                "Groq returned an empty replanned workflow."
            )

        workflow_data = json.loads(
            response_text
        )

        workflow = GoalCompilation(
            **workflow_data
        )

        workflow = normalize_workflow(
            workflow
        )

        return workflow.model_dump()

    except Exception as error:

        print(
            "Groq unavailable or replanning failed. "
            "Using ORBIT local fallback replanner."
        )

        print(
            f"Groq replan error: {error}"
        )

        # IMPORTANT:
        # fallback_replan_workflow returns a dict.
        # Convert it into GoalCompilation before
        # passing it to normalize_workflow.

        replanned_data = fallback_replan_workflow(
            goal=original_goal,
            previous_workflow=previous_workflow,
            change_description=change_description,
        )

        replanned = GoalCompilation(
            **replanned_data
        )

        replanned = normalize_workflow(
            replanned
        )

        return replanned.model_dump()


# ============================================================
# QUOTA / API ERROR DETECTION
# ============================================================


def is_quota_error(
    error: Exception,
) -> bool:

    error_text = str(
        error
    ).lower()

    quota_indicators = [
        "resource_exhausted",
        "quota exceeded",
        "quota_exceeded",
        "429",
        "rate limit",
        "too many requests",
    ]

    return any(
        indicator in error_text
        for indicator in quota_indicators
    )


# ============================================================
# LOCAL FALLBACK REPLANNER
# ============================================================


def fallback_replan_workflow(
    goal: str,
    previous_workflow: dict,
    change_description: str,
) -> dict:
    """
    Goal-aware deterministic replanning fallback.

    The original goal is preserved.
    The plan changes according to the detected state.
    """

    goal_text = str(
        goal or ""
    ).strip()

    change_text = str(
        change_description or ""
    ).strip()

    goal_lower = goal_text.lower()

    # --------------------------------------------------------
    # EMAIL + MEETING
    # --------------------------------------------------------

    email_goal = (
        (
            "send email" in goal_lower
            or "send an email" in goal_lower
            or "email the" in goal_lower
        )
        and
        (
            "meeting" in goal_lower
            or "update" in goal_lower
            or "latest" in goal_lower
        )
    )

    if email_goal:

        workflow = create_email_meeting_workflow(
            goal_text
        )

        workflow.current_state = [
            f"External state changed: {change_text}",
            "Previous workflow information may be stale.",
            "Affected Calendar, Drive and Gmail state must be re-checked.",
        ]

        workflow.constraints.append(
            "Re-check changed external state before continuing."
        )

        return workflow.model_dump()

    # --------------------------------------------------------
    # INTERVIEW
    # --------------------------------------------------------

    if any(
        keyword in goal_lower
        for keyword in [
            "interview",
            "prepare for interview",
            "interview preparation",
        ]
    ):

        tasks = [
            {
                "id": "replan_interview_01",
                "title": "Re-check interview requirements",
                "description": (
                    "Re-evaluate the information relevant to "
                    "the interview after the detected state change."
                ),
                "tool": "ORBIT",
                "risk": "low",
                "depends_on": [],
            },

            {
                "id": "replan_interview_02",
                "title": "Prioritize preparation",
                "description": (
                    "Adjust the interview preparation priorities "
                    "based on the newly detected state."
                ),
                "tool": "ORBIT",
                "risk": "low",
                "depends_on": [
                    "replan_interview_01"
                ],
            },

            {
                "id": "replan_interview_03",
                "title": "Update preparation plan",
                "description": (
                    "Create an updated preparation sequence "
                    "that still targets the original interview goal."
                ),
                "tool": "ORBIT",
                "risk": "low",
                "depends_on": [
                    "replan_interview_02"
                ],
            },

            {
                "id": "replan_interview_04",
                "title": "Verify interview readiness",
                "description": (
                    "Verify that the updated preparation plan "
                    "still satisfies the original interview goal."
                ),
                "tool": "ORBIT",
                "risk": "low",
                "depends_on": [
                    "replan_interview_03"
                ],
            },
        ]

        verification = [
            {
                "id": "verify_interview_requirements",
                "label": "Interview requirements re-evaluated",
                "description": (
                    "The changed state was incorporated into "
                    "the interview preparation workflow."
                ),
            },

            {
                "id": "verify_interview_priorities",
                "label": "Preparation priorities updated",
                "description": (
                    "Preparation priorities reflect the new state."
                ),
            },

            {
                "id": "verify_interview_plan",
                "label": "Updated preparation plan created",
                "description": (
                    "A revised plan still targets the original goal."
                ),
            },

            {
                "id": "verify_interview_readiness",
                "label": "Interview readiness verified",
                "description": (
                    "The revised plan remains aligned with "
                    "the original interview preparation goal."
                ),
            },
        ]

        return {
            "goal": goal_text,

            "outcome": (
                "Prepare successfully for the interview "
                "using an updated plan that accounts for "
                "the detected change."
            ),

            "current_state": [
                "External state changed during execution.",
                change_text,
                "The previous plan may contain outdated assumptions.",
            ],

            "tasks": tasks,

            "verification": verification,
        }

    # --------------------------------------------------------
    # GYM / FITNESS
    # --------------------------------------------------------

    if any(
        keyword in goal_lower
        for keyword in [
            "gym",
            "workout",
            "exercise",
            "fitness",
        ]
    ):

        tasks = [
            {
                "id": "replan_gym_01",
                "title": "Re-check workout timing",
                "description": (
                    "Re-evaluate the available preparation time "
                    "after the detected change."
                ),
                "tool": "ORBIT",
                "risk": "low",
                "depends_on": [],
            },

            {
                "id": "replan_gym_02",
                "title": "Prioritize gym preparation",
                "description": (
                    "Prioritize the preparation activities "
                    "that are still necessary for the workout."
                ),
                "tool": "ORBIT",
                "risk": "low",
                "depends_on": [
                    "replan_gym_01"
                ],
            },

            {
                "id": "replan_gym_03",
                "title": "Update gym preparation plan",
                "description": (
                    "Adjust the preparation sequence according "
                    "to the newly detected state."
                ),
                "tool": "ORBIT",
                "risk": "low",
                "depends_on": [
                    "replan_gym_02"
                ],
            },

            {
                "id": "replan_gym_04",
                "title": "Verify gym readiness",
                "description": (
                    "Verify that the updated preparation plan "
                    "still satisfies the original gym goal."
                ),
                "tool": "ORBIT",
                "risk": "low",
                "depends_on": [
                    "replan_gym_03"
                ],
            },
        ]

        verification = [
            {
                "id": "verify_gym_timing",
                "label": "Workout timing re-evaluated",
                "description": (
                    "Available preparation time was incorporated."
                ),
            },

            {
                "id": "verify_gym_priorities",
                "label": "Preparation priorities updated",
                "description": (
                    "Required gym preparation activities were reprioritized."
                ),
            },

            {
                "id": "verify_gym_plan",
                "label": "Updated gym plan created",
                "description": (
                    "A revised preparation plan was generated."
                ),
            },

            {
                "id": "verify_gym_readiness",
                "label": "Gym readiness verified",
                "description": (
                    "The updated plan remains aligned with "
                    "the original gym preparation goal."
                ),
            },
        ]

        return {
            "goal": goal_text,

            "outcome": (
                "Be prepared for the workout using an updated "
                "plan that accounts for the detected change."
            ),

            "current_state": [
                "External state changed during execution.",
                change_text,
                "The previous preparation plan may contain outdated assumptions.",
            ],

            "tasks": tasks,

            "verification": verification,
        }

    # --------------------------------------------------------
    # MEETING
    # --------------------------------------------------------

    if any(
        keyword in goal_lower
        for keyword in [
            "meeting",
            "meet",
            "meeting preparation",
        ]
    ):

        tasks = [
            {
                "id": "replan_meeting_01",
                "title": "Re-check meeting details",
                "description": (
                    "Re-evaluate the latest meeting information "
                    "after the detected change."
                ),
                "tool": "Calendar",
                "risk": "low",
                "depends_on": [],
            },

            {
                "id": "replan_meeting_02",
                "title": "Analyze meeting impact",
                "description": (
                    "Determine which preparation requirements "
                    "changed as a result of the new state."
                ),
                "tool": "ORBIT",
                "risk": "low",
                "depends_on": [
                    "replan_meeting_01"
                ],
            },

            {
                "id": "replan_meeting_03",
                "title": "Update meeting preparation",
                "description": (
                    "Create an updated preparation plan for "
                    "the original meeting objective."
                ),
                "tool": "ORBIT",
                "risk": "low",
                "depends_on": [
                    "replan_meeting_02"
                ],
            },

            {
                "id": "replan_meeting_04",
                "title": "Verify meeting readiness",
                "description": (
                    "Verify that the updated plan still "
                    "satisfies the original meeting goal."
                ),
                "tool": "ORBIT",
                "risk": "low",
                "depends_on": [
                    "replan_meeting_03"
                ],
            },
        ]

        verification = [
            {
                "id": "verify_meeting_details",
                "label": "Meeting details re-checked",
                "description": (
                    "Current meeting state was incorporated."
                ),
            },

            {
                "id": "verify_meeting_impact",
                "label": "Meeting impact analyzed",
                "description": (
                    "The effect of the change was analyzed."
                ),
            },

            {
                "id": "verify_meeting_plan",
                "label": "Meeting plan updated",
                "description": (
                    "The preparation workflow was updated."
                ),
            },

            {
                "id": "verify_meeting_readiness",
                "label": "Meeting readiness verified",
                "description": (
                    "The revised workflow still satisfies "
                    "the original meeting objective."
                ),
            },
        ]

        return {
            "goal": goal_text,

            "outcome": (
                "Remain prepared for the meeting using an "
                "updated plan that accounts for the detected change."
            ),

            "current_state": [
                "External state changed during execution.",
                change_text,
                "Meeting information may have changed.",
            ],

            "tasks": tasks,

            "verification": verification,
        }

    # --------------------------------------------------------
    # EMAIL
    # --------------------------------------------------------

    if any(
        keyword in goal_lower
        for keyword in [
            "send email",
            "email",
            "mail",
        ]
    ):

        tasks = [
            {
                "id": "replan_email_01",
                "title": "Re-check email context",
                "description": (
                    "Re-evaluate the information required "
                    "for the original email goal."
                ),
                "tool": "Gmail",
                "risk": "low",
                "depends_on": [],
            },

            {
                "id": "replan_email_02",
                "title": "Analyze impact of the change",
                "description": (
                    "Determine how the changed state affects "
                    "the original email objective."
                ),
                "tool": "ORBIT",
                "risk": "low",
                "depends_on": [
                    "replan_email_01"
                ],
            },

            {
                "id": "replan_email_03",
                "title": "Update email plan",
                "description": (
                    "Update the email workflow while preserving "
                    "the original communication objective."
                ),
                "tool": "ORBIT",
                "risk": "low",
                "depends_on": [
                    "replan_email_02"
                ],
            },

            {
                "id": "replan_email_04",
                "title": "Verify email readiness",
                "description": (
                    "Verify that the updated workflow is ready "
                    "to satisfy the original email goal."
                ),
                "tool": "ORBIT",
                "risk": "low",
                "depends_on": [
                    "replan_email_03"
                ],
            },
        ]

        verification = [
            {
                "id": "verify_email_context",
                "label": "Email context re-checked",
                "description": (
                    "Required communication context was refreshed."
                ),
            },

            {
                "id": "verify_email_impact",
                "label": "Change impact analyzed",
                "description": (
                    "The effect of the changed state was evaluated."
                ),
            },

            {
                "id": "verify_email_plan",
                "label": "Email plan updated",
                "description": (
                    "The email workflow was updated."
                ),
            },

            {
                "id": "verify_email_readiness",
                "label": "Email workflow verified",
                "description": (
                    "The updated workflow remains aligned "
                    "with the original goal."
                ),
            },
        ]

        return {
            "goal": goal_text,

            "outcome": (
                "Complete the original email objective using "
                "an updated plan that accounts for the detected change."
            ),

            "current_state": [
                "External state changed during execution.",
                change_text,
                "Previous email context may be outdated.",
            ],

            "tasks": tasks,

            "verification": verification,
        }

    # --------------------------------------------------------
    # GENERIC GOAL-AWARE FALLBACK
    # --------------------------------------------------------

    previous_tasks = (
        previous_workflow.get(
            "tasks",
            [],
        )
        if isinstance(previous_workflow, dict)
        else []
    )

    first_tool = "ORBIT"

    if previous_tasks:

        previous_tools = [
            str(
                task.get(
                    "tool",
                    "ORBIT"
                )
            )
            for task in previous_tasks
            if isinstance(task, dict)
        ]

        if previous_tools:
            first_tool = previous_tools[0]

    tasks = [
        {
            "id": "replan_generic_01",
            "title": "Re-check goal state",
            "description": (
                "Re-evaluate the information affected by "
                "the detected change while preserving the original goal."
            ),
            "tool": first_tool,
            "risk": "low",
            "depends_on": [],
        },

        {
            "id": "replan_generic_02",
            "title": "Analyze change impact",
            "description": (
                "Determine which parts of the existing plan "
                "remain valid and which need adjustment."
            ),
            "tool": "ORBIT",
            "risk": "low",
            "depends_on": [
                "replan_generic_01"
            ],
        },

        {
            "id": "replan_generic_03",
            "title": "Update goal-specific plan",
            "description": (
                "Generate an updated execution plan that "
                "continues to target the original goal."
            ),
            "tool": "ORBIT",
            "risk": "low",
            "depends_on": [
                "replan_generic_02"
            ],
        },

        {
            "id": "replan_generic_04",
            "title": "Verify updated outcome",
            "description": (
                "Verify that the revised workflow still "
                "satisfies the original goal."
            ),
            "tool": "ORBIT",
            "risk": "low",
            "depends_on": [
                "replan_generic_03"
            ],
        },
    ]

    verification = [
        {
            "id": "verify_generic_state",
            "label": "Changed state incorporated",
            "description": (
                "The detected state change was incorporated."
            ),
        },

        {
            "id": "verify_generic_impact",
            "label": "Change impact analyzed",
            "description": (
                "The effect of the change was evaluated."
            ),
        },

        {
            "id": "verify_generic_plan",
            "label": "Goal-specific plan updated",
            "description": (
                "The revised plan continues targeting the original goal."
            ),
        },

        {
            "id": "verify_generic_outcome",
            "label": "Original outcome preserved",
            "description": (
                "The replanned workflow remains aligned with "
                "the original objective."
            ),
        },
    ]

    return {
        "goal": goal_text,

        "outcome": (
            f"Continue working toward the original goal: {goal_text}"
        ),

        "current_state": [
            "External state changed during execution.",
            change_text,
            "The previous workflow may contain outdated assumptions.",
        ],

        "tasks": tasks,

        "verification": verification,
    }


# ============================================================
# LOCAL FALLBACK COMPILER
# ============================================================


def fallback_compile_goal(
    goal: str,
) -> GoalCompilation:

    goal_lower = goal.lower()

    # --------------------------------------------------------
    # PRESENTATION WORKFLOW
    # --------------------------------------------------------

    if "presentation" in goal_lower:

        tasks = [
            Task(
                id="task_01",
                title="Check presentation schedule",
                description=(
                    "Review Calendar to identify the "
                    "presentation date, time and constraints."
                ),
                tool="Calendar",
                risk="low",
                depends_on=[],
            ),

            Task(
                id="task_02",
                title="Find latest presentation files",
                description=(
                    "Search Drive for the latest presentation "
                    "slides, assets and supporting documents."
                ),
                tool="Drive",
                risk="low",
                depends_on=[],
            ),

            Task(
                id="task_03",
                title="Review presentation communication",
                description=(
                    "Search Gmail for recent presentation "
                    "updates, decisions and instructions."
                ),
                tool="Gmail",
                risk="low",
                depends_on=[],
            ),

            Task(
                id="task_04",
                title="Build preparation plan",
                description=(
                    "Combine the collected schedule, files "
                    "and communication into an actionable "
                    "presentation preparation plan."
                ),
                tool="ORBIT",
                risk="low",
                depends_on=[
                    "task_01",
                    "task_02",
                    "task_03",
                ],
            ),

            Task(
                id="task_05",
                title="Verify presentation readiness",
                description=(
                    "Verify that the required preparation "
                    "steps and supporting materials are complete."
                ),
                tool="ORBIT",
                risk="low",
                depends_on=[
                    "task_04"
                ],
            ),
        ]

        return GoalCompilation(
            goal=goal,

            outcome=(
                "The presentation is prepared using "
                "the latest available information."
            ),

            constraints=[
                "Use the latest available information.",
                "Do not invent missing information.",
                "Verify preparation before completion.",
            ],

            current_state=[
                "Presentation schedule must be checked.",
                "Latest presentation files must be found.",
                "Recent presentation communication must be reviewed.",
            ],

            tasks=tasks,

            verification=[
                VerificationCriterion(
                    id="verify_01",
                    label="Presentation schedule confirmed",
                    description=(
                        "The presentation schedule has "
                        "been identified from Calendar."
                    ),
                ),

                VerificationCriterion(
                    id="verify_02",
                    label="Latest presentation files found",
                    description=(
                        "The latest presentation files "
                        "have been located in Drive."
                    ),
                ),

                VerificationCriterion(
                    id="verify_03",
                    label="Recent updates reviewed",
                    description=(
                        "Relevant Gmail communication "
                        "has been reviewed."
                    ),
                ),

                VerificationCriterion(
                    id="verify_04",
                    label="Preparation plan completed",
                    description=(
                        "ORBIT has produced a structured "
                        "preparation plan."
                    ),
                ),
            ],
        )

    # --------------------------------------------------------
    # MEETING WORKFLOW
    # --------------------------------------------------------

    if "meeting" in goal_lower:

        tasks = [
            Task(
                id="task_01",
                title="Check meeting schedule",
                description=(
                    "Review Calendar for the relevant "
                    "meeting date, time and participants."
                ),
                tool="Calendar",
                risk="low",
                depends_on=[],
            ),

            Task(
                id="task_02",
                title="Retrieve meeting documents",
                description=(
                    "Search Drive for relevant meeting "
                    "notes, documents and updates."
                ),
                tool="Drive",
                risk="low",
                depends_on=[
                    "task_01"
                ],
            ),

            Task(
                id="task_03",
                title="Review meeting communication",
                description=(
                    "Search Gmail for recent messages "
                    "related to the meeting."
                ),
                tool="Gmail",
                risk="low",
                depends_on=[],
            ),

            Task(
                id="task_04",
                title="Prepare meeting summary",
                description=(
                    "Analyze the collected meeting "
                    "information and create a structured summary."
                ),
                tool="ORBIT",
                risk="low",
                depends_on=[
                    "task_02",
                    "task_03",
                ],
            ),

            Task(
                id="task_05",
                title="Verify meeting readiness",
                description=(
                    "Verify that the relevant meeting "
                    "information and preparation steps are complete."
                ),
                tool="ORBIT",
                risk="low",
                depends_on=[
                    "task_04"
                ],
            ),
        ]

        return GoalCompilation(
            goal=goal,

            outcome=(
                "The meeting is prepared using the "
                "latest available context."
            ),

            constraints=[
                "Use current Calendar information.",
                "Use relevant Drive documents.",
                "Use relevant Gmail communication.",
                "Verify the final preparation state.",
            ],

            current_state=[
                "Meeting schedule must be identified.",
                "Relevant meeting documents must be retrieved.",
                "Recent communication must be reviewed.",
            ],

            tasks=tasks,

            verification=[
                VerificationCriterion(
                    id="verify_01",
                    label="Meeting schedule confirmed",
                    description=(
                        "The relevant meeting has been "
                        "identified from Calendar."
                    ),
                ),

                VerificationCriterion(
                    id="verify_02",
                    label="Meeting documents retrieved",
                    description=(
                        "Relevant meeting documents "
                        "have been retrieved from Drive."
                    ),
                ),

                VerificationCriterion(
                    id="verify_03",
                    label="Meeting communication reviewed",
                    description=(
                        "Relevant Gmail communication "
                        "has been reviewed."
                    ),
                ),

                VerificationCriterion(
                    id="verify_04",
                    label="Meeting readiness verified",
                    description=(
                        "ORBIT confirms that the required "
                        "preparation is complete."
                    ),
                ),
            ],
        )

    # --------------------------------------------------------
    # GENERIC FALLBACK
    # --------------------------------------------------------

    tasks = [
        Task(
            id="task_01",
            title="Collect relevant information",
            description=(
                "Collect the information required to "
                "understand the current state related to the goal."
            ),
            tool="Gmail",
            risk="low",
            depends_on=[],
        ),

        Task(
            id="task_02",
            title="Review available information",
            description=(
                "Review the collected information and "
                "identify important details, constraints "
                "and dependencies."
            ),
            tool="ORBIT",
            risk="low",
            depends_on=[
                "task_01"
            ],
        ),

        Task(
            id="task_03",
            title="Create execution plan",
            description=(
                "Create a structured execution plan using "
                "the information collected from the current state."
            ),
            tool="ORBIT",
            risk="low",
            depends_on=[
                "task_02"
            ],
        ),

        Task(
            id="task_04",
            title="Verify goal readiness",
            description=(
                "Check that the required information and "
                "preparation steps are complete."
            ),
            tool="ORBIT",
            risk="low",
            depends_on=[
                "task_03"
            ],
        ),
    ]

    return GoalCompilation(
        goal=goal,

        outcome=(
            "The requested goal is prepared with the "
            "available information and verified for readiness."
        ),

        constraints=[
            "Use only information available to ORBIT.",
            "Avoid high-impact actions without approval.",
        ],

        current_state=[
            "Current state information must be collected "
            "before execution."
        ],

        tasks=tasks,

        verification=[
            VerificationCriterion(
                id="verify_01",
                label="Required information collected",
                description=(
                    "Relevant information required for "
                    "the goal has been successfully collected."
                ),
            ),

            VerificationCriterion(
                id="verify_02",
                label="Execution plan prepared",
                description=(
                    "The generated plan contains actionable "
                    "steps supporting the original goal."
                ),
            ),

            VerificationCriterion(
                id="verify_03",
                label="Goal readiness verified",
                description=(
                    "ORBIT confirms that the requested "
                    "preparation is complete."
                ),
            ),
        ],
    )
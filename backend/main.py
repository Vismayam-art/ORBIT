import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from goal_compiler import compile_goal
from goal_compiler import replan_workflow
from gmail_tool import search_emails, get_email
from tool_router import execute_tool
from agent_executor import execute_task
from workflow_executor import execute_workflow

load_dotenv()


app = FastAPI(
    title="ORBIT Backend",
    description="Autonomous Outcome Engine API",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Request Models
# --------------------------------------------------

class GoalRequest(BaseModel):
    goal: str


class GmailSearchRequest(BaseModel):
    query: str

class ToolExecutionRequest(BaseModel):
    tool: str
    action: str
    parameters: dict = {}

class AgentTaskRequest(BaseModel):
    task: dict

class WorkflowExecutionRequest(BaseModel):
    workflow: dict

class ReplanRequest(BaseModel):
    original_goal: str
    previous_workflow: dict
    change_description: str
class ApprovalRequest(BaseModel):
    task: dict


class RejectionRequest(BaseModel):
    task_id: str

# --------------------------------------------------
# Basic Endpoints
# --------------------------------------------------

@app.get("/")
def root():
    return {
        "system": "ORBIT",
        "status": "online",
        "message": "ORBIT backend is running",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "orbit-backend",
    }


# --------------------------------------------------
# Gemini Connection Test
# --------------------------------------------------

@app.get("/test-gemini")
def test_gemini():

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        return {
            "status": "error",
            "message": "GEMINI_API_KEY not found",
        }

    try:

        from google import genai

        client = genai.Client(
            api_key=api_key
        )

        response = client.models.generate_content(
            model="gemini-3.8-flash",
            contents="Reply with exactly: ORBIT Gemini connection successful",
        )

        return {
            "status": "success",
            "message": response.text,
        }

    except Exception as error:

        return {
            "status": "error",
            "message": str(error),
        }


# --------------------------------------------------
# Goal Compilation
# --------------------------------------------------

@app.post("/compile-goal")
def compile_user_goal(
    request: GoalRequest
):

    try:

        result = compile_goal(
            request.goal
        )

        return {
            "status": "success",
            "workflow": result.model_dump(),
        }

    except Exception as error:

        return {
            "status": "error",
            "message": str(error),
        }


# --------------------------------------------------
# Gmail Search
# --------------------------------------------------

@app.post("/gmail/search")
def gmail_search(
    request: GmailSearchRequest
):

    results = search_emails(
        request.query
    )

    return {
        "status": "success",
        "query": request.query,
        "count": len(results),
        "emails": results,
    }


# --------------------------------------------------
# Gmail Retrieve
# --------------------------------------------------

@app.get("/gmail/{email_id}")
def gmail_get(
    email_id: str
):

    email = get_email(
        email_id
    )

    if email is None:

        return {
            "status": "error",
            "message": "Email not found",
        }

    return {
        "status": "success",
        "email": email,
    }
# --------------------------------------------------
# ORBIT Tool Execution
# --------------------------------------------------

@app.post("/tools/execute")
def execute_orbit_tool(
    request: ToolExecutionRequest
):
    result = execute_tool(
        tool=request.tool,
        action=request.action,
        parameters=request.parameters,
    )

    return result
# --------------------------------------------------
# ORBIT Agent Executor
# --------------------------------------------------

@app.post("/agent/execute")
def agent_execute(
    request: AgentTaskRequest
):
    result = execute_task(
        request.task
    )

    return {
        "status": "success",
        "execution": result,
    }
# --------------------------------------------------
# ORBIT Workflow Execution
# --------------------------------------------------

@app.post("/workflow/execute")
def workflow_execute(
    request: WorkflowExecutionRequest
):
    result = execute_workflow(
        request.workflow
    )

    return {
        "status": "success",
        "workflow_execution": result,
    }
@app.post("/workflow/replan")
def replan(request: ReplanRequest):

    try:

        new_workflow = replan_workflow(
            goal=request.original_goal,
            previous_workflow=request.previous_workflow,
            change_description=request.change_description,
        )

        return {
            "status": "success",
            "message": "ORBIT replanned the workflow successfully.",
            "workflow": new_workflow,
        }

    except Exception as error:

        return {
            "status": "error",
            "message": str(error),
        }
    # --------------------------------------------------
# ORBIT HUMAN APPROVAL
# --------------------------------------------------

@app.post("/approval/approve")
def approve_task(
    request: ApprovalRequest
):

    try:

        task = request.task

        # Re-check the task through the existing
        # risk engine before executing it.
        result = execute_task(
    task,
    approved=True,
)

        return {
            "status": "success",
            "execution": result,
        }

    except Exception as error:

        return {
            "status": "error",
            "message": str(error),
        }


@app.post("/approval/reject")
def reject_task(
    request: RejectionRequest
):

    return {
        "status": "success",
        "message": (
            f"Task {request.task_id} "
            "was rejected by the user."
        ),
        "execution": {
            "task_id": request.task_id,
            "status": "rejected",
            "decision": "user_rejected",
        },
    }
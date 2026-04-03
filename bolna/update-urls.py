"""Update Bolna agent URLs from ngrok to Railway."""
import json
import sys
import urllib.request

API_KEY = "bn-338816c85ea5403da883cefbe6e1e8bb"
RAILWAY_URL = "https://medicall-ai-production.up.railway.app"
OLD_URL = "https://8ab6-36-255-86-231.ngrok-free.app"

AGENTS = {
    "scheduling": "0001dab7-2506-4cfd-8597-6c95e05a0f05",
    "reminder": "1e613f07-2ffc-46c7-a57d-9759f91f4603",
}

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
}

for name, agent_id in AGENTS.items():
    print(f"\nUpdating {name} agent ({agent_id})...")

    # Get current config
    req = urllib.request.Request(
        f"https://api.bolna.ai/v2/agent/{agent_id}",
        headers=headers,
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())

    # Get current values
    prompt = data.get("agent_prompts", {}).get("task_1", {}).get("system_prompt", "")
    welcome = data.get("agent_welcome_message", "")
    webhook = data.get("webhook_url", "")
    tasks = data.get("tasks", [])

    # Replace URLs in api_tools
    api_tools_str = json.dumps(tasks[0]["tools_config"].get("api_tools", {}))
    api_tools_str = api_tools_str.replace(OLD_URL, RAILWAY_URL)
    api_tools = json.loads(api_tools_str)

    # Build update payload
    config = {
        "agent_config": {
            "agent_name": data["agent_name"],
            "agent_welcome_message": welcome,
            "agent_type": data["agent_type"],
            "webhook_url": webhook.replace(OLD_URL, RAILWAY_URL),
            "tasks": [],
        },
        "agent_prompts": {"task_1": {"system_prompt": prompt}},
    }

    for task in tasks:
        new_task = {
            "task_type": task["task_type"],
            "toolchain": task["toolchain"],
            "tools_config": {**task["tools_config"]},
            "task_config": task["task_config"],
        }
        if task["task_type"] == "conversation":
            new_task["tools_config"]["api_tools"] = api_tools
        config["agent_config"]["tasks"].append(new_task)

    # PUT update
    payload = json.dumps(config).encode()
    req = urllib.request.Request(
        f"https://api.bolna.ai/v2/agent/{agent_id}",
        data=payload,
        headers=headers,
        method="PUT",
    )
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read())
        print(f"  Result: {result}")

print("\nDone! Both agents now point to:", RAILWAY_URL)

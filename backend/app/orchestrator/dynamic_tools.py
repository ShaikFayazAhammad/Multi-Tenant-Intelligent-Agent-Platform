import time
import httpx
from typing import List, Dict, Any, Callable
from app.core.security import decrypt_secret
from app.models.api_integration import ApiIntegration

class DynamicToolFactory:
    """
    Dynamic Tools Builder: Converts DB ApiIntegration records into executable runtime functions
    """

    @staticmethod
    def build_tools_for_project(integrations: List[ApiIntegration]) -> Dict[str, Dict[str, Any]]:
        """
        Build a dictionary of executable dynamic tools from enabled API integrations.
        Returns: { tool_name: { "func": async_func, "description": str, "parameters": dict } }
        """
        tools_map = {}

        for item in integrations:
            if not item.is_enabled:
                continue

            raw_secret = decrypt_secret(item.encrypted_secret) if item.encrypted_secret else ""

            for ep in (item.endpoints or []):
                ep_name = ep.get("name") or ep.get("path", "").replace("/", "_").strip("_")
                tool_key = f"{item.name.lower().replace(' ', '_')}_{ep_name}"
                
                # Build docstring and execution lambda
                tools_map[tool_key] = {
                    "name": tool_key,
                    "description": ep.get("description") or f"Call {item.name} API endpoint {ep.get('path')}",
                    "base_url": item.base_url,
                    "method": ep.get("method", "GET").upper(),
                    "path": ep.get("path"),
                    "auth_type": item.auth_type,
                    "raw_secret": raw_secret,
                    "executor": DynamicToolFactory._create_executor(
                        base_url=item.base_url,
                        method=ep.get("method", "GET").upper(),
                        path=ep.get("path"),
                        auth_type=item.auth_type,
                        raw_secret=raw_secret
                    )
                }

        return tools_map

    @staticmethod
    def _create_executor(base_url: str, method: str, path: str, auth_type: str, raw_secret: str) -> Callable:
        async def execute_tool(params: Dict[str, Any] = None) -> Dict[str, Any]:
            url = base_url.rstrip("/") + "/" + path.lstrip("/")
            headers = {"User-Agent": "BFSI-Dynamic-Agent-Tool/1.0"}

            if raw_secret:
                if auth_type == "bearer":
                    headers["Authorization"] = f"Bearer {raw_secret}"
                elif auth_type == "api_key":
                    headers["X-API-Key"] = raw_secret

            params_dict = params or {}
            start_t = time.time()
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    if method == "POST":
                        resp = await client.post(url, json=params_dict, headers=headers)
                    else:
                        resp = await client.get(url, params=params_dict, headers=headers)
                    
                    latency = round((time.time() - start_t) * 1000.0, 2)
                    try:
                        data = resp.json()
                    except Exception:
                        data = resp.text

                    return {
                        "status": "success" if resp.is_success else "error",
                        "status_code": resp.status_code,
                        "data": data,
                        "latency_ms": latency
                    }
            except Exception as e:
                return {
                    "status": "error",
                    "status_code": 500,
                    "data": {"error": str(e)},
                    "latency_ms": round((time.time() - start_t) * 1000.0, 2)
                }

        return execute_tool

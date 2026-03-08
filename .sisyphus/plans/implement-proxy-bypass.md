# Implement CLIProxy Bypass Google Login

## Context
User has a specific feature request regarding the "Google Proxy" button inside the API Key settings: "Dùng Proxy Bypass là đăng nhập bằng google để sử dụng CLIProxy, sau đó dùng cli của gemini để chat đấy".
Currently, `GoogleGenAI` from `@google/genai` is used for chatting. The user wants the app to support `CLIProxy` (which bypasses rate limits by authenticating via a Google account directly instead of a developer API key).

## Technical Requirements
Since this is a client-side React app, we cannot easily run a local CLI natively from the browser. 
However, VJP26 seems to be running on an Express backend or the user might have a local `CLIProxy` running.
Wait, if they mean "đăng nhập bằng google để sử dụng CLIProxy", typically there are local reverse proxies (like `http://localhost:11434` for Ollama, or some `http://localhost:8080` for a Gemini proxy that uses Google OAuth cookies).
We need to:
1. When "Google Proxy" is clicked/toggled, it should switch the `baseUrl` of the API calls to point to the local CLIProxy (e.g. `http://localhost:8080` or a specific endpoint).
2. Actually, the `@google/genai` SDK allows overriding the base URL or it doesn't. If not, we might need to fallback to a direct `fetch` call to the proxy.
3. Let's find out how the user expects "đăng nhập bằng google" (Login with Google) to work. Usually, this means clicking the button opens an OAuth popup or tells the backend to start the CLIProxy auth flow.

Let's ask the user to clarify the proxy URL or if we just need to build the UI flow for it right now (e.g., clicking it opens a link to the CLI proxy auth page).

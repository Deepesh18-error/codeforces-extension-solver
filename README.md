# 🚀 Codeforces Extension Solver

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-API-000000?style=for-the-badge&logo=express&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-Powered-8E75B8?style=for-the-badge&logo=googlegemini&logoColor=white)
![Codeforces](https://img.shields.io/badge/Codeforces-Workflow-1F8ACB?style=for-the-badge)

> A local-first Chrome extension that brings assisted solving, automated submission, and retry debugging directly into the Codeforces workflow.

Codeforces Extension Solver is a Chrome extension plus local Node.js backend that adds assisted problem solving directly to Codeforces problem pages.

When a user opens a supported Codeforces problem, the extension injects a **Solve with AI** button, extracts the problem statement, asks a local backend to generate C++ source code, navigates to the submit page, fills the required submission fields, pastes the generated code into the Codeforces editor, and submits it.

The project also includes a retry/debug workflow for failed submissions. When Codeforces reports a final failed verdict such as `Wrong answer on test 2`, the extension can scrape the failed test data and request a corrected solution from the backend.

---

## ✨ Highlights

- 🧭 **Problem detection**
  - Supports problemset pages, contest pages, and gym pages.
  - Injects controls only on relevant Codeforces pages.

- 📄 **Problem context extraction**
  - Reads the problem title, statement, and sample tests from the page DOM.
  - Sends the extracted payload to the local backend.

- 🔐 **Local backend for model access**
  - Keeps the Gemini API key out of the browser extension.
  - Uses Express routes for solve and debug requests.
  - Uses `@google/genai` to call Gemini models.

- ⚙️ **Automated submit workflow**
  - Navigates to the correct Codeforces submit page.
  - Handles contest/gym problem indexes.
  - Handles the newer problemset submit page that requires a manually filled problem code such as `2232B`.
  - Pastes code into the Codeforces Ace editor through a page-context bridge script.

- 🧪 **Verdict tracking and retry**
  - Watches live Codeforces status updates without relying on URL changes.
  - Highlights tracked submissions while they are running.
  - Marks accepted/rejected final verdicts visually.
  - Scrapes the failed test case for retry prompts when possible.

---

## 🗂️ Project Structure

```text
codeforces-extension-solver/
|-- extension/
|   |-- manifest.json
|   |-- content_script.js
|   |-- background.js
|   |-- injector.js
|   |-- style.css
|   |-- popup.html
|   |-- popup.css
|   |-- popup.js
|   `-- icons/
|-- server/
|   |-- index.js
|   |-- package.json
|   |-- config/
|   |   `-- corsOptions.js
|   |-- routes/
|   |   `-- solveRoutes.js
|   `-- services/
|       |-- aiService.js
|       |-- promptBuilder.js
|       `-- responseParser.js
|-- allcode.py
|-- all_project_code.txt
`-- README.md
```

---

## 🧩 Extension Files

### 📦 `extension/manifest.json`

Defines the Chrome extension configuration:

- Manifest version 3.
- Extension name: `Drive Codeforces`.
- Background service worker: `background.js`.
- Content script: `content_script.js`.
- Page-context script exposed through `web_accessible_resources`: `injector.js`.
- Permissions:
  - `storage` for passing generated code and workflow state between pages.
  - `tabs` for navigating to submit pages.
- Host permissions:
  - Codeforces pages.
  - `http://localhost:3000/` for local backend requests.

### 🧠 `extension/content_script.js`

This is the main browser-side controller. It runs on Codeforces pages and decides what workflow should start based on the current URL.

Responsibilities:

- Inject the **Solve with AI** button on problem pages.
- Scrape problem data.
- Derive and store submit metadata.
- Fill the problem code on problemset submit pages.
- Wait for generated source code in `chrome.storage.local`.
- Dispatch a custom paste event for the page-context editor bridge.
- Click the submit button after the editor has been prepared.
- Watch Codeforces status tables for live verdict changes.
- Scrape failed-test information for retry/debug requests.

### 🔄 `extension/background.js`

The background service worker connects the content script to the backend.

Responsibilities:

- Receive solve/debug messages from `content_script.js`.
- Send `POST /api/solve` and `POST /api/debug` requests to the local server.
- Store successful generated source in `chrome.storage.local`.
- Store generation errors separately so they are shown to the user instead of being pasted into the editor.
- Navigate contest/gym pages to the provided submit URL when needed.

### 📝 `extension/injector.js`

Codeforces uses an Ace editor for source input. A normal content script runs in Chrome's isolated world, so it cannot safely access the page's `window.ace` object directly.

`injector.js` is injected into the page context and listens for:

```text
pasteSolutionIntoCodeforcesEditor
```

When the event is received, it calls:

```js
window.ace.edit('editor').setValue(code, 1)
```

This is the bridge that makes automatic code insertion work.

### 🎨 `extension/style.css`

Adds visual states for the submission table:

- tracking while the verdict is live
- accepted final result
- rejected final result
- retry button placement
- copy-input button styling

### 🪟 Popup Files

`popup.html`, `popup.css`, and `popup.js` define the small toolbar popup. It is currently informational and can be extended later for settings such as model choice, language preference, or auto-submit toggles.

---

## 🖥️ Backend Files

### 🚦 `server/index.js`

Starts the Express server.

Key behavior:

- Loads `.env` through `dotenv`.
- Applies CORS settings.
- Parses JSON request bodies.
- Serves a health-check route at `/`.
- Mounts API routes at `/api`.

### 🛣️ `server/routes/solveRoutes.js`

Defines the API endpoints used by the extension.

#### ⚡ `POST /api/solve`

Receives initial problem data:

```json
{
  "title": "Cake Leveling",
  "statement": "...",
  "samples": [
    {
      "input": "...",
      "output": "..."
    }
  ]
}
```

Returns:

```json
{
  "solution": "#include <bits/stdc++.h>\n..."
}
```

#### 🛠️ `POST /api/debug`

Receives the original problem, previous source code, and failed-test details.

Returns a corrected C++ solution.

### 🧾 `server/services/promptBuilder.js`

Builds prompts for:

- initial solving
- retry/debug solving

The initial prompt asks for a complete runnable C++ program. The debug prompt includes the previous failed code and the exact failed-test data when available.

### 🤖 `server/services/aiService.js`

Calls Gemini through `@google/genai`.

Default model order:

```text
gemini-3.5-flash
gemini-2.5-pro
gemini-2.5-flash
```

If one model fails with an unavailable-model or quota-style error, the service tries the next configured model.

You can override the model list in `.env`:

```env
GEMINI_MODEL=gemini-2.5-pro
```

or:

```env
GEMINI_MODELS=gemini-3.5-flash,gemini-2.5-pro,gemini-2.5-flash
```

### 🔍 `server/services/responseParser.js`

Extracts C++ source from model output.

It prefers fenced C++ blocks such as:

````text
```cpp
#include <bits/stdc++.h>
...
```
````

Then falls back to generic markdown code blocks, and finally raw text.

---

## 🔁 Workflows

### 🚀 Initial Solve Workflow

```text
Problem page
-> content_script.js injects Solve with AI
-> user clicks button
-> content_script.js scrapes problem data
-> content_script.js stores submit context
-> background.js sends POST /api/solve
-> backend generates C++ source
-> background.js stores solutionToPaste
-> Codeforces submit page opens
-> content_script.js prepares submit form
-> injector.js pastes code into Ace editor
-> content_script.js submits the form
-> Codeforces redirects to status/my submissions
```

### 🧮 Problemset Submit Workflow

Problemset pages now require a problem code on the submit page.

Example problem URL:

```text
https://codeforces.com/problemset/problem/2232/B
```

The extension derives:

```text
contestId = 2232
problemIndex = B
problemCode = 2232B
```

On:

```text
https://codeforces.com/problemset/submit
```

the extension fills the problem-code field before pasting source code.

### 🏁 Contest and Gym Submit Workflow

Contest and gym pages use problem indexes such as `A`, `B`, or `F1`.

Example:

```text
https://codeforces.com/contest/2118/problem/A
```

The extension navigates to:

```text
https://codeforces.com/contest/2118/submit?submittedProblemIndex=A
```

### 📡 Verdict Tracking Workflow

Codeforces updates verdicts in real time without changing the URL:

```text
In queue
-> Running on test 1
-> Running on test 2
-> Wrong answer on test 2
```

The extension watches the status table with a `MutationObserver`, tracks the relevant submission row, and reacts only when the verdict becomes final.

### 🛠️ Retry Debug Workflow

```text
Final failed verdict
-> extension reads failed test number
-> extension requests judgement data from /data/submitSource
-> extension extracts input/output/answer/checker log
-> Retry with AI button appears
-> user clicks Retry with AI
-> extension sends debug context to backend
-> backend generates corrected source
-> corrected source is pasted and submitted
```

The failed-test number matters. If Codeforces says `Wrong answer on test 2`, the extension should use test `#2` data, not the first test shown in the judgement protocol.

---

## ⚙️ Setup

### 1. Install Backend Dependencies

```powershell
cd server
npm install
```

### 2. Configure Environment Variables

Create:

```text
server/.env
```

Add:

```env
GEMINI_API_KEY=your_api_key_here
```

Optional:

```env
PORT=3000
GEMINI_MODELS=gemini-3.5-flash,gemini-2.5-pro,gemini-2.5-flash
```

Do not commit `.env`.

### 3. Start the Backend

```powershell
cd server
npm start
```

Expected output:

```text
Server is running on port 3000
```

### 4. Load the Chrome Extension

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click **Load unpacked**.
4. Select the `extension/` folder.
5. Open a Codeforces problem page.

After changing extension files, reload the extension and refresh any already-open Codeforces tabs.

---

## 🧯 Common Issues

### 🔄 `Cannot read properties of undefined (reading 'local')`

This usually means the extension was reloaded while the Codeforces tab was already open. Refresh the Codeforces page after reloading the extension.

### 🧱 Backend returns `500`

Check the server terminal. Common causes:

- invalid Gemini model id
- missing or invalid `GEMINI_API_KEY`
- rate limits or quota issues
- network failure

### 📝 Code is not pasted into the editor

Check whether:

- the extension was reloaded after code changes
- the Codeforces submit page has fully loaded
- `injector.js` is listed in `web_accessible_resources`
- the Ace editor element id is still `editor`

### 🧮 Problemset submit page has a blank problem field

This is expected on newer Codeforces problemset submit pages. The extension derives the problem code from the original problem URL and fills it automatically.

---

## 🔐 Security Notes

- The Gemini API key belongs in `server/.env`, not in extension files.
- `allcode.py` intentionally excludes `.env` from `all_project_code.txt`.
- The backend currently accepts requests from `chrome-extension://` origins and no-origin tools such as Postman. For stricter production use, restrict CORS to your extension id.

---

## 🛠️ Development Notes

- Reload the Chrome extension after changing files in `extension/`.
- Restart the backend after changing server code or `.env`.
- Keep `node_modules/` and `.env` out of source control.
- Use `node --check` for quick JavaScript syntax validation.
- Use `git diff --check` before committing to catch whitespace problems.

---

## 🚧 Current Limitations

- The problem scraper depends on Codeforces DOM structure and may need updates if Codeforces changes markup.
- The generated code is only as reliable as the model response and prompt context.
- The retry workflow depends on Codeforces judgement data being available to the logged-in user.
- CORS is suitable for local development but should be tightened for distribution.

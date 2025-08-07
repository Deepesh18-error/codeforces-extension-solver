# 🚀 Codeforces Extension Solver

**Streamline competitive programming with one-click AI-powered problem-solving, automated submission, and intelligent debugging.**

---

## 🌟 Core Features

- ✨ **One-Click AI Solution**  
  Generate a complete C++ solution for any Codeforces problem with a single click.

- 🤖 **Automated Submission**  
  Automatically navigates to the submit page, pastes the generated code, and submits it for you.

- 🧠 **Intelligent Debugging Loop**  
  - Detects failed submissions on the status page.  
  - Scrapes the exact test case that caused the failure (input, your output, expected output).  
  - Sends the full failure context to the AI and generates a debugged solution with one click.

- 🔒 **Secure Backend Communication**  
  Your AI API key is safely stored on a **local server** and is **never exposed** in the browser.

---

## 🧱 Phase 1: Basic Building Structure (The Chrome Extension)

### 📄 `manifest.json`
Defines core identity and permissions of the extension:
- `"name": "Drive Codeforces"` – The official name of our extension.
- `"version": "1.0.0"` – The current version, essential for managing updates.
- `"description": "..."` – A short, user-facing summary of the extension's purpose.
- `"icons": { ... }` – Defines the set of icons that will represent our extension in the browser toolbar, extensions page, and elsewhere.

### 🛡️ Permissions
- `"storage"` – Grants access to the chrome.storage API. This is essential for passing the AI-generated solution from the background.js script to the content_script.js.
- `"tabs"` – Allows the extension to interact with the browser's tabs, specifically to navigate the user from the problem page to the submit page automatically.
- **URL Matching** –This broad permission is what allows the extension to be so versatile. It can inject the "Solve" button on a standard Problemset page 
           (/problemset/problem/...), a high-stakes Contest page (/contest/.../problem/...), or a practice Gym page. It also ensures the agent can operate on the /status and /my pages, which is essential for the debugging loop in Phase 4.

---

### 🧭 Control Panel (`popup.html`, `popup.css`, `popup.js`)
The user-facing interface that appears when you click the extension icon:
- `popup.html` – Defines the structure (text, titles).
- `popup.css` – Defines the style (colors, fonts, layout).
- `popup.js` – Handles any logic inside the popup (currently informational, but could hold future settings).

---

### 🕵️ Field Agent (`content_script.js`)
his is the workhorse that is injected directly onto Codeforces pages. Its role is dynamic and context-aware.
- On problem pages:
  - Injects "Solve with AI" button.
  - Scrapes problem data (title, statement, samples).
  - Sends data to `background.js`.

---

### 🧠 Headquarters (`background.js`)
This is the persistent, invisible command center of the extension. It orchestrates all major operations.
- Manages communication between content script and backend.
- Maintains extension state.
- Handles solution generation, storage, and message routing.

---

## 🖥️ Phase 2: The Headquarters (Backend Server)

A **Node.js + Express** server that securely handles AI communication.Its primary purpose is to protect the sensitive AI API key and to process requests in a structured, secure manner.

### 🗂️ Web Framework & Scaffolding
- This is the foundational structure of our server, built using Node.js and the Express framework.
-  To create a robust, organized application that can listen for and manage incoming network traffic


---

### 🗂️ Structure & Routing
- To define clear, predictable, and specialized methods of communication between the frontend and backend.
- Communication Method: We use the POST method for our requests. This is essential because we need to send a complex JSON object (containing the problem title, statement, samples, or full debug context) from the extension to the server. A GET request is not suitable for sending large bodies of data.
- Routes defined in `server/routes/solveRoutes.js`:
  - `POST /api/solve` – This is the primary endpoint for the initial workflow. It is designed to receive a problem's description and return a first-attempt solution.
  - `POST /api/debug` – This is a second, more powerful endpoint designed specifically for the debugging loop. It expects a much richer payload, including the failed code and the test case data, to generate a corrected solution.

---

### 🔐 Security & Validation

#### 🛑 CORS Policy (`server/config/corsOptions.js`)
- To act as a strict security bouncer, ensuring that only our Chrome extension is allowed to make requests.
- Cross-Origin Resource Sharing (CORS) is a browser security feature that prevents a web page from making requests to a different domain than the one it came from. Our server is configured with a custom CORS policy that checks the Origin header of every incoming request.
  - It will only accept requests originating from a `chrome-extension://` (our extension),those with no origin (like Postman for testing). This effectively blocks any random website or malicious script from accessing our AI service.

---

#### 🧹 Data Validation
- To prevent errors and ensure that every request contains the necessary data before we process it or send it to the AI.
  - `problem.title`, `problem.statement`, `failedAttempt.code`, etc.
- If a request is missing data, the server immediately responds with a 400 Bad Request error, preventing wasted AI calls and making debugging easier.

---

## 🧙 Phase 3: Consulting the AI "brain" of the operation. 

### 📝 Prompt Engineering (`server/services/promptBuilder.js`)
-  buildOptimalPrompt: For the initial solve, it combines several key elements:
- Sets AI persona: *"World-class competitive programmer"*
- Sends problem data with explicit formatting instructions.
- Rich Context: Structures the problem title, statement, and samples for clarity.
- Markdown code block enforced for consistent output.

### 🌐 AI Communicator (`server/services/aiService.js`)
- Takes a fully-formed prompt as input.
- Initializes the GoogleGenerativeAI client with the API key from .env.
- Calls the generateContent function of the AI model.
- Includes robust error handling for API failures or safety-blocked responses.

### 🔍 Response Parser (`server/services/responseParser.js`)
- Extracts code from AI response:
  - Prefers ```cpp blocks.
  - Falls back to pattern recognition (`#include`, etc.) if needed.
  - This resilience ensures the system works even if the AI's output format changes slightly.

---

### 🧩 Code Injection Workflow
**content_script.js ➔ injector.js**
1. On submit page load: Preparation `initSubmitPageLogic()`
   - When the Codeforces submit page loads, this function kicks in.
   - It immediately calls injectPasterScript() to ensure our injector.js is ready and waiting inside the page's context.
2. Receiving the Code (dispatchPasteEvent)
   - content_script.js listens for changes to chrome.storage.local.
   - When it detects that solutionToPaste has been set by the background script, it calls dispatchPasteEvent().
   - This function creates and dispatches a Custom Event named pasteSolutionIntoCodeforcesEditor, attaching the solution code as its detail. This is the "broadcast signal."
3. The Injection (`injector.js`):
   - The injector.js script catches this custom event.
   - It then accesses the page's window.ace editor object and uses its .setValue() method to paste the code.
4. Automated Submission (waitForElement):
   - After dispatching the paste event, the dispatchPasteEvent function uses the waitForElement helper.
   - It looks for the input[type="submit"] button.
5. injector.js (The Receiver):
   - Lives in the Page's World: This script is injected directly into the web page, so it has full access to window.ace.
   - Catches the Signal: It listens for the specific custom event broadcast by the content script.
   - Executes the Command: When it catches the signal, it grabs the code from the event details and uses the window.ace.edit('editor').setValue() API to paste the    solution directly into the editor.

---


## 🛠️ Phase 4: Full Debugging Loop

### 🧪 Verdict & Test Case Scraping (`content_script.js`)
1. Activation (`initStatusPageLogic`):
   - When a status page loads, this function initializes a MutationObserver.
   - is observer watches the submission table for any changes (e.g., a verdict updating from "Running..." to "Wrong answer").    
2. Identifying the Target (checkForNewSubmission):
   - The script identifies the topmost row in the submission table (tr[data-submission-id]) as the most recent attempt.
   - It attaches a "tracking" class to this row, visually highlighting it while the verdict is live.
3. Verdict Watching & Final Highlighting (monitorTrackedSubmission):
   - The MutationObserver triggers this function whenever the verdict text changes.
   - Once the verdict is final (no longer "Running" or "In queue"), the script analyzes the result and updates the highlight:
   - ✅ If Accepted: The row's classes are updated to cf-highlighter-accepted, changing the border to a vibrant green and the background to a light green. The mission is successful.
   - ❌ If Rejected: The classes are updated to cf-highlighter-rejected, changing the border to a stark red and the background to a light red. This signals that a failure has occurred and triggers the next phase of the investigation.
4. Forensic Scraping (startPhase2_DataAcquisition):
   - If the verdict is "Wrong answer on test X" or similar, this function is triggered.
   - It makes an authenticated fetch request to a hidden Codeforces data endpoint (`/data/submitSource`).
   - The helper startPhase3_ExtractFromJson then parses this JSON to extract the crucial evidence: the **Input**, the **Your Output**, **Expected Output** and the **Checker Log**.
5. Opening the Debug Door (startPhase4_FinalUIUpdate):
   - With the evidence gathered, this function injects the "Retry with AI" button next to the failed submission row.
   - Crucially, it attaches the scraped failure data directly to this button's onclick handler.
---

### 🧠 Debugging AI Request
1. Assembling the Debug Package (handleRetryClick):
   - When the user clicks "Retry with AI," this function assembles a complete "`debug package.`"
   - It retrieves the original problem and the failed code from chrome.storage.
   - It combines them with the failure details (**Input**, **Your Output**, **Expected Output**) that were attached to the button.
   - It sends this entire package to the `background.js` with the mission type requestDebugSolution.
2. Requesting the Fix (background.js & solveRoutes.js):
   - The `background.js` script receives the package and makes a POST request to the backend's `/api/debug endpoint`.
3. Generating the Smarter Prompt (promptBuilder.js):
   - On the backend, buildDebugPrompt uses the full context to create a highly specific prompt.
   - It explicitly tells the AI: "Your last attempt failed. Here is the code you wrote, here is the exact input that broke it, here was your wrong output, and here is what the output should have been. Find the bug and fix it."
4. Closing the Loop:
   - The AI provides a new, corrected solution.
   - This solution travels back through the same pipeline as a normal request, is pasted into the editor, and is automatically re-submitted, thus completing the full debugging loop.
---

### index.js: The Server's Entry Point
- This file is the master switch and central nervous system for the entire backend server.
1. Initialization and Environment:
   - require('dotenv').config(): This is the very first thing the server does. It loads all the secret variables (like our GEMINI_API_KEY) from the .env file into the application's environment.
   - const app = express(): This line creates an instance of the Express application, which is the foundation of our entire server.
2. Middleware Setup (The Server's Rulebook):
   - app.use(cors(corsOptions)): This is the security guard. It applies our custom Cross-Origin Resource Sharing (CORS) rules to every request, ensuring only our extension can communicate with the server.
   - app.use(express.json()): This is the translator. It automatically parses the body of incoming POST requests if they are in JSON format.
3. API Routing:
   - app.use(`'/api', apiRoutes`): This is the traffic director. It tells the server that any request whose URL starts with /api (e.g., /api/solve or /api/debug) should be handled by the logic defined in our solveRoutes.js file.
   - app.get('/'): This is a simple "health check" route. If you navigate to http://localhost:3000 in your browser, it will respond with "Backend Server is alive!", providing an easy way to confirm that the server is running.

---

### corsOptions.js: The Security Bouncer
- To create a strict, custom security policy that dictates exactly who is allowed to send requests to our server.
- if (!origin ...): This part of the logic allows requests that have no origin. This is useful for development tools like Postman or for server-to-server communication where the concept of an "origin" doesn't apply.
- ... || origin.startsWith('chrome-extension://'): This is the most important rule. It explicitly whitelists any request that comes from a URL starting with chrome-extension://. This means any Chrome extension (including ours) is allowed to communicate with the server.
- else { callback(new Error(...)) }: If a request comes from any other origin (e.g., a random website like http://evil-website.com), this else block is triggered. The server will reject the request with a CORS error, effectively blocking it

---

## 🧩 Workflows Summary

### 🚀 Initial Solve Workflow
- `User Clicks "Solve with AI" ➔ content_script (scrapes data) ➔ background.js ➔ POST /api/solve (backend) ➔ Gemini API ➔ Backend (gets solution) ➔ background.js (stores solution) ➔ content_script (on Submit Page) ➔ injector.js (pastes code) ➔ content_script (clicks "Submit")`

### 🚀 The Full Debugging Loop Workflow
- `Submission Fails on Status Page ➔ content_script (detects failure) ➔ content_script (scrapes test case) ➔ content_script (injects "Retry" button) ➔ User Clicks "Retry"  content_script (assembles debug package) ➔ background.js ➔ POST /api/debug (backend) ➔ Gemini API (gets corrected solution) ➔ backend (sends back code) ➔ background.js (stores new solution) ➔ content_script (on Submit Page) ➔ injector.js (pastes new code) ➔ content_script (clicks "Submit")`

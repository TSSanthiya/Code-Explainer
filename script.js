// ============================================
//  PASTE YOUR GROQ API KEY BELOW
//  Get free key from: console.groq.com
//  Key starts with: gsk_...
// ============================================
const API_KEY = "";
// ============================================

let selectedLang = "Python";

// ---- Language Button Click ----
document.getElementById("langSelect").querySelectorAll(".lang-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".lang-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedLang = btn.dataset.lang;
  });
});

// ---- Live Line and Char Count ----
const codeInput = document.getElementById("codeInput");
codeInput.addEventListener("input", () => {
  const text = codeInput.value;
  document.getElementById("lineCount").textContent = text ? text.split("\n").length : 0;
  document.getElementById("charCount").textContent = text.length;
});

// ---- Load Sample Code ----
function loadSample() {
  const samples = {
    Python: `def binary_search(arr, target):\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1\n\nresult = binary_search([1, 3, 5, 7, 9], 7)\nprint(result)`,
    JavaScript: `async function getUser(id) {\n  const res = await fetch('/api/users/' + id);\n  const data = await res.json();\n  return data;\n}`,
    Java: `public class Hello {\n  public static void main(String[] args) {\n    System.out.println("Hello World");\n  }\n}`,
    SQL: `SELECT name, COUNT(*) as total\nFROM orders\nGROUP BY name\nORDER BY total DESC;`,
  };
  codeInput.value = samples[selectedLang] || samples["Python"];
  codeInput.dispatchEvent(new Event("input"));
}

// ---- Switch Tabs ----
function showTab(tab) {
  const tabs = ["explain", "steps", "tips"];
  document.querySelectorAll(".tab-btn").forEach((btn, i) => {
    btn.classList.toggle("active", tabs[i] === tab);
  });
  document.getElementById("tabExplain").style.display = tab === "explain" ? "flex" : "none";
  document.getElementById("tabSteps").style.display   = tab === "steps"   ? "flex" : "none";
  document.getElementById("tabTips").style.display    = tab === "tips"    ? "flex" : "none";
}

// ---- Create a Result Card ----
function makeCard(dotClass, title, content) {
  const div = document.createElement("div");
  div.className = "result-card";
  div.innerHTML = `
    <div class="card-header">
      <div class="card-dot ${dotClass}"></div>
      <span class="card-title">${title}</span>
    </div>
    <div class="card-body">
      ${content.replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\n/g, "<br>")}
    </div>
  `;
  return div;
}

// ---- Main Function: Explain Code ----
async function explainCode() {

  const code = codeInput.value.trim();

  // Check if user pasted code
  if (!code) {
    alert("Please paste some code first!");
    return;
  }

  // Check if API key is added
  if (API_KEY === "paste-your-groq-key-here" || API_KEY === "") {
    alert("Please add your Groq API key in script.js!\nReplace: paste-your-groq-key-here\nWith your real key from console.groq.com");
    return;
  }

  // Get all UI elements
  const btn          = document.getElementById("explainBtn");
  const emptyState   = document.getElementById("emptyState");
  const loadingState = document.getElementById("loadingState");
  const resultArea   = document.getElementById("resultArea");
  const loadBar      = document.getElementById("loadBar");
  const loadMsg      = document.getElementById("loadMsg");

  // Show loading screen
  btn.disabled = true;
  emptyState.style.display   = "none";
  loadingState.style.display = "flex";
  resultArea.classList.remove("visible");

  // Loading animation
  const steps = [
    ["Reading your code...", 20],
    ["Understanding the logic...", 50],
    ["Writing explanation...", 75],
    ["Almost done...", 90],
  ];
  let i = 0;
  const timer = setInterval(() => {
    if (i < steps.length) {
      loadMsg.textContent = steps[i][0];
      loadBar.style.width = steps[i][1] + "%";
      i++;
    }
  }, 800);

  // Get explanation level
  const level = document.getElementById("modeSelect").value;

  // Build the prompt
  const prompt = `Explain this ${selectedLang} code for a ${level} programmer. Use this exact structure:

[EXPLAIN]
Write 2-3 sentences about what the code does overall.

[STEPS]
Write a numbered step-by-step breakdown of each important part.

[TIPS]
Write 2-3 bullet point tips or improvements.

Here is the code:
${code}`;

  try {

    console.log("Sending to Groq API...");

    // Call Groq API
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + API_KEY
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1000
      })
    });

    console.log("Response status:", res.status);

    // Handle errors
    if (!res.ok) {
      const errorData = await res.json();
      console.log("Error details:", errorData);
      if (res.status === 401) {
        throw new Error("Invalid API Key! Check your key in script.js");
      } else if (res.status === 429) {
        throw new Error("Too many requests! Wait a moment and try again.");
      } else {
        throw new Error("Error " + res.status + ": " + (errorData.error?.message || "Something went wrong"));
      }
    }

    const data = await res.json();
    console.log("Success! Groq responded.");

    clearInterval(timer);
    loadBar.style.width = "100%";

    // Get text from Groq response
    const raw = data.choices?.[0]?.message?.content || "";

    if (!raw) {
      throw new Error("Empty response received. Please try again.");
    }

    // Split into 3 sections
    const explainMatch = raw.match(/\[EXPLAIN\]([\s\S]*?)(?=\[STEPS\]|$)/);
    const stepsMatch   = raw.match(/\[STEPS\]([\s\S]*?)(?=\[TIPS\]|$)/);
    const tipsMatch    = raw.match(/\[TIPS\]([\s\S]*?)$/);

    const explainText = explainMatch ? explainMatch[1].trim() : raw;
    const stepsText   = stepsMatch   ? stepsMatch[1].trim()   : "No steps generated.";
    const tipsText    = tipsMatch    ? tipsMatch[1].trim()    : "No tips generated.";

    // Clear old results
    document.getElementById("tabExplain").innerHTML = "";
    document.getElementById("tabSteps").innerHTML   = "";
    document.getElementById("tabTips").innerHTML    = "";

    // Show new results
    document.getElementById("tabExplain").appendChild(makeCard("dot-purple", "What This Code Does", explainText));
    document.getElementById("tabSteps").appendChild(makeCard("dot-green",   "Step-by-Step Breakdown", stepsText));
    document.getElementById("tabTips").appendChild(makeCard("dot-amber",    "Tips & Suggestions", tipsText));

    // Hide loading show results
    setTimeout(() => {
      loadingState.style.display = "none";
      resultArea.classList.add("visible");
      btn.disabled = false;
    }, 400);

  } catch (err) {
    clearInterval(timer);
    console.error("Error:", err.message);
    loadingState.style.display = "none";
    emptyState.style.display   = "flex";
    emptyState.innerHTML = `
      <div class="empty-icon">⚠️</div>
      <p style="color:#f06a6a; font-size:14px; line-height:1.8;">
        ❌ ${err.message}<br><br>
        <span style="color:#7a7d8e; font-size:12px;">
          Press F12 and click Console tab to see full error
        </span>
      </p>
    `;
    btn.disabled = false;
  }
}
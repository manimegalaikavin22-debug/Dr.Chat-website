// DOM references
const form = document.getElementById("composer");
const input = document.getElementById("input");
const messages = document.getElementById("messages");
const ack = document.getElementById("ack");
const micBtn = document.getElementById("micBtn");
const ttsCheckbox = document.getElementById("tts");

// Auto-scroll to bottom
function autoScroll() {
  messages.scrollTo({
    top: messages.scrollHeight,
    behavior: "smooth",
  });
}

// Append messages
function appendMessage(role, text) {
  const li = document.createElement("li");
  li.className = `message ${role}`;

  const paragraphs = String(text).split(/\n\s*\n|\n/);
  paragraphs.forEach((p) => {
    p = p.trim();
    if (!p) return;
    const pElem = document.createElement("p");
    if (p.startsWith("⚠️")) {
      pElem.style.color = "#ff4d4d";
      pElem.style.fontWeight = "bold";
    }
    pElem.textContent = p;
    li.appendChild(pElem);
  });

  messages.appendChild(li);
  autoScroll();
}

/* --- Speech Recognition --- */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition, isRecognizing = false;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = "en-IN";
  recognition.interimResults = false;

  recognition.onstart = () => {
    isRecognizing = true;
    micBtn.textContent = "⏹";
  };

  recognition.onend = () => {
    isRecognizing = false;
    micBtn.textContent = "🎤";
    if (input.value.trim()) sendMessage(input.value.trim());
  };

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    input.value = text;
  };
} else {
  micBtn.disabled = true;
}

/* --- Mic button --- */
micBtn.addEventListener("click", () => {
  if (!recognition) return;
  if (isRecognizing) recognition.stop();
  else recognition.start();
});

/* --- Text-to-Speech --- */
function speak(text) {
  if (!ttsCheckbox.checked) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  speechSynthesis.speak(utter);
}

/* --- Send message with step-by-step bot reply --- */
async function sendMessage(text) {
  if (!text) return;
  appendMessage("user", text);
  input.value = "";

  const loading = document.createElement("li");
  loading.className = "message assistant";
  loading.textContent = "Thinking...";
  messages.appendChild(loading);
  autoScroll();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });

    const data = await res.json();
    messages.removeChild(loading);

    const assistantNode = document.createElement("li");
    assistantNode.className = "message assistant";
    messages.appendChild(assistantNode);

    const parts = String(data.reply)
      .split(/\n\s*\n|\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    let idx = 0;
    const revealInterval = 350; // speed of message reveal
    const interval = setInterval(() => {
      const p = document.createElement("p");
      p.textContent = parts[idx];
      assistantNode.appendChild(p);
      autoScroll();
      speak(parts[idx]);
      idx++;
      if (idx >= parts.length) clearInterval(interval);
    }, revealInterval);
  } catch (err) {
    if (messages.contains(loading)) messages.removeChild(loading);
    appendMessage("assistant", "⚠️ Could not contact server.");
    console.error(err);
  }
}

/* --- Form submission --- */
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!ack.checked)
    return alert("Please acknowledge this is informational only.");
  const text = input.value.trim();
  if (!text) return;
  if (isRecognizing && recognition) recognition.stop();
  sendMessage(text);
});

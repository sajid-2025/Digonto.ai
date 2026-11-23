const chatBox = document.getElementById("chatBox");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");

const DEFAULT_MODEL = "openrouter/free";

const SYSTEM_PROMPT = {
    role: "system",
    content:
        "You are Digonto.ai, a helpful, warm, clear, and intelligent Bangladeshi AI assistant. " +
        "By default, reply in natural, clear Bengali (Bangla). However, if the user asks in English, requests an English response, or when English technical terms/explanations are needed for clarity, use English smoothly or mix naturally as helpful."
};

let chatHistory = [SYSTEM_PROMPT];

function autoResizeTextarea() {
    userInput.style.height = "auto";
    userInput.style.height = `${Math.min(userInput.scrollHeight, 140)}px`;
}

function removeWelcomeCard() {
    const welcome = document.getElementById("welcomeCard");
    if (welcome) welcome.remove();
}

function appendMessage(text, type = "ai", isError = false) {
    removeWelcomeCard();

    const div = document.createElement("div");
    div.className = `msg ${type === "user" ? "msg-user" : "msg-ai"} ${isError ? "msg-error" : ""}`;
    div.textContent = text;

    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    return div;
}

function resetChat() {
    chatHistory = [SYSTEM_PROMPT];
    chatBox.innerHTML = `
        <div class="welcome-card" id="welcomeCard">
            <span class="welcome-tag">নতুন সেশন শুরু</span>
            <h2>Digonto.ai প্রস্তুত</h2>
            <p>সাধারণত বাংলায় কথা বলি, আর প্রয়োজন হলে ইংরেজিতেও সাহায্য করি।</p>
            <div class="starter-grid">
                <button class="starter-chip" type="button" data-prompt="আজকের দিনটা সুন্দরভাবে সাজানোর ৩টি সহজ টিপস দাও।">
                    দিনের রুটিন টিপস
                </button>
                <button class="starter-chip" type="button" data-prompt="Explain web development simply in English and Bangla.">
                    ওয়েব ডেভেলপমেন্ট সহজ ব্যাখ্যা
                </button>
                <button class="starter-chip" type="button" data-prompt="একটি ছোট ও অনুপ্রেরণাদায়ক গল্প শোনাও।">
                    ছোট অনুপ্রেরণার গল্প
                </button>
            </div>
        </div>
    `;
    bindStarterChips();
    userInput.value = "";
    autoResizeTextarea();
    userInput.focus();
}

async function sendMessage(customText = null) {
    const text = (typeof customText === "string" ? customText : userInput.value).trim();
    if (!text) return;

    appendMessage(text, "user");

    if (typeof customText !== "string") {
        userInput.value = "";
        autoResizeTextarea();
    }

    sendBtn.disabled = true;
    chatHistory.push({ role: "user", content: text });

    const loadingBubble = appendMessage("Digonto.ai ভাবছে...", "ai");

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: DEFAULT_MODEL,
                messages: chatHistory
            })
        });

        const data = await response.json();

        if (response.ok && data.choices?.[0]?.message?.content) {
            const reply = data.choices[0].message.content.trim();
            loadingBubble.textContent = reply;
            chatHistory.push({ role: "assistant", content: reply });
        } else {
            loadingBubble.textContent = `দুঃখিত, উত্তর আনা যায়নি: ${data.error || "অজানা সমস্যা"}`;
            loadingBubble.classList.add("msg-error");
            chatHistory.pop();
        }
    } catch (err) {
        loadingBubble.textContent = "সার্ভারের সাথে সংযোগ করা যাচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।";
        loadingBubble.classList.add("msg-error");
        chatHistory.pop();
    } finally {
        sendBtn.disabled = false;
        chatBox.scrollTop = chatBox.scrollHeight;
        userInput.focus();
    }
}

function bindStarterChips() {
    document.querySelectorAll(".starter-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
            const prompt = chip.getAttribute("data-prompt");
            if (prompt) sendMessage(prompt);
        });
    });
}

userInput.addEventListener("input", autoResizeTextarea);

userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

sendBtn.addEventListener("click", () => sendMessage());
clearBtn.addEventListener("click", resetChat);

bindStarterChips();
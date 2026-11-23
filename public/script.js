const chatBox = document.getElementById("chatBox");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");

const DEFAULT_MODEL = "openrouter/free";

const SYSTEM_PROMPT = {
    role: "system",
    content:
        "You are Digonto.ai, a helpful, warm, clear, and intelligent Bangladeshi AI assistant. " +
        "By default, reply in natural, clear Bengali (Bangla). However, if the user asks in English, requests an English response, or when English technical terms/explanations are needed for clarity, use English smoothly or mix naturally as helpful. " +
        "Format responses cleanly using short paragraphs, bullet points, and bold text (**text**) where helpful."
};

let chatHistory = [SYSTEM_PROMPT];

function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatInline(text) {
    let formatted = escapeHtml(text);

    // Inline code: `code`
    formatted = formatted.replace(/`([^`\n]+)`/g, "<code>$1</code>");

    // Bold: **text**
    formatted = formatted.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");

    // Italic: *text* (single asterisk not adjacent to another asterisk)
    formatted = formatted.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");

    return formatted;
}

function renderMarkdown(rawText) {
    const normalized = rawText.replace(/\r\n/g, "\n").trim();
    if (!normalized) return "";

    // Extract fenced code blocks (```...```) first
    const codeBlocks = [];
    const withPlaceholders = normalized.replace(/```([\w-]*)\n?([\s\S]*?)```/g, (_, _lang, code) => {
        const index = codeBlocks.length;
        codeBlocks.push(`<pre><code>${escapeHtml(code.trimEnd())}</code></pre>`);
        return `\n@@CODEBLOCK_${index}@@\n`;
    });

    const blocks = withPlaceholders.split(/\n{2,}/);

    const htmlParts = blocks.map((block) => {
        const trimmed = block.trim();
        if (!trimmed) return "";

        const codeMatch = trimmed.match(/^@@CODEBLOCK_(\d+)@@$/);
        if (codeMatch) {
            return codeBlocks[Number(codeMatch[1])] || "";
        }

        const lines = trimmed.split("\n");

        // Bullet list block (- or * at start of lines)
        const isBulletList = lines.every((line) => /^\s*[-*]\s+/.test(line));
        if (isBulletList) {
            const items = lines
                .map((line) => `<li>${formatInline(line.replace(/^\s*[-*]\s+/, ""))}</li>`)
                .join("");
            return `<ul>${items}</ul>`;
        }

        // Numbered list block (1. 2. ...)
        const isNumberedList = lines.every((line) => /^\s*\d+\.\s+/.test(line));
        if (isNumberedList) {
            const items = lines
                .map((line) => `<li>${formatInline(line.replace(/^\s*\d+\.\s+/, ""))}</li>`)
                .join("");
            return `<ol>${items}</ol>`;
        }

        // Regular paragraph with line breaks
        const paragraphLines = lines.map((line) => formatInline(line)).join("<br>");
        return `<p>${paragraphLines}</p>`;
    });

    return htmlParts.join("");
}

function autoResizeTextarea() {
    userInput.style.height = "auto";
    userInput.style.height = `${Math.min(userInput.scrollHeight, 130)}px`;
}

function removeWelcomeCard() {
    const welcome = document.getElementById("welcomeCard");
    if (welcome) welcome.remove();
}

function appendMessage(text, type = "ai", isError = false) {
    removeWelcomeCard();

    const div = document.createElement("div");
    div.className = `msg ${type === "user" ? "msg-user" : "msg-ai"} ${isError ? "msg-error" : ""}`;

    if (type === "user") {
        div.textContent = text;
    } else {
        div.innerHTML = renderMarkdown(text);
    }

    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    return div;
}

function setAiMessageContent(div, text, isError = false) {
    div.classList.toggle("msg-error", isError);
    div.innerHTML = renderMarkdown(text);
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
            setAiMessageContent(loadingBubble, reply, false);
            chatHistory.push({ role: "assistant", content: reply });
        } else {
            setAiMessageContent(loadingBubble, `দুঃখিত, উত্তর আনা যায়নি: ${data.error || "অজানা সমস্যা"}`, true);
            chatHistory.pop();
        }
    } catch (err) {
        setAiMessageContent(loadingBubble, "সার্ভারের সাথে সংযোগ করা যাচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।", true);
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

/**
 * Chatbot Application
 * Handles user interactions, API communication, and UI updates
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    USE_MOCK_BACKEND: false,
    API_URL: 'http://20.168.112.204:8000/rag/query',
    FEEDBACK_API_URL: '/api/feedback',
    API_LANG: 'en',
    SCROLL_THRESHOLD: 100,
    SCROLL_DEBOUNCE: 250,
    RESIZE_DEBOUNCE: 250,
    INPUT_MAX_LENGTH: 500,
    COMMENT_MAX_LENGTH: 500,
    SLIDER_MIN: 1,
    SLIDER_MAX: 10,
    SLIDER_DEFAULT: 1
};

const MOCK_RESPONSES = [
    "Question:\nWhat is the primary robot joint solution?\n\nAnswer:\nThis is a filler response for UI testing. Replace this with your final RAG content later.",
    "Question:\nDo you have a 48V / 20A demo reference?\n\nAnswer:\nMock answer: yes, a sample demo guide can be shared. This text is intentionally generic for thumbs UI iteration.",
    "Question:\nWhere is GaN commonly used?\n\nAnswer:\nMock answer: power conversion, motor drives, and compact high-efficiency designs."
];

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let state = {
    isProcessing: false,
    shouldAutoScroll: true
};

// ============================================================================
// DOM ELEMENTS
// ============================================================================

const elements = {
    submitButton: document.querySelector(".send-btn"),
    inputText: document.querySelector(".input-box"),
    chatHistory: document.querySelector(".chat-history"),
    exampleSection: document.querySelector(".chat-example"),
    exampleItems: document.querySelectorAll(".chat-example ul li"),
    slider: document.getElementById("myRange"),
    sliderValue: document.getElementById("sliderValue"),
    form: document.querySelector("form")
};

// Validate critical elements exist
if (!elements.submitButton || !elements.inputText || !elements.chatHistory) {
    console.error('Critical DOM elements not found. Please check HTML structure.');
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Adds text content to an element, preserving line breaks
 * @param {HTMLElement} element - Element to add text to
 * @param {string} text - Text to add
 */
function addTextContent(element, text) {
    // Clear any existing content
    element.textContent = '';
    
    // Split by newlines and create text nodes with <br> elements
    const lines = text.split('\n');
    
    lines.forEach((line, index) => {
        // Add text node (automatically escapes HTML)
        if (line) {
            element.appendChild(document.createTextNode(line));
        }
        
        // Add <br> element between lines (except after last line)
        if (index < lines.length - 1) {
            element.appendChild(document.createElement('br'));
        }
    });
}

/**
 * Checks if user is near the bottom of chat history
 * @returns {boolean}
 */
function isNearBottom() {
    const { chatHistory } = elements;
    const scrollTop = chatHistory.scrollTop;
    const scrollHeight = chatHistory.scrollHeight;
    const clientHeight = chatHistory.clientHeight;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom <= CONFIG.SCROLL_THRESHOLD;
}

/**
 * Scrolls chat history to bottom smoothly
 */
function scrollToBottom() {
    elements.chatHistory.scrollTo({
        top: elements.chatHistory.scrollHeight,
        behavior: 'smooth'
    });
}

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} - Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================================================
// MESSAGE MANAGEMENT
// ============================================================================

/**
 * Creates and appends a message to chat history
 * @param {string} text - Message text
 * @param {string} sender - 'user' or 'bot'
 */
function addMessage(text, sender, options = {}) {
    if (!text || !sender) return;

    const {
        enableFeedback = false,
        feedbackPayload = null
    } = options;

    const message = document.createElement("div");
    message.className = `message ${sender}`;
    message.setAttribute("role", "log");

    // Create avatar
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.setAttribute("aria-hidden", "true");

    const icon = document.createElement("i");
    icon.setAttribute("data-lucide", sender === "user" ? "user" : "bot");
    icon.className = "lucide-icon";
    avatar.appendChild(icon);

    // Create message bubble
    const content = document.createElement("div");
    content.className = "message-content";

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    addTextContent(bubble, text);
    bubble.setAttribute("aria-label", `${sender} message: ${text}`);
    content.appendChild(bubble);

    if (sender === "bot" && enableFeedback && feedbackPayload) {
        const feedbackUI = createFeedbackUI(feedbackPayload);
        content.appendChild(feedbackUI);
    }

    message.appendChild(avatar);
    message.appendChild(content);
    elements.chatHistory.appendChild(message);

    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Auto-scroll if user is near bottom
    if (state.shouldAutoScroll) {
        setTimeout(scrollToBottom, 100);
    }
}

/**
 * Sends feedback data to backend
 * @param {Object} payload - Feedback payload
 * @returns {Promise<Response>}
 */
async function submitFeedback(payload) {
    if (CONFIG.USE_MOCK_BACKEND) {
        await new Promise(resolve => setTimeout(resolve, 200));
        return { ok: true };
    }

    return fetch(CONFIG.FEEDBACK_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });
}

/**
 * Creates feedback controls for bot responses
 * @param {Object} feedbackPayload - Context for feedback submission
 * @returns {HTMLElement}
 */
function createFeedbackUI(feedbackPayload) {
    const container = document.createElement("div");
    container.className = "feedback-container";

    const prompt = document.createElement("span");
    prompt.className = "feedback-prompt";
    prompt.textContent = "Was this helpful?";
    container.appendChild(prompt);

    const buttonRow = document.createElement("div");
    buttonRow.className = "feedback-buttons";

    const upButton = document.createElement("button");
    upButton.className = "feedback-btn";
    upButton.type = "button";
    upButton.setAttribute("aria-label", "Thumbs up");
    upButton.innerHTML = '<i class="fa-regular fa-thumbs-up" aria-hidden="true"></i>';

    const downButton = document.createElement("button");
    downButton.className = "feedback-btn";
    downButton.type = "button";
    downButton.setAttribute("aria-label", "Thumbs down");
    downButton.innerHTML = '<i class="fa-regular fa-thumbs-down" aria-hidden="true"></i>';

    buttonRow.appendChild(upButton);
    buttonRow.appendChild(downButton);
    container.appendChild(buttonRow);

    const commentBox = document.createElement("div");
    commentBox.className = "feedback-comment hidden";

    const commentInput = document.createElement("input");
    commentInput.type = "text";
    commentInput.className = "feedback-comment-input";
    commentInput.placeholder = "Optional comment";
    commentInput.maxLength = CONFIG.COMMENT_MAX_LENGTH;

    const sendFeedbackButton = document.createElement("button");
    sendFeedbackButton.type = "button";
    sendFeedbackButton.className = "feedback-submit";
    sendFeedbackButton.textContent = "Submit";

    commentBox.appendChild(commentInput);
    commentBox.appendChild(sendFeedbackButton);
    container.appendChild(commentBox);

    const status = document.createElement("span");
    status.className = "feedback-status";
    status.setAttribute("aria-live", "polite");
    container.appendChild(status);

    let selectedRating = "";
    let isSubmitted = false;

    function markSelected(rating) {
        selectedRating = rating;
        upButton.classList.toggle("selected", rating === "up");
        downButton.classList.toggle("selected", rating === "down");
        commentBox.classList.remove("hidden");
        status.textContent = "";
    }

    async function handleFeedbackSubmit() {
        if (isSubmitted || !selectedRating) return;

        try {
            sendFeedbackButton.disabled = true;
            status.textContent = "Saving feedback...";

            const response = await submitFeedback({
                rating: selectedRating,
                comment: commentInput.value.trim(),
                question: feedbackPayload.question || "",
                response: feedbackPayload.response || "",
                lang: feedbackPayload.lang || CONFIG.API_LANG
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            isSubmitted = true;
            prompt.remove();
            buttonRow.remove();
            commentBox.remove();
            status.textContent = "Thanks for your feedback!";
        } catch (error) {
            console.error("Error submitting feedback:", error);
            sendFeedbackButton.disabled = false;
            status.textContent = "Could not save feedback. Please retry.";
        }
    }

    upButton.addEventListener("click", () => markSelected("up"));
    downButton.addEventListener("click", () => markSelected("down"));
    sendFeedbackButton.addEventListener("click", handleFeedbackSubmit);
    commentInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            handleFeedbackSubmit();
        }
    });

    return container;
}

/**
 * Shows typing indicator
 * @returns {HTMLElement} - The typing indicator element
 */
function showTypingIndicator() {
    const message = document.createElement("div");
    message.className = "message bot typing-indicator";

    const avatar = document.createElement("div");
    avatar.className = "avatar";

    const icon = document.createElement("i");
    icon.setAttribute("data-lucide", "bot");
    icon.className = "lucide-icon";
    avatar.appendChild(icon);

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';

    message.appendChild(avatar);
    message.appendChild(bubble);
    elements.chatHistory.appendChild(message);

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    if (state.shouldAutoScroll) {
        setTimeout(scrollToBottom, 0);
    }

    return message;
}

/**
 * Removes typing indicator from chat
 */
function removeTypingIndicator() {
    const typingIndicator = elements.chatHistory.querySelector(".typing-indicator");
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

/**
 * Sets loading state for input and button
 * @param {boolean} loading - Loading state
 */
function setLoadingState(loading) {
    state.isProcessing = loading;
    elements.submitButton.disabled = loading;
    elements.inputText.disabled = loading;

    if (loading) {
        elements.submitButton.classList.add("loading");
        elements.submitButton.setAttribute("aria-busy", "true");
    } else {
        elements.submitButton.classList.remove("loading");
        elements.submitButton.setAttribute("aria-busy", "false");
        elements.inputText.focus();
    }
}

// ============================================================================
// API COMMUNICATION
// ============================================================================

/**
 * Parses and formats Q&A response text
 * @param {string} text - Raw response text
 * @returns {string} - Formatted text
 */
function parseQuestionAnswer(text) {
    if (!text) return text;

    // Remove dashes and equal signs
    let cleaned = text.replace(/[-=]/g, '');

    // Split by "Question:" to get individual Q&A pairs
    const qaPairs = cleaned.split(/Question:/i).filter(pair => pair.trim());

    if (qaPairs.length === 0) return cleaned.trim();

    let formatted = '';

    qaPairs.forEach((pair, index) => {
        const parts = pair.split(/Answer:/i);

        if (parts.length === 2) {
            const question = parts[0].trim();
            const answer = parts[1].trim();

            if (index > 0) {
                formatted += '\n\n';
            }
            formatted += `Question:\n${question}\n\nAnswer:\n${answer}`;
        } else {
            formatted += (index > 0 ? '\n\n' : '') + pair.trim();
        }
    });

    return formatted || cleaned.trim();
}

/**
 * Sends message to API and handles response
 * @param {string} question - User's question
 */
async function sendMessageToAPI(question) {
    const numResults = parseInt(elements.slider?.value || CONFIG.SLIDER_DEFAULT, 10);

    try {
        if (CONFIG.USE_MOCK_BACKEND) {
            // Simulate backend delay so UI interaction feels realistic.
            await new Promise(resolve => setTimeout(resolve, 550));
            removeTypingIndicator();

            const index = Math.floor(Math.random() * MOCK_RESPONSES.length);
            const result = `${MOCK_RESPONSES[index]}\n\n(Mock mode active. Slider value: ${numResults})`;
            const formattedResult = parseQuestionAnswer(result);

            addMessage(formattedResult, "bot", {
                enableFeedback: true,
                feedbackPayload: {
                    question,
                    response: result,
                    lang: CONFIG.API_LANG
                }
            });
            return;
        }

        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question: question,
                lang: CONFIG.API_LANG,
                num_results: numResults,
                score_threshold: null
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        removeTypingIndicator();

        const result = data.result || data.answer || "Sorry, I couldn't process that request.";
        const formattedResult = parseQuestionAnswer(result);
        addMessage(formattedResult, "bot", {
            enableFeedback: true,
            feedbackPayload: {
                question,
                response: result,
                lang: CONFIG.API_LANG
            }
        });

    } catch (error) {
        console.error("Error calling API:", error);
        removeTypingIndicator();
        addMessage("Sorry, I encountered an error connecting to the backend. Please try again.", "bot");
    } finally {
        setLoadingState(false);
    }
}

// ============================================================================
// USER INTERACTIONS
// ============================================================================

/**
 * Handles sending a message
 */
function sendMessage() {
    if (state.isProcessing) return;

    const text = elements.inputText.value.trim();
    if (!text) {
        elements.inputText.focus();
        return;
    }

    // Hide example questions after first message
    if (elements.exampleSection && elements.exampleSection.style.display !== "none") {
        elements.exampleSection.style.display = "none";
    }

    // Add user message
    addMessage(text, "user");
    elements.inputText.value = "";

    // Set loading state
    setLoadingState(true);
    showTypingIndicator();

    // Send to API
    sendMessageToAPI(text);
}

/**
 * Handles example question click
 * @param {Event} event - Click event
 */
function handleExampleClick(event) {
    if (state.isProcessing) return;

    const questionText = event.target.textContent.trim();
    if (!questionText) return;

    elements.exampleSection.style.display = "none";
    elements.inputText.value = questionText;
    sendMessage();
}

/**
 * Handles example question keyboard interaction
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleExampleKeydown(event) {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleExampleClick(event);
    }
}

// ============================================================================
// SLIDER FUNCTIONALITY
// ============================================================================

/**
 * Initializes slider functionality
 */
function initializeSlider() {
    const { slider, sliderValue } = elements;

    if (!slider || !sliderValue) return;

    function updateSliderValue() {
        sliderValue.textContent = slider.value;
    }

    updateSliderValue();
    slider.addEventListener("input", updateSliderValue);
    slider.addEventListener("change", updateSliderValue);
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Initializes all event listeners
 */
function initializeEventListeners() {
    // Send button
    if (elements.submitButton) {
        elements.submitButton.addEventListener("click", sendMessage);
    }

    // Input field - Enter key
    if (elements.inputText) {
        elements.inputText.addEventListener("keydown", (event) => {
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        });
    }

    // Example questions
    elements.exampleItems.forEach(item => {
        item.addEventListener("click", handleExampleClick);
        item.addEventListener("keydown", handleExampleKeydown);
    });

    // Form submission prevention
    if (elements.form) {
        elements.form.addEventListener("submit", (event) => {
            event.preventDefault();
            sendMessage();
        });
    }

    // Chat history scroll tracking
    if (elements.chatHistory) {
        elements.chatHistory.addEventListener("scroll", () => {
            state.shouldAutoScroll = isNearBottom();
        });
    }

    // Window resize handler
    const handleResize = debounce(() => {
        if (state.shouldAutoScroll) {
            scrollToBottom();
        }
    }, CONFIG.RESIZE_DEBOUNCE);

    window.addEventListener("resize", handleResize);

    // Prevent page refresh during message sending
    window.addEventListener("beforeunload", (event) => {
        if (state.isProcessing) {
            event.preventDefault();
            event.returnValue = "";
            return "";
        }
    });

    // Global error handler
    window.addEventListener("error", (event) => {
        console.error("Global error:", event.error);
    });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initializes the application
 */
function initialize() {
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Initialize slider
    initializeSlider();

    // Initialize event listeners
    initializeEventListeners();

    // Auto-focus input on load
    if (elements.inputText) {
        elements.inputText.focus();
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

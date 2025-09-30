import { TalkingHead } from "talkinghead";

let head;
let conversationHistory = [];
const geminiApiKey = 'AIzaSyCDcu4Bph4WgQdw4Ub4eNexgIOWVQntEXM';

// Add message to chat history
function addChatMessage(role, content) {
  const chatHistory = document.getElementById('chatHistory');
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${role}`;
  messageDiv.innerHTML = `<strong>${role === 'user' ? 'You' : 'AI'}:</strong>${content}`;
  chatHistory.appendChild(messageDiv);
  chatHistory.classList.add('visible');
  chatHistory.scrollTop = chatHistory.scrollHeight;

  conversationHistory.push({ role, content });
}

// Call Gemini AI (free model: gemini-2.0-flash)
async function getGeminiResponse(userMessage) {
  if (!geminiApiKey) {
    throw new Error('Please set up your Gemini API key first');
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `You are a friendly AI assistant in a voice conversation. Keep your responses concise and conversational - maximum 3 sentences. User says: ${userMessage}`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 150,
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to get response from Gemini: ${errorData.error.message}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// Update status indicator
function updateStatus(status) {
  const indicator = document.querySelector('.status-indicator');
  indicator.className = 'status-indicator';
  if (status) {
    indicator.classList.add(status);
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  const nodeAvatar = document.getElementById("avatar");
  head = new TalkingHead(nodeAvatar, {
    ttsEndpoint: "https://eu-texttospeech.googleapis.com/v1beta1/text:synthesize",
    ttsApikey: "AIzaSyCiqqR1MxtT4DendmwOKhN07j-Blie9oWQ",
    lipsyncModules: ["en", "fi"],
    cameraView: "upper",
  });

  const nodeLoading = document.getElementById("loading");
  try {
    nodeLoading.innerHTML = '<span class="loading-spinner"></span>Loading avatar...';
    await head.showAvatar(
      {
        url: "https://models.readyplayer.me/68da75d0d52bdbb026dba8dc.glb?morphTargets=ARKit,Oculus+Visemes,mouthOpen,mouthSmile,eyesClosed,eyesLookUp,eyesLookDown&textureSizeLimit=1024&textureFormat=png",
        body: "F",
        avatarMood: "neutral",
        ttsLang: "en-GB",
        ttsVoice: "en-GB-Standard-A",
        lipsyncLang: "en",
      },
      (ev) => {
        if (ev.lengthComputable) {
          let val = Math.min(100, Math.round((ev.loaded / ev.total) * 100));
          nodeLoading.innerHTML = `<span class="loading-spinner"></span>Loading ${val}%`;
        }
      }
    );
    nodeLoading.style.display = "none";
    updateStatus('');
  } catch (error) {
    console.log(error);
    nodeLoading.innerHTML = `⚠️ ${error.toString()}`;
  }

  const nodeSpeak = document.getElementById("speak");
  const nodeText = document.getElementById("text");
  const nodeClearChat = document.getElementById("clearChat");

  // Speak / ask button
  nodeSpeak.addEventListener("click", async function () {
    try {
      const text = nodeText.value.trim();
      if (!text) return;

      nodeSpeak.disabled = true;
      nodeText.disabled = true;
      updateStatus('thinking');
      
      // Add user message to chat
      addChatMessage('user', text);
      nodeText.value = '';

      // Get AI response
      const aiResponse = await getGeminiResponse(text);
      addChatMessage('assistant', aiResponse);

      // Speak the response
      updateStatus('speaking');
      await head.speakText(aiResponse);
      
      updateStatus('');
      nodeSpeak.disabled = false;
      nodeText.disabled = false;
      nodeText.focus();
    } catch (error) {
      console.error(error);
      alert('Error: ' + error.message);
      updateStatus('');
      nodeSpeak.disabled = false;
      nodeText.disabled = false;
    }
  });

  // Clear chat history
  nodeClearChat.addEventListener("click", function () {
    conversationHistory = [];
    const chatHistory = document.getElementById('chatHistory');
    chatHistory.innerHTML = '';
    chatHistory.classList.remove('visible');
    nodeText.value = '';
    addChatMessage('assistant', 'Chat cleared! Ask me anything.');
  });

  // Enter key support
  nodeText.addEventListener("keypress", function (e) {
    if (e.key === "Enter" && !nodeSpeak.disabled) {
      nodeSpeak.click();
    }
  });

  // Start/stop talking head on visibility change
  document.addEventListener("visibilitychange", async function () {
    if (document.visibilityState === "visible") {
      head.start();
    } else {
      head.stop();
    }
  });
});

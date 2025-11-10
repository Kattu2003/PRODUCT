// User Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    const moodButtons = document.querySelectorAll('.mood-btn');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const chatMessages = document.getElementById('chatMessages');
    const micButton = document.getElementById('micButton');
    const recordStatus = document.getElementById('recordStatus');
    const journalMicButton = document.getElementById('journalMic');
    const journalRecordStatus = document.getElementById('journalRecordStatus');
    const journalEditor = document.getElementById('journalEditor');
    const wordCount = document.getElementById('wordCount');

    // Session helpers
    function getCurrentUser() {
        try { return JSON.parse(localStorage.getItem('currentUser')); } catch { return null; }
    }
    const currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    function scopedKey(keyBase) {
        return `${keyBase}:${currentUser.email}`;
    }

    // Tab navigation
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const targetTab = this.dataset.tab;
            
            // Remove active class from all nav items
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active class to clicked nav item
            this.classList.add('active');
            
            // Hide all tab contents
            tabContents.forEach(tab => tab.classList.remove('active'));
            
            // Show target tab content
            const targetContent = document.getElementById(targetTab);
            if (targetContent) {
                targetContent.classList.add('active');
                if (targetTab === 'journal') {
                    renderJournalEntries();
                }
            }
        });
    });

    // Mood tracking
    moodButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove selected class from all buttons
            moodButtons.forEach(b => b.classList.remove('selected'));
            
            // Add selected class to clicked button
            this.classList.add('selected');
            
            // Update mood text
            const moodText = document.querySelector('.mood-text');
            const moods = ['Very sad', 'Sad', 'Neutral', 'Happy', 'Very happy'];
            const moodIndex = parseInt(this.dataset.mood) - 1;
            moodText.textContent = moods[moodIndex];
            
            // Save mood to localStorage per user
            localStorage.setItem(scopedKey('todayMood'), this.dataset.mood);
        });
    });

    // Load saved mood
    const savedMood = localStorage.getItem(scopedKey('todayMood'));
    if (savedMood) {
        const moodBtn = document.querySelector(`[data-mood="${savedMood}"]`);
        if (moodBtn) {
            moodBtn.classList.add('selected');
            const moods = ['Very sad', 'Sad', 'Neutral', 'Happy', 'Very happy'];
            const moodIndex = parseInt(savedMood) - 1;
            document.querySelector('.mood-text').textContent = moods[moodIndex];
        }
    }

    // Chat functionality
    function getOrchestratorBaseUrl() {
        return (window.ORCHESTRATOR_URL || '/api').replace(/\/$/, '');
    }

    function getSessionId() {
        const key = 'vkareSessionId';
        let sid = sessionStorage.getItem(key);
        if (!sid) {
            sid = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            sessionStorage.setItem(key, sid);
        }
        return sid;
    }

    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;
            addMessage(message, 'user');
            chatInput.value = '';
            
        try {
            const base = getOrchestratorBaseUrl();
            const sid = getSessionId();
            const resp = await fetch(`${base}/session/${encodeURIComponent(sid)}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: message })
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            const audioUrl = data.wav_b64 ? `data:audio/wav;base64,${data.wav_b64}` : null;
            addMessage(data.reply_text || '...', 'ai', audioUrl);
        } catch (err) {
            // Fallback to local canned response if backend unavailable
                const aiResponse = generateAIResponse(message);
                addMessage(aiResponse, 'ai');
        }
    }

    function addMessage(content, sender, audioUrl) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = sender === 'ai' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        const textP = document.createElement('p');
        textP.textContent = content;
        messageContent.appendChild(textP);
        if (audioUrl) {
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.src = audioUrl;
            audio.style.marginTop = '6px';
            messageContent.appendChild(audio);
        }
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function generateAIResponse(userMessage) {
        const responses = {
            'anxiety': "I understand you're feeling anxious. Let's try some breathing exercises together. Can you tell me more about what's triggering your anxiety?",
            'stress': "Stress can be overwhelming. Let's work through this step by step. What specific situation is causing you stress right now?",
            'mood': "Thank you for sharing your mood with me. It's important to acknowledge our feelings. What would you like to talk about regarding your mood?",
            'sad': "I'm sorry you're feeling sad. It's okay to feel this way. Would you like to talk about what's making you feel sad, or would you prefer some coping strategies?",
            'help': "I'm here to help you. Whether you need someone to listen, coping strategies, or just want to talk, I'm available 24/7. What can I help you with today?",
            'default': "Thank you for sharing that with me. I'm here to listen and support you. Can you tell me more about how you're feeling or what's on your mind?"
        };
        
        const lowerMessage = userMessage.toLowerCase();
        
        for (const [key, response] of Object.entries(responses)) {
            if (lowerMessage.includes(key)) {
                return response;
            }
        }
        
        return responses.default;
    }

    // Chat event listeners
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Voice recording setup
    let mediaRecorder;
    let recordedChunks = [];
    let isRecording = false;

    // Journal voice recording setup
    let journalMediaRecorder;
    let journalRecordedChunks = [];
    let journalIsRecording = false;

    async function toggleRecording() {
        if (isRecording) {
            // Stop
            isRecording = false;
            recordStatus && (recordStatus.style.display = 'none');
            try { mediaRecorder && mediaRecorder.stop(); } catch {}
            if (micButton) {
                micButton.innerHTML = '<i class="fas fa-microphone"></i>';
            }
            return;
        }

        // Start
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const options = { mimeType: 'audio/webm' };
            recordedChunks = [];
            mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) recordedChunks.push(e.data);
            };
            mediaRecorder.onstop = async () => {
                try {
                    const blob = new Blob(recordedChunks, { type: 'audio/webm' });
                    await processRecordedAudio(blob);
                } catch (err) {
                    showNotification('Failed to process audio');
                }
                // Stop tracks
                stream.getTracks().forEach(t => t.stop());
            };
            mediaRecorder.start();
            isRecording = true;
            recordStatus && (recordStatus.style.display = 'block');
            if (micButton) {
                micButton.innerHTML = '<i class="fas fa-stop"></i>';
            }
        } catch (err) {
            showNotification('Microphone access denied');
        }
    }

    async function processRecordedAudio(blob) {
        const base = getOrchestratorBaseUrl();
        const sid = getSessionId();
        // 1) Transcribe
        const form = new FormData();
        form.append('audio', blob, 'audio.webm');
        let transcript = '';
        try {
            const tr = await fetch(`${base}/session/${encodeURIComponent(sid)}/transcribe`, {
                method: 'POST',
                body: form
            });
            if (!tr.ok) throw new Error(`HTTP ${tr.status}`);
            const j = await tr.json();
            transcript = (j && j.text) || '';
        } catch (err) {
            transcript = '';
        }
        // Add user's message with audio
        const userAudioUrl = URL.createObjectURL(blob);
        addMessage(transcript || 'Voice message', 'user', userAudioUrl);

        // 2) Get assistant reply + TTS
        try {
            const rr = await fetch(`${base}/session/${encodeURIComponent(sid)}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: transcript || '[voice message]' })
            });
            if (!rr.ok) throw new Error(`HTTP ${rr.status}`);
            const data = await rr.json();
            const audioUrl = data.wav_b64 ? `data:audio/wav;base64,${data.wav_b64}` : null;
            addMessage(data.reply_text || '...', 'ai', audioUrl);
        } catch (err) {
            addMessage(generateAIResponse(transcript || '[voice message]'), 'ai');
        }
    }

    if (micButton) {
        micButton.addEventListener('click', toggleRecording);
    }

        // Small helper to escape HTML inserted from transcription
    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    if (micButton) {
        micButton.addEventListener('click', toggleRecording);
    }

    // Journal mic handling
    async function toggleJournalRecording() {
        if (journalIsRecording) {
            // Stop recording
            journalIsRecording = false;
            journalRecordStatus.style.display = 'none';
            try { journalMediaRecorder && journalMediaRecorder.stop(); } catch {}
            journalMicButton.innerHTML = '<i class="fas fa-microphone"></i>';
            return;
        }

        // Start recording
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const options = { mimeType: 'audio/webm' };
            journalRecordedChunks = [];
            journalMediaRecorder = new MediaRecorder(stream, options);
            
            journalMediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) journalRecordedChunks.push(e.data);
            };
            
            journalMediaRecorder.onstop = async () => {
                try {
                    const blob = new Blob(journalRecordedChunks, { type: 'audio/webm' });
                    await processRecordedAudioJournal(blob);
                } catch (err) {
                    showNotification('Failed to process audio');
                }
                stream.getTracks().forEach(t => t.stop());
            };
            
            journalMediaRecorder.start();
            journalIsRecording = true;
            journalRecordStatus.style.display = 'block';
            journalMicButton.innerHTML = '<i class="fas fa-stop"></i>';
        } catch (err) {
            showNotification('Microphone access denied');
        }
    }

    // Process recorded audio specifically for the journal
    async function processRecordedAudioJournal(blob) {
        const base = getOrchestratorBaseUrl();
        const sid = getSessionId();
        // Transcribe
        const form = new FormData();
        form.append('audio', blob, 'audio.webm');
        try {
            const resp = await fetch(`${base}/session/${encodeURIComponent(sid)}/transcribe`, {
                method: 'POST',
                body: form
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            if (data && data.text) {
                // Insert at cursor position or append to end
                const sel = window.getSelection();
                const range = sel.getRangeAt(0);
                const text = document.createTextNode(data.text);
                range.insertNode(text);
                range.setStartAfter(text);
                range.setEndAfter(text);
                sel.removeAllRanges();
                sel.addRange(range);
                updateWordCount();
            }
        } catch (err) {
            showNotification('Failed to transcribe audio. Please try again.');
        }
    }

    if (journalMicButton) {
        journalMicButton.addEventListener('click', toggleJournalRecording);
    }

    // Quick response buttons
    window.sendQuickMessage = function(message) {
        chatInput.value = message;
        sendMessage();
    };

    // Calendar functionality
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();

    function generateCalendar() {
        const calendarGrid = document.getElementById('calendarGrid');
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];
        
        document.getElementById('currentMonth').textContent = 
            `${monthNames[currentMonth]} ${currentYear}`;
        
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        calendarGrid.innerHTML = '';
        
        // Add day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            dayHeader.textContent = day;
            calendarGrid.appendChild(dayHeader);
        });
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day';
            calendarGrid.appendChild(emptyDay);
        }
        
        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day';
            
            const dayNumber = document.createElement('div');
            dayNumber.className = 'calendar-day-number';
            dayNumber.textContent = day;
            dayDiv.appendChild(dayNumber);
            
            // Add events for specific days
            if (day === 15) {
                const event = document.createElement('div');
                event.className = 'calendar-event';
                event.textContent = 'AI Session';
                dayDiv.appendChild(event);
            }
            
            if (day === 16) {
                const event = document.createElement('div');
                event.className = 'calendar-event';
                event.textContent = 'Dr. Chen';
                dayDiv.appendChild(event);
            }
            
            calendarGrid.appendChild(dayDiv);
        }
    }

    window.changeMonth = function(direction) {
        currentMonth += direction;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        } else if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        generateCalendar();
    };

    // Initialize calendar
    generateCalendar();

    // Journal functionality
    function updateWordCount() {
        const text = journalEditor.textContent || journalEditor.innerText || '';
        const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
        wordCount.textContent = `${words} words`;
    }

    journalEditor.addEventListener('input', updateWordCount);
    updateWordCount();

    // Journal formatting functions
    window.formatText = function(command) {
        document.execCommand(command, false, null);
        journalEditor.focus();
    };

    window.insertEmoji = function(emoji) {
        document.execCommand('insertText', false, emoji);
        journalEditor.focus();
    };

    window.saveDraft = function() {
        const content = journalEditor.innerHTML;
        localStorage.setItem(scopedKey('journalDraft'), content);
        showNotification('Draft saved successfully!');
    };

    window.saveEntry = function() {
        const content = journalEditor.innerHTML;
        const timestamp = new Date().toISOString();
        
        const key = scopedKey('journalEntries');
        const entries = JSON.parse(localStorage.getItem(key) || '[]');
        entries.unshift({
            content: content,
            timestamp: timestamp,
            wordCount: journalEditor.textContent.trim().split(/\s+/).filter(w => w).length
        });
        
        localStorage.setItem(key, JSON.stringify(entries));
        localStorage.removeItem(scopedKey('journalDraft'));
        
        journalEditor.innerHTML = '';
        updateWordCount();
        renderJournalEntries();
        showNotification('Journal entry saved successfully!');
    };

    function renderJournalEntries() {
        const list = document.querySelector('.journal-entries .entries-list');
        if (!list) return;
        list.innerHTML = '';
        const entries = JSON.parse(localStorage.getItem(scopedKey('journalEntries')) || '[]');
        if (!entries.length) {
            const empty = document.createElement('div');
            empty.className = 'entry-item';
            empty.innerHTML = '<div class="entry-date">No entries</div>';
            list.appendChild(empty);
            return;
        }
        entries.forEach((entry, index) => {
            const date = new Date(entry.timestamp);
            const item = document.createElement('div');
            item.className = 'entry-item';
            item.innerHTML = `
                <div class="entry-date">${date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                <div class="entry-preview">${entry.content}</div>
                <div class="entry-actions"><button class="btn btn-secondary btn-small" data-index="${index}">Delete</button></div>
            `;
            list.appendChild(item);
        });

        // Attach delete handlers
        list.querySelectorAll('.entry-actions button').forEach(btn => {
            btn.addEventListener('click', function() {
                const idx = parseInt(this.getAttribute('data-index'));
                const entries = JSON.parse(localStorage.getItem(scopedKey('journalEntries')) || '[]');
                if (!isNaN(idx) && idx >= 0 && idx < entries.length) {
                    entries.splice(idx, 1);
                    localStorage.setItem(scopedKey('journalEntries'), JSON.stringify(entries));
                    renderJournalEntries();
                    showNotification('Entry deleted.');
                }
            });
        });
    }

    // Load draft if exists
    const draft = localStorage.getItem(scopedKey('journalDraft'));
    if (draft) {
        journalEditor.innerHTML = draft;
        updateWordCount();
    } else {
        journalEditor.innerHTML = '';
    }
    // Populate entries on load
    renderJournalEntries();

    // Breathing exercise functionality
    let breathingInterval;
    let isBreathing = false;

    window.startBreathing = function() {
        if (isBreathing) {
            stopBreathing();
            return;
        }
        
        isBreathing = true;
        const circle = document.getElementById('breathingCircle');
        const text = circle.querySelector('.breathing-text');
        const duration = parseInt(document.getElementById('durationSlider').value) * 60; // Convert to seconds
        
        let timeLeft = duration;
        let phase = 'in'; // 'in', 'hold', 'out'
        let phaseTime = 0;
        
        // Apply smooth CSS animation resembling Google's breathing exercise
        circle.classList.add('breathing-active');
        text.textContent = 'Breathe In';
        
        breathingInterval = setInterval(() => {
            timeLeft--;
            if (phase === 'in' && phaseTime >= 4) {
                phase = 'hold';
                phaseTime = 0;
                text.textContent = 'Hold';
            } else if (phase === 'hold' && phaseTime >= 4) {
                phase = 'out';
                phaseTime = 0;
                text.textContent = 'Breathe Out';
            } else if (phase === 'out' && phaseTime >= 6) {
                phase = 'in';
                phaseTime = 0;
                text.textContent = 'Breathe In';
            }
            phaseTime++;
            if (timeLeft <= 0) {
                stopBreathing();
            }
        }, 1000);
        
        document.querySelector('.breathing-controls button').textContent = 'Stop Exercise';
    };

    function stopBreathing() {
        isBreathing = false;
        clearInterval(breathingInterval);
        
        const circle = document.getElementById('breathingCircle');
        const text = circle.querySelector('.breathing-text');
        
        text.textContent = 'Breathe In';
        circle.classList.remove('breathing-active');
        document.querySelector('.breathing-controls button').textContent = 'Start Exercise';
    }

    // Duration slider
    const durationSlider = document.getElementById('durationSlider');
    const durationDisplay = document.getElementById('duration');
    
    durationSlider.addEventListener('input', function() {
        durationDisplay.textContent = this.value;
    });

    // Personality test functionality
    const testData = [
        { q: "In a group, you usually...", opts: [
            { t: 'E', text: 'Lead and energize the group' },
            { t: 'I', text: 'Listen and reflect before speaking' }
        ]},
        { q: "When making decisions, you rely more on...", opts: [
            { t: 'T', text: 'Logic and objective analysis' },
            { t: 'F', text: 'Values and how people are affected' }
        ]},
        { q: "You prefer information that is...", opts: [
            { t: 'S', text: 'Concrete and practical' },
            { t: 'N', text: 'Abstract and conceptual' }
        ]},
        { q: "Your work style is more...", opts: [
            { t: 'J', text: 'Planned and structured' },
            { t: 'P', text: 'Flexible and spontaneous' }
        ]},
        { q: "At social events, you...", opts: [
            { t: 'E', text: 'Talk to many, including strangers' },
            { t: 'I', text: 'Stick with a few close people' }
        ]},
        { q: "When learning new things, you prefer...", opts: [
            { t: 'S', text: 'Hands-on experience' },
            { t: 'N', text: 'Exploring big ideas' }
        ]},
        { q: "Conflict is resolved best by...", opts: [
            { t: 'T', text: 'Discussing the facts' },
            { t: 'F', text: 'Understanding feelings' }
        ]},
        { q: "Your schedule is...", opts: [
            { t: 'J', text: 'Organized with clear plans' },
            { t: 'P', text: 'Open and adaptable' }
        ]},
        { q: "You recharge by...", opts: [
            { t: 'E', text: 'Being around people' },
            { t: 'I', text: 'Spending time alone' }
        ]},
        { q: "Details vs. possibilities?", opts: [
            { t: 'S', text: 'Details and specifics' },
            { t: 'N', text: 'Possibilities and patterns' }
        ]},
        { q: "In arguments, you tend to be...", opts: [
            { t: 'T', text: 'Direct and objective' },
            { t: 'F', text: 'Diplomatic and empathetic' }
        ]},
        { q: "Approach to deadlines:", opts: [
            { t: 'J', text: 'Finish early with a plan' },
            { t: 'P', text: 'Work closer to the deadline' }
        ]}
    ];
    let currentQuestion = 0;
    const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };

    function updateTestProgress() {
        const total = testData.length;
        const progress = ((currentQuestion + 1) / total) * 100;
        const pf = document.querySelector('#personality-test .progress-fill');
        const pt = document.querySelector('#personality-test .progress-text');
        if (pf) pf.style.width = `${progress}%`;
        if (pt) pt.textContent = `Question ${Math.min(currentQuestion + 1, total)} of ${total}`;
    }

    function renderQuestion() {
        if (currentQuestion >= testData.length) {
            finishTest();
            return;
        }
        const item = testData[currentQuestion];
        const questionTitle = document.querySelector('#personality-test .test-question h3');
        const optionsContainer = document.querySelector('#personality-test .test-options');
        if (questionTitle) questionTitle.textContent = item.q;
        if (optionsContainer) {
            optionsContainer.innerHTML = '';
            // Ensure 4 options for a game-like feel
            const opts = item.opts.slice();
            while (opts.length < 4) {
                const fillers = [
                    { t: 'E', text: 'Engage actively' },
                    { t: 'I', text: 'Observe quietly' },
                    { t: 'S', text: 'Focus on facts' },
                    { t: 'N', text: 'Imagine possibilities' },
                    { t: 'T', text: 'Prioritize logic' },
                    { t: 'F', text: 'Prioritize people' },
                    { t: 'J', text: 'Plan ahead' },
                    { t: 'P', text: 'Go with the flow' }
                ];
                const pick = fillers[Math.floor(Math.random() * fillers.length)];
                if (!opts.find(o => o.text === pick.text)) opts.push(pick);
            }
            // Shuffle order
            opts.sort(() => Math.random() - 0.5);
            opts.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'option-btn option-card';
                btn.innerHTML = `<span class="option-text">${opt.text}</span>`;
                btn.addEventListener('click', () => {
                    scores[opt.t]++;
                    animateNextQuestion();
                });
                optionsContainer.appendChild(btn);
            });
        }
        updateTestProgress();
    }

    function animateNextQuestion() {
        const container = document.querySelector('.test-container');
        container.classList.add('fade-out');
        setTimeout(() => {
            currentQuestion++;
            renderQuestion();
            container.classList.remove('fade-out');
            container.classList.add('fade-in');
            setTimeout(() => container.classList.remove('fade-in'), 300);
        }, 250);
    }

    function finishTest() {
        const type = `${scores.E >= scores.I ? 'E' : 'I'}${scores.S >= scores.N ? 'S' : 'N'}${scores.T >= scores.F ? 'T' : 'F'}${scores.J >= scores.P ? 'J' : 'P'}`;
        const descriptions = {
            ISTJ: 'Responsible, organized, and practical. You value order and reliability.',
            ISFJ: 'Warm and dedicated, you are attentive and supportive to others.',
            INFJ: 'Insightful and principled, you seek meaning and understanding.',
            INTJ: 'Strategic and independent, you enjoy solving complex problems.',
            ISTP: 'Practical and observant, you learn by doing and exploring.',
            ISFP: 'Gentle and adaptable, you appreciate beauty and personal values.',
            INFP: 'Idealistic and empathetic, you value authenticity and growth.',
            INTP: 'Curious and analytical, you love ideas and logical systems.',
            ESTP: 'Energetic and action-oriented, you thrive in the moment.',
            ESFP: 'Enthusiastic and spontaneous, you enjoy life and connection.',
            ENFP: 'Imaginative and inspiring, you see potential in everything.',
            ENTP: 'Inventive and outspoken, you enjoy debate and innovation.',
            ESTJ: 'Efficient and structured, you value order and responsibility.',
            ESFJ: 'Caring and sociable, you create harmony and support others.',
            ENFJ: 'Charismatic and altruistic, you motivate and guide people.',
            ENTJ: 'Decisive and strategic, you organize people and resources effectively.'
        };
        const detailed = {
            ISTJ: 'ISTJ (Logistician): Practical, fact-minded, and reliable. You value order, duty, and clear rules. Strengths include responsibility, thoroughness, and consistency. Watch for rigidity—build space for flexibility and self-care.',
            ISFJ: 'ISFJ (Defender): Warm, meticulous, and protective. You support others with quiet strength. Strengths include empathy, reliability, and patience. Ensure you set boundaries and prioritize your needs too.',
            INFJ: 'INFJ (Advocate): Insightful, principled, and idealistic. You seek meaning and help others grow. Strengths include vision, empathy, and integrity. Balance high ideals with practical steps to avoid burnout.',
            INTJ: 'INTJ (Architect): Strategic, independent, and future-focused. You solve complex problems with precision. Strengths include planning, innovation, and discipline. Remember to communicate feelings and collaborate openly.',
            ISTP: 'ISTP (Virtuoso): Practical, curious, and hands-on. You learn by doing and excel in troubleshooting. Strengths include adaptability, calm under pressure, and ingenuity. Build long-term plans to complement your spontaneity.',
            ISFP: 'ISFP (Adventurer): Gentle, adaptable, and creative. You value authenticity and harmony. Strengths include empathy, artistry, and flexibility. Practice assertiveness and long-term goal setting.',
            INFP: 'INFP (Mediator): Idealistic, empathetic, and reflective. You value authenticity and personal growth. Strengths include compassion, creativity, and deep insight. Ground your ideals with consistent routines.',
            INTP: 'INTP (Logician): Curious, analytical, and inventive. You love ideas and logical systems. Strengths include originality, objectivity, and problem solving. Translate insights into action and follow-through.',
            ESTP: 'ESTP (Entrepreneur): Energetic, action-oriented, and bold. You thrive in the present moment. Strengths include resourcefulness, courage, and social acuity. Plan beyond the moment to sustain progress.',
            ESFP: 'ESFP (Entertainer): Enthusiastic, spontaneous, and people-centered. You bring energy and joy. Strengths include adaptability, empathy, and optimism. Build structure to support consistency.',
            ENFP: 'ENFP (Campaigner): Imaginative, inspiring, and people-focused. You see potential everywhere. Strengths include creativity, empathy, and enthusiasm. Prioritize focus and finish to realize your visions.',
            ENTP: 'ENTP (Debater): Inventive, outspoken, and agile. You enjoy debate and innovation. Strengths include quick thinking, adaptability, and idea generation. Commit to execution and consider others’ feelings.',
            ESTJ: 'ESTJ (Executive): Efficient, structured, and decisive. You value order and responsibility. Strengths include organization, reliability, and leadership. Stay open to alternative methods and emotions.',
            ESFJ: 'ESFJ (Consul): Caring, sociable, and supportive. You create harmony and stability. Strengths include empathy, dependability, and teamwork. Set boundaries and embrace change gradually.',
            ENFJ: 'ENFJ (Protagonist): Charismatic, altruistic, and visionary. You motivate and guide people. Strengths include communication, empathy, and leadership. Maintain self-care and realistic expectations.',
            ENTJ: 'ENTJ (Commander): Decisive, strategic, and organized. You align people and resources to goals. Strengths include execution, analysis, and leadership. Practice patience and active listening.'
        };
        const desc = detailed[type] || 'You have a balanced, multifaceted personality.';

        // Save result per user
        const resultKey = scopedKey('personalityResult');
        const result = { type, description: desc, completedAt: new Date().toISOString(), scores };
        localStorage.setItem(resultKey, JSON.stringify(result));

        // Display result in the test area
        const testContainer = document.querySelector('#personality-test .test-container');
        testContainer.innerHTML = `
            <div class="test-complete">
                <h2>Your Personality Type</h2>
                <div class="result-type">${type}</div>
                <p class="result-description">${desc}</p>
                <button class="btn btn-primary" id="retakeTestBtn">Retake Test</button>
            </div>
        `;
        const retake = document.getElementById('retakeTestBtn');
        if (retake) retake.addEventListener('click', () => {
            currentQuestion = 0;
            Object.keys(scores).forEach(k => scores[k] = 0);
            testContainer.innerHTML = `
                <div class="test-progress">
                    <div class="progress-bar"><div class="progress-fill" style="width: 0%"></div></div>
                    <span class="progress-text">Question 1 of ${testData.length}</span>
                </div>
                <div class="test-question"><h3></h3><div class="test-options"></div></div>
            `;
            renderQuestion();
        });

        // Reflect in profile
        applyPersonalityResultToProfile(result);
        showNotification('Test completed! Your result has been saved to your profile.');
    }

    function applyPersonalityResultToProfile(result) {
        const valueEl = document.querySelector('#profile .test-result .result-value');
        const descEl = document.querySelector('#profile .test-result .result-description');
        if (valueEl) valueEl.textContent = `${result.type}`;
        if (descEl) descEl.textContent = result.description;
    }

    function applyUserProfile() {
        function getUsers() { try { return JSON.parse(localStorage.getItem('users') || '{}'); } catch { return {}; } }
        const users = getUsers();
        const userRecord = users[currentUser.email] || {};
        const displayName = currentUser.fullName && currentUser.fullName.trim() ? currentUser.fullName :
            `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email;

        // Top-right greeting
        const welcomeEl = document.querySelector('.user-menu .user-name');
        if (welcomeEl) {
            const first = currentUser.firstName || displayName || currentUser.email;
            welcomeEl.textContent = `Welcome, ${first}`;
        }

        // Sidebar header
        const sideName = document.querySelector('.sidebar-header .user-info h3');
        const sideRole = document.querySelector('.sidebar-header .user-info p');
        if (sideName) sideName.textContent = displayName;
        if (sideRole) sideRole.textContent = currentUser.role === 'therapist' ? 'Therapist' : 'Patient';

        // Profile header
        const nameEl = document.querySelector('.profile-header .profile-info h2');
        const sinceEl = document.querySelector('.profile-header .profile-info p');
        if (nameEl) nameEl.textContent = displayName;
        if (sinceEl) {
            const createdAt = userRecord.createdAt ? new Date(userRecord.createdAt) : null;
            if (createdAt && !isNaN(createdAt)) {
                const month = createdAt.toLocaleString(undefined, { month: 'long' });
                const year = createdAt.getFullYear();
                sinceEl.textContent = `${currentUser.role === 'therapist' ? 'Therapist' : 'Patient'} since ${month} ${year}`;
            } else {
                sinceEl.textContent = `${currentUser.role === 'therapist' ? 'Therapist' : 'Patient'} since No data`;
            }
        }

        // Profile details
        function setDetail(labelStartsWith, value) {
            const label = Array.from(document.querySelectorAll('#profile .detail-item label')).find(l => l.textContent.trim().startsWith(labelStartsWith));
            if (label && label.nextElementSibling) {
                label.nextElementSibling.textContent = value && String(value).trim() ? value : 'No data';
            }
        }
        setDetail('Email', currentUser.email);
        setDetail('Phone', userRecord.phone || userRecord.userPhone || '');
        setDetail('Date of Birth', userRecord.dob || '');
        setDetail('Emergency Contact', userRecord.emergencyContact || '');
    }

    // Load saved personality result into profile on startup
    (function initPersonality() {
        // CSS animations for transitions
        const style = document.createElement('style');
        style.textContent = `
            .fade-in { animation: fadeIn 0.25s ease; }
            .fade-out { animation: fadeOut 0.25s ease; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(6px);} to { opacity: 1; transform: translateY(0);} }
            @keyframes fadeOut { from { opacity: 1; transform: translateY(0);} to { opacity: 0; transform: translateY(-6px);} }
            #breathingCircle { width: 160px; height: 160px; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at 30% 30%, rgba(99, 179, 237, 0.35), rgba(99, 179, 237, 0.15)); box-shadow: 0 0 0 0 rgba(99,179,237,0.35); }
            #breathingCircle.breathing-active { animation: breathingCycle 14s ease-in-out infinite, pulseGlow 2s ease-in-out infinite; }
            @keyframes breathingCycle { 0% { transform: scale(1); } 28% { transform: scale(1.3); } 56% { transform: scale(1.3); } 100% { transform: scale(1); } }
            @keyframes pulseGlow { 0% { box-shadow: 0 0 0 0 rgba(99,179,237,0.35);} 50% { box-shadow: 0 0 30px 8px rgba(99,179,237,0.2);} 100% { box-shadow: 0 0 0 0 rgba(99,179,237,0.35);} }
            .test-complete .result-type { font-size: 2rem; font-weight: 700; margin: 0.5rem 0; }
            .test-container .test-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
            .option-card { border: 1px solid rgba(0,0,0,0.08); border-radius: 12px; padding: 14px; text-align: center; background: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.06); transition: transform .12s ease, box-shadow .12s ease; }
            .option-card:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.09); }
            .option-text { display: inline-block; font-weight: 600; }
            .all-types { margin-top: 16px; }
            .types-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
            .type-card { border: 1px solid rgba(0,0,0,0.08); border-radius: 10px; padding: 10px; background: #fff; }
            .type-code { font-weight: 700; margin-bottom: 4px; }
        `;
        document.head.appendChild(style);

        const saved = localStorage.getItem(scopedKey('personalityResult'));
        if (saved) {
            try { applyPersonalityResultToProfile(JSON.parse(saved)); } catch {}
        }
        applyUserProfile();
        // Initialize question 1 content
        if (document.getElementById('personality-test')) {
            renderQuestion();
        }
    })();

    // Survival Guidebook interactive guides
    const guides = {
        anxiety: {
            title: 'Anxiety Attack Guide',
            steps: [
                'Ground yourself: Name 5 things you can see, 4 you can touch, 3 you can hear.',
                'Box breathing: Inhale 4s, hold 4s, exhale 4s, hold 4s. Repeat 4 cycles.',
                'Reframe: “This feeling is temporary. I am safe. It will pass.”',
                'Sip cool water and loosen any tight clothing.'
            ]
        },
        stress: {
            title: 'Stress Management Guide',
            steps: [
                'Mini body scan: Unclench your jaw, drop your shoulders, relax your hands.',
                '2-minute breath focus: Exhale slightly longer than inhale.',
                'Prioritize: Write top 3 tasks. Do the smallest next step now.',
                'Move: 30–60 seconds of light stretching or a short walk.'
            ]
        },
        crisis: {
            title: 'Crisis Support Guide',
            steps: [
                'If you are in immediate danger, call local emergency services now.',
                'Contact a trusted person and tell them how you’re feeling.',
                'Consider professional help: therapist, hotline, or local services.',
                'Limit access to harmful items and move to a safe environment.'
            ]
        }
    };

    function attachGuideButtons() {
        const categories = document.querySelectorAll('#survival-guide .guide-category, #survival-guide .guide-categories .guide-category');
        if (categories && categories.length) {
            categories.forEach(cat => {
                const title = (cat.querySelector('h3')?.textContent || '').toLowerCase();
                const btn = cat.querySelector('button');
                if (!btn) return;
                let key = null;
                if (title.includes('anxiety')) key = 'anxiety';
                else if (title.includes('stress')) key = 'stress';
                else if (title.includes('crisis')) key = 'crisis';
                btn.addEventListener('click', () => openGuide(key));
            });
            } else {
            // Fallback: attach by order
            const buttons = document.querySelectorAll('#survival-guide .btn');
            buttons.forEach((btn, idx) => {
                const map = ['anxiety','stress','crisis'];
                btn.addEventListener('click', () => openGuide(map[idx] || 'anxiety'));
            });
        }
    }

    window.openGuide = function(key) {
        const data = guides[key];
        if (!data) return;
        const modal = document.createElement('div');
        modal.className = 'guide-modal';
        modal.innerHTML = `
            <div class="guide-backdrop"></div>
            <div class="guide-dialog">
                <div class="guide-header">
                    <h3>${data.title}</h3>
                    <button class="guide-close" aria-label="Close">×</button>
                </div>
                <ol class="guide-steps">
                    ${data.steps.map(s => `<li>${s}</li>`).join('')}
                </ol>
                <div class="guide-actions">
                    <button class="btn btn-secondary guide-close">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelectorAll('.guide-close, .guide-backdrop').forEach(el => {
            el.addEventListener('click', () => {
                modal.classList.add('fade-out');
                setTimeout(() => modal.remove(), 200);
        });
    });
    };

    // Styles for guides
    (function addGuideStyles(){
        const guideStyle = document.createElement('style');
        guideStyle.textContent = `
            .guide-modal { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; }
            .guide-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.35); }
            .guide-dialog { position: relative; width: min(560px, 92vw); background: #fff; border-radius: 12px; padding: 16px 16px 12px; box-shadow: 0 12px 30px rgba(0,0,0,0.2); animation: fadeIn .2s ease; }
            .guide-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
            .guide-header h3 { margin: 0; }
            .guide-close { background: transparent; border: none; font-size: 22px; line-height: 1; cursor: pointer; }
            .guide-steps { margin: 12px 0; padding-left: 20px; }
            .guide-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
        `;
        document.head.appendChild(guideStyle);
    })();

    // Attach guide button handlers after DOM ready
    attachGuideButtons();

    // Utility functions
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--primary-blue);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            font-size: 0.9rem;
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Add CSS for notifications
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

    // Tab opening function
    window.openTab = function(tabName) {
        const tab = document.querySelector(`[data-tab="${tabName}"]`);
        if (tab) {
            tab.click();
        }
    };

    // Logout function
    window.logout = function() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        }
    };

    // Mobile sidebar toggle
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.querySelector('.dashboard-sidebar');
    
    hamburger.addEventListener('click', function() {
        sidebar.classList.toggle('open');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    });

    // Auto-save journal draft every 30 seconds
    setInterval(() => {
        if (journalEditor && journalEditor.textContent && journalEditor.textContent.trim()) {
            const content = journalEditor.innerHTML;
            localStorage.setItem(scopedKey('journalDraft'), content);
        }
    }, 30000);

    // Initialize dashboard
    console.log('V-Kare User Dashboard initialized successfully!');
});

// Therapist Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    const assistantChatInput = document.getElementById('assistantChatInput');
    const assistantSendBtn = document.getElementById('assistantSendBtn');
    const assistantChatMessages = document.getElementById('assistantChatMessages');

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
            }
        });
    });

    // Assistant chat functionality
    function sendAssistantMessage() {
        const message = assistantChatInput.value.trim();
        if (message) {
            addAssistantMessage(message, 'user');
            assistantChatInput.value = '';
            
            // Simulate AI response
            setTimeout(() => {
                const aiResponse = generateAssistantResponse(message);
                addAssistantMessage(aiResponse, 'ai');
            }, 1000);
        }
    }

    function addAssistantMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = sender === 'ai' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user-md"></i>';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = `<p>${content}</p>`;
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        
        assistantChatMessages.appendChild(messageDiv);
        assistantChatMessages.scrollTop = assistantChatMessages.scrollHeight;
    }

    function generateAssistantResponse(userMessage) {
        const responses = {
            'progress': "Based on Sarah Johnson's recent mood tracking data, I can see a 15% increase in anxiety levels this week. Her journal entries show increased work stress. I recommend focusing on stress management techniques in your next session.",
            'notes': "I've prepared session notes for today's appointments. Key points for Sarah Johnson: Continue CBT techniques, introduce mindfulness exercises. For Michael Rodriguez: Review homework completion, discuss sleep hygiene improvements.",
            'trends': "This week's patient trends show: 60% report increased stress levels, 40% show improvement in mood tracking compliance, 25% need additional support resources. I recommend reviewing your availability for emergency sessions.",
            'patient': "Patient analysis complete. Sarah Johnson shows signs of increased anxiety related to work deadlines. Her breathing exercise compliance has decreased. Consider adjusting her treatment plan to include more immediate coping strategies.",
            'schedule': "Your schedule analysis shows optimal patient distribution. Consider adding 15-minute buffer times between sessions for note-taking. Your peak productivity hours are 10 AM - 2 PM.",
            'default': "I'm analyzing your request. Based on your patient data and practice patterns, I can help with treatment planning, session preparation, or patient insights. What specific information would you like me to focus on?"
        };
        
        const lowerMessage = userMessage.toLowerCase();
        
        for (const [key, response] of Object.entries(responses)) {
            if (lowerMessage.includes(key)) {
                return response;
            }
        }
        
        return responses.default;
    }

    // Assistant event listeners
    assistantSendBtn.addEventListener('click', sendAssistantMessage);
    assistantChatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendAssistantMessage();
        }
    });

    // Quick response buttons
    window.sendQuickAssistantMessage = function(message) {
        assistantChatInput.value = message;
        sendAssistantMessage();
    };

    // Assistant feature functions
    window.openAssistantFeature = function(feature) {
        const featureMessages = {
            'patient-analysis': "I'll analyze your patient data to identify patterns, progress trends, and areas needing attention. This includes mood tracking, session attendance, and treatment response rates.",
            'session-prep': "I'll prepare comprehensive session notes based on previous sessions, patient progress, and current concerns. This includes suggested discussion topics and therapeutic interventions.",
            'treatment-plan': "I'll help develop personalized treatment plans based on patient assessments, progress data, and evidence-based therapeutic approaches.",
            'progress-tracking': "I'll track patient progress across multiple metrics including mood scores, session attendance, homework completion, and self-reported improvements."
        };
        
        addAssistantMessage(featureMessages[feature] || "Feature analysis in progress...", 'ai');
    };

    // Quick action functions
    window.generateSessionNotes = function() {
        addAssistantMessage("Generating session notes for today's appointments...", 'ai');
        setTimeout(() => {
            addAssistantMessage("Session notes generated successfully! I've prepared detailed notes for Sarah Johnson (anxiety management focus) and Michael Rodriguez (depression treatment progress).", 'ai');
        }, 2000);
    };

    window.analyzePatientData = function() {
        addAssistantMessage("Analyzing patient data across all metrics...", 'ai');
        setTimeout(() => {
            addAssistantMessage("Analysis complete! Key findings: 75% of patients show improvement in primary symptoms, 20% need treatment plan adjustments, 5% require immediate attention.", 'ai');
        }, 2000);
    };

    window.scheduleFollowUp = function() {
        addAssistantMessage("I'll help you schedule follow-up sessions. Based on treatment progress, I recommend scheduling Sarah Johnson for next week and Michael Rodriguez for two weeks.", 'ai');
    };

    // Calendar functionality
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();

    function generateTherapistCalendar() {
        const calendarGrid = document.getElementById('therapistCalendarGrid');
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
            
            // Add availability indicators
            if (day === 15) {
                const event = document.createElement('div');
                event.className = 'calendar-event';
                event.textContent = 'Available';
                event.style.background = '#4caf50';
                dayDiv.appendChild(event);
            }
            
            if (day === 16) {
                const event = document.createElement('div');
                event.className = 'calendar-event';
                event.textContent = 'Booked';
                event.style.background = 'var(--primary-blue)';
                dayDiv.appendChild(event);
            }
            
            if (day === 17) {
                const event = document.createElement('div');
                event.className = 'calendar-event';
                event.textContent = 'Unavailable';
                event.style.background = '#f44336';
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
        generateTherapistCalendar();
    };

    // Initialize calendar
    generateTherapistCalendar();

    // Calendar modal functions
    window.openAvailabilityModal = function() {
        showModal('Set Availability', `
            <div class="modal-content">
                <h3>Set Your Availability</h3>
                <div class="form-group">
                    <label>Date Range:</label>
                    <input type="date" id="startDate">
                    <input type="date" id="endDate">
                </div>
                <div class="form-group">
                    <label>Available Times:</label>
                    <div class="time-slots">
                        <label><input type="checkbox"> 9:00 AM - 10:00 AM</label>
                        <label><input type="checkbox"> 10:00 AM - 11:00 AM</label>
                        <label><input type="checkbox"> 11:00 AM - 12:00 PM</label>
                        <label><input type="checkbox"> 2:00 PM - 3:00 PM</label>
                        <label><input type="checkbox"> 3:00 PM - 4:00 PM</label>
                        <label><input type="checkbox"> 4:00 PM - 5:00 PM</label>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="saveAvailability()">Save Availability</button>
                    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                </div>
            </div>
        `);
    };

    window.openSessionModal = function() {
        showModal('Schedule Session', `
            <div class="modal-content">
                <h3>Schedule New Session</h3>
                <div class="form-group">
                    <label>Patient:</label>
                    <select>
                        <option>Sarah Johnson</option>
                        <option>Michael Rodriguez</option>
                        <option>Emily Watson</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Date & Time:</label>
                    <input type="datetime-local">
                </div>
                <div class="form-group">
                    <label>Session Type:</label>
                    <select>
                        <option>Initial Consultation</option>
                        <option>Follow-up Session</option>
                        <option>Therapy Session</option>
                        <option>Assessment</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Duration:</label>
                    <select>
                        <option>30 minutes</option>
                        <option>45 minutes</option>
                        <option>50 minutes</option>
                        <option>60 minutes</option>
                    </select>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="saveSession()">Schedule Session</button>
                    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                </div>
            </div>
        `);
    };

    // Inquiry management functions
    window.respondToInquiry = function(patientId) {
        showModal('Respond to Inquiry', `
            <div class="modal-content">
                <h3>Respond to Patient Inquiry</h3>
                <div class="form-group">
                    <label>Response Template:</label>
                    <select onchange="loadResponseTemplate(this.value)">
                        <option>Select template...</option>
                        <option>Initial Consultation</option>
                        <option>Follow-up Information</option>
                        <option>Emergency Resources</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Your Response:</label>
                    <textarea rows="8" placeholder="Type your response here..."></textarea>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="sendResponse('${patientId}')">Send Response</button>
                    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                </div>
            </div>
        `);
    };

    window.scheduleConsultation = function(patientId) {
        showModal('Schedule Consultation', `
            <div class="modal-content">
                <h3>Schedule Initial Consultation</h3>
                <div class="form-group">
                    <label>Available Time Slots:</label>
                    <div class="time-slots">
                        <label><input type="radio" name="timeSlot"> Tomorrow, 2:00 PM</label>
                        <label><input type="radio" name="timeSlot"> Wednesday, 10:00 AM</label>
                        <label><input type="radio" name="timeSlot"> Friday, 3:00 PM</label>
                    </div>
                </div>
                <div class="form-group">
                    <label>Session Type:</label>
                    <select>
                        <option>Initial Consultation (50 min)</option>
                        <option>Brief Assessment (30 min)</option>
                    </select>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="confirmConsultation('${patientId}')">Schedule Consultation</button>
                    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                </div>
            </div>
        `);
    };

    window.markAsReviewed = function(patientId) {
        const inquiryItem = document.querySelector(`[onclick*="${patientId}"]`).closest('.inquiry-item');
        inquiryItem.classList.remove('new');
        inquiryItem.classList.add('reviewed');
        showNotification('Inquiry marked as reviewed');
    };

    // Patient management functions
    window.viewPatientDetails = function(patientId) {
        showModal('Patient Details', `
            <div class="modal-content">
                <h3>Patient Details</h3>
                <div class="patient-info">
                    <h4>Sarah Johnson</h4>
                    <p><strong>Primary Concerns:</strong> Anxiety, Stress Management</p>
                    <p><strong>Treatment Start:</strong> December 1, 2023</p>
                    <p><strong>Last Session:</strong> December 14, 2024</p>
                    <p><strong>Next Session:</strong> December 16, 2024</p>
                </div>
                <div class="patient-progress">
                    <h4>Progress Summary</h4>
                    <p>Sarah has shown significant improvement in anxiety management techniques. Her mood tracking compliance is at 85%. Recommended focus areas: work stress management, sleep hygiene.</p>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="editPatientNotes('${patientId}')">Edit Notes</button>
                    <button class="btn btn-secondary" onclick="closeModal()">Close</button>
                </div>
            </div>
        `);
    };

    window.editPatientNotes = function(patientId) {
        showModal('Edit Patient Notes', `
            <div class="modal-content">
                <h3>Edit Patient Notes</h3>
                <div class="form-group">
                    <label>Session Notes:</label>
                    <textarea rows="10" placeholder="Enter session notes...">Patient showed improvement in anxiety management techniques. Discussed work stress triggers and implemented breathing exercises. Homework: Practice mindfulness 10 minutes daily.</textarea>
                </div>
                <div class="form-group">
                    <label>Treatment Plan Updates:</label>
                    <textarea rows="5" placeholder="Any updates to treatment plan...">Continue CBT techniques, introduce progressive muscle relaxation, monitor sleep patterns.</textarea>
                </div>
                <div class="form-group">
                    <label>Next Session Focus:</label>
                    <textarea rows="3" placeholder="Focus areas for next session...">Review homework completion, discuss sleep hygiene, introduce stress management tools.</textarea>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="savePatientNotes('${patientId}')">Save Notes</button>
                    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                </div>
            </div>
        `);
    };

    window.addNewPatient = function() {
        showModal('Add New Patient', `
            <div class="modal-content">
                <h3>Add New Patient</h3>
                <div class="form-group">
                    <label>Patient Name:</label>
                    <input type="text" placeholder="Enter patient name">
                </div>
                <div class="form-group">
                    <label>Email:</label>
                    <input type="email" placeholder="Enter email address">
                </div>
                <div class="form-group">
                    <label>Primary Concerns:</label>
                    <textarea rows="3" placeholder="Describe primary mental health concerns..."></textarea>
                </div>
                <div class="form-group">
                    <label>Treatment Approach:</label>
                    <select>
                        <option>CBT</option>
                        <option>DBT</option>
                        <option>Mindfulness-Based</option>
                        <option>Psychodynamic</option>
                    </select>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="saveNewPatient()">Add Patient</button>
                    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                </div>
            </div>
        `);
    };

    // Utility functions
    function showModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="closeModal()">
                <div class="modal-container" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h2>${title}</h2>
                        <button class="modal-close" onclick="closeModal()">&times;</button>
                    </div>
                    ${content}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    window.closeModal = function() {
        const modal = document.querySelector('.modal');
        if (modal) {
            modal.remove();
        }
    };

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

    // Add CSS for modals and notifications
    const style = document.createElement('style');
    style.textContent = `
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1000;
        }
        
        .modal-overlay {
            background: rgba(0, 0, 0, 0.5);
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .modal-container {
            background: white;
            border-radius: 15px;
            box-shadow: var(--shadow-hover);
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem 2rem;
            border-bottom: 1px solid var(--border-color);
        }
        
        .modal-header h2 {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--text-dark);
            margin: 0;
        }
        
        .modal-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: var(--text-light);
        }
        
        .modal-content {
            padding: 2rem;
        }
        
        .modal-content h3 {
            font-size: 1.2rem;
            font-weight: 600;
            color: var(--text-dark);
            margin-bottom: 1rem;
        }
        
        .modal-content .form-group {
            margin-bottom: 1.5rem;
        }
        
        .modal-content label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: var(--text-dark);
        }
        
        .modal-content input,
        .modal-content select,
        .modal-content textarea {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid var(--border-color);
            border-radius: 8px;
            font-size: 1rem;
        }
        
        .modal-content input:focus,
        .modal-content select:focus,
        .modal-content textarea:focus {
            outline: none;
            border-color: var(--primary-blue);
        }
        
        .time-slots {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        
        .time-slots label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-weight: normal;
            cursor: pointer;
        }
        
        .modal-actions {
            display: flex;
            gap: 1rem;
            justify-content: flex-end;
            margin-top: 2rem;
        }
        
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

    // Save functions
    window.saveAvailability = function() {
        showNotification('Availability saved successfully!');
        closeModal();
    };

    window.saveSession = function() {
        showNotification('Session scheduled successfully!');
        closeModal();
    };

    window.sendResponse = function(patientId) {
        showNotification('Response sent successfully!');
        closeModal();
    };

    window.confirmConsultation = function(patientId) {
        showNotification('Consultation scheduled successfully!');
        closeModal();
    };

    window.savePatientNotes = function(patientId) {
        showNotification('Patient notes saved successfully!');
        closeModal();
    };

    window.saveNewPatient = function() {
        showNotification('New patient added successfully!');
        closeModal();
    };

    // Logout function
    window.logout = function() {
        if (confirm('Are you sure you want to logout?')) {
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

    // Initialize dashboard
    console.log('V-Kare Therapist Dashboard initialized successfully!');
});
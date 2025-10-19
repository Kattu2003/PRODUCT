// Login Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const roleCards = document.querySelectorAll('.role-card');
    const roleSelection = document.getElementById('role-selection');
    const loginForms = document.getElementById('login-forms');
    const signupForms = document.getElementById('signup-forms');
    
    let selectedRole = null;

    // Role selection functionality
    roleCards.forEach(card => {
        card.addEventListener('click', function() {
            // Remove selected class from all cards
            roleCards.forEach(c => c.classList.remove('selected'));
            
            // Add selected class to clicked card
            this.classList.add('selected');
            
            // Store selected role
            selectedRole = this.dataset.role;
            
            // Show login form after a short delay
            setTimeout(() => {
                showLogin(selectedRole);
            }, 300);
        });
    });

    // Show login form based on role
    function showLogin(role) {
        roleSelection.style.display = 'none';
        loginForms.style.display = 'block';
        
        // Hide all login forms
        document.querySelectorAll('.login-form').forEach(form => {
            form.style.display = 'none';
        });
        
        // Show appropriate login form
        const loginForm = document.getElementById(`${role}-login-form`);
        if (loginForm) {
            loginForm.style.display = 'block';
        }
    }

    // Show signup form based on role
    function showSignup(role) {
        roleSelection.style.display = 'none';
        signupForms.style.display = 'block';
        
        // Hide all signup forms
        document.querySelectorAll('.signup-form').forEach(form => {
            form.style.display = 'none';
        });
        
        // Show appropriate signup form
        const signupForm = document.getElementById(`${role}-signup-form`);
        if (signupForm) {
            signupForm.style.display = 'block';
        }
    }

    // Show role selection
    function showRoleSelection() {
        roleSelection.style.display = 'block';
        loginForms.style.display = 'none';
        signupForms.style.display = 'none';
        
        // Clear any error messages
        clearMessages();
    }

    // Form validation
    function validateForm(form) {
        const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!input.value.trim()) {
                input.classList.add('error');
                isValid = false;
            } else {
                input.classList.remove('error');
            }
        });
        
        // Check password confirmation
        const password = form.querySelector('input[name="password"]');
        const confirmPassword = form.querySelector('input[name="confirmPassword"]');
        
        if (password && confirmPassword && password.value !== confirmPassword.value) {
            confirmPassword.classList.add('error');
            isValid = false;
            showMessage('Passwords do not match', 'error');
        }
        
        // Check email format
        const emailInputs = form.querySelectorAll('input[type="email"]');
        emailInputs.forEach(email => {
            if (email.value && !isValidEmail(email.value)) {
                email.classList.add('error');
                isValid = false;
            }
        });
        
        return isValid;
    }

    // Email validation
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Show message
    function showMessage(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = text;
        
        const container = document.querySelector('.login-container');
        const firstChild = container.firstElementChild;
        container.insertBefore(messageDiv, firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 5000);
    }

    // Clear messages
    function clearMessages() {
        const messages = document.querySelectorAll('.message');
        messages.forEach(message => message.remove());
    }

    // Handle form submissions
    document.getElementById('userForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (validateForm(this)) {
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.innerHTML = '<span class="loading"></span> Signing in...';
            submitBtn.disabled = true;
            try {
                const resp = await fetch('/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: data.email, password: data.password, role: 'user' })
                });
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const payload = await resp.json();
                try { localStorage.setItem('currentUser', JSON.stringify(payload.user)); } catch {}
                showMessage('Login successful! Redirecting to dashboard...', 'success');
                setTimeout(() => { window.location.href = 'user-dashboard.html'; }, 800);
            } catch (err) {
                showMessage('Login failed. Please try again.', 'error');
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        }
    });

    document.getElementById('therapistForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (validateForm(this)) {
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.innerHTML = '<span class="loading"></span> Signing in...';
            submitBtn.disabled = true;
            try {
                const resp = await fetch('/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: data.email, password: data.password, role: 'therapist', license: data.license })
                });
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const payload = await resp.json();
                try { localStorage.setItem('currentUser', JSON.stringify(payload.user)); } catch {}
                showMessage('Login successful! Redirecting to dashboard...', 'success');
                setTimeout(() => { window.location.href = 'therapist-dashboard.html'; }, 800);
            } catch (err) {
                showMessage('Login failed. Please try again.', 'error');
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        }
    });

    document.getElementById('userSignupForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        if (validateForm(this)) {
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.innerHTML = '<span class="loading"></span> Creating account...';
            submitBtn.disabled = true;
            try {
                const resp = await fetch('/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: data.email || data.userSignupEmail || data.userEmail || data.userSignupEmail,
                        password: data.password || data.userSignupPassword,
                        firstName: data.firstName || data.userFirstName,
                        lastName: data.lastName || data.userLastName,
                        role: 'user'
                    })
                });
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                showMessage('Account created! Please login.', 'success');
                setTimeout(() => { showLogin('user'); }, 800);
            } catch (err) {
                showMessage('Signup failed. Email may already exist.', 'error');
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        }
    });

    document.getElementById('therapistSignupForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (validateForm(this)) {
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            
            // Show loading state
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.innerHTML = '<span class="loading"></span> Submitting application...';
            submitBtn.disabled = true;
            
            // Simulate API call
            setTimeout(() => {
                // Reset button
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                
                // Simulate successful application
                showMessage('Application submitted successfully! We will review your credentials and contact you within 2-3 business days.', 'success');
                
                // Redirect to login after delay
                setTimeout(() => {
                    showLogin('therapist');
                }, 3000);
            }, 2000);
        }
    });

    // Real-time validation
    document.querySelectorAll('input, select, textarea').forEach(input => {
        input.addEventListener('blur', function() {
            if (this.hasAttribute('required') && !this.value.trim()) {
                this.classList.add('error');
            } else {
                this.classList.remove('error');
            }
        });
        
        input.addEventListener('input', function() {
            if (this.classList.contains('error') && this.value.trim()) {
                this.classList.remove('error');
            }
        });
    });

    // Password strength indicator (optional enhancement)
    function checkPasswordStrength(password) {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        
        return strength;
    }

    // Make functions globally available
    window.showLogin = showLogin;
    window.showSignup = showSignup;
    window.showRoleSelection = showRoleSelection;
});
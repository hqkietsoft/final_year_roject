document.addEventListener('DOMContentLoaded', function() {
    // Update the login button with user name if logged in
    function updateLoginButton(userName) {
        const loginRegisterBtn = document.getElementById('login-register-button');
        if (userName) {
            loginRegisterBtn.innerHTML = `
                <i class="fa-solid fa-user"></i>
                <span class="button-label">${userName}</span>
                <div class="logout-dropdown">
                    <a href="/logout">Logout</a>
                </div>
            `;
            
            // Show dropdown on hover
            loginRegisterBtn.addEventListener('mouseenter', function() {
                const dropdown = this.querySelector('.logout-dropdown');
                if (dropdown) {
                    dropdown.style.display = 'block';
                }
            });
            
            loginRegisterBtn.addEventListener('mouseleave', function() {
                const dropdown = this.querySelector('.logout-dropdown');
                if (dropdown) {
                    dropdown.style.display = 'none';
                }
            });

            // Make sure the logout link works by stopping propagation
            const logoutLink = document.getElementById('logout-link');
            if (logoutLink) {
                logoutLink.addEventListener('click', function(e) {
                    e.stopPropagation();
                    // Let the link navigate to /logout
                });
            }

            document.addEventListener('click', function() {
                const dropdown = document.querySelector('.logout-dropdown');
                if (dropdown) {
                    dropdown.style.display = 'none';
                }
            });
            
        }
    }
    
    // Get user data from the template if available
    const userNameElement = document.getElementById('user-data');
    if (userNameElement) {
        updateLoginButton(userNameElement.dataset.name);
    }
});
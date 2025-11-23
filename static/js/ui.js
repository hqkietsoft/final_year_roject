/**
 * Show notification message
 * @param {string} message - Message to display
 * @param {string} type - Notification type (info, success, warning, error)
 */
export function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.querySelector('.notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'notification';
        document.body.appendChild(notification);
    }
    
    // Set notification type and icon
    notification.className = 'notification';
    notification.classList.add(`notification-${type}`);
    
    let icon;
    switch(type) {
        case 'success': icon = 'fa-circle-check'; break;
        case 'warning': icon = 'fa-triangle-exclamation'; break;
        case 'error':   icon = 'fa-circle-xmark'; break;
        default:        icon = 'fa-circle-info';
    }
    
    // Set content
    notification.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;
    
    // Show notification
    notification.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

/**
 * Add notification styles if not present
 */
export function initNotificationStyles() {
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
                .notification {
                    position: fixed;
                    top: 1rem;
                    left: 50%;
                    transform: translateX(-50%);
                    padding: 0.5rem 1rem; /* Giảm padding */
                    background-color: #ffffff;
                    border-left: 4px solid var(--primary-color); /* Giảm độ dày viền */
                    border-radius: 6px; /* Bo góc nhỏ hơn */
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); /* Đổ bóng nhẹ hơn */
                    font-size: 0.875rem; /* Giảm kích thước chữ */
                    font-weight: 500;
                    color: #333;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem; /* Khoảng cách giữa các phần tử nhỏ hơn */
                    opacity: 0;
                    transform: translateX(-50%) translateY(-20px);
                    transition: opacity 0.3s ease, transform 0.3s ease;
                    z-index: 1000;
                    max-width: 300px; /* Giới hạn chiều rộng nhỏ hơn */
                }

                .notification.show {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }

                .notification i {
                    font-size: 1.25rem; /* Giảm kích thước icon */
                    color: var(--primary-color);
                }

                .notification-success {
                    border-left-color: var(--success-color);
                    background: linear-gradient(135deg, #e6ffe6, #ffffff); /* Gradient xanh nhạt */
                }

                .notification-success i {
                    color: var(--success-color);
                }

                .notification-warning {
                    border-left-color: var(--warning-color);
                    background: linear-gradient(135deg, #fffbe6, #ffffff); /* Gradient vàng nhạt */
                }

                .notification-warning i {
                    color: var (--warning-color);
                }

                .notification-error {
                    border-left-color: var(--error-color);
                    background: linear-gradient(135deg, #ffe6e6, #ffffff); /* Gradient đỏ nhạt */
                }

                .notification-error i {
                    color: var(--error-color);
                }

                /* Hiệu ứng xuất hiện từ trên xuống */
                @keyframes slideDown {
                    from {
                        transform: translateX(-50%) translateY(-40px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(-50%) translateY(0);
                        opacity: 1;
                    }
                }

                /* Hiệu ứng nhún nhảy cho icon */
                @keyframes bounce {
                    0%, 100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-5px);
                    }
                }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Add custom styles for error review
 */
export function addCustomStyles() {
    if (!document.querySelector('#custom-review-styles')) {
        const style = document.createElement('style');
        style.id = 'custom-review-styles';
        style.textContent = `
            /* Main container */
            #errorResults {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                border-top: 1px solid #e5e7eb;
            }
            
            /* Header section */
            .review-header {
                padding: 16px;
                border-bottom: 1px solid #e5e7eb;
            }
            
            .review-title {
                display: flex;
                align-items: center;
            }
            
            .review-title h3 {
                font-size: 16px;
                font-weight: 600;
                color: #111827;
                margin: 0;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .suggestion-count {
                background-color: #6b7280;
                color: white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
            }
            
            /* Tabs section */
            .review-tabs {
                display: flex;
                border-bottom: 1px solid #e5e7eb;
            }
            
            .review-tab {
                flex: 1;
                padding: 12px 8px;
                text-align: center;
                font-size: 14px;
                color: #6b7280;
                cursor: pointer;
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            
            .review-tab.active {
                color: #111827;
                font-weight: 500;
            }
            
            .tab-indicator {
                height: 3px;
                width: 70%;
                position: absolute;
                bottom: 0;
                border-radius: 3px 3px 0 0;
            }
            
            .correctness-indicator {
                background-color: #ef4444;
            }
            
            .clarity-indicator {
                background-color: #3b82f6;
            }
            
            .engagement-indicator {
                background-color: #10b981;
            }
            
            .delivery-indicator {
                background-color: #8b5cf6;
            }
            
            .review-tab.active .tab-indicator {
                opacity: 1;
            }
            
            .review-tab:not(.active) .tab-indicator {
                opacity: 0;
            }
            
            /* Suggestions container */
            .suggestions-container {
                max-height: 500px;
                overflow-y: auto;
            }
            
            /* Individual suggestion items */
            .suggestion-item {
                padding: 16px;
                border-bottom: 1px solid #e5e7eb;
            }
            
            .suggestion-header {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .alert-icon {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background-color: #fee2e2;
                margin-right: 8px;
                position: relative;
            }
            
            .alert-icon:before {
                content: '';
                position: absolute;
                top: 5px;
                left: 5px;
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background-color: #ef4444;
            }
            
            .suggestion-title {
                flex: 1;
                font-size: 14px;
                color: #6b7280;
            }
            
            .info-icon {
                color: #6b7280;
                cursor: pointer;
                font-size: 16px;
            }
            
            .suggestion-body {
                margin: 12px 0;
                font-size: 15px;
                line-height: 1.5;
            }
            
            .suggestion-full {
                display: block;
                color: #111827;
            }
            
            .error-text {
                text-decoration: line-through;
                color: #6b7280;
            }
            
            .suggestion-text {
                color: #111827;
            }
            
            .suggestion-actions {
                display: flex;
                gap: 8px;
            }
            
            .accept-btn {
                background-color: #10b981;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
            }
            
            .dismiss-btn {
                background-color: transparent;
                color: #6b7280;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 14px;
                cursor: pointer;
            }
            
            .more-options-btn {
                background-color: transparent;
                color: #6b7280;
                border: none;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 18px;
                cursor: pointer;
                font-weight: bold;
            }
            
            /* Editor error highlighting */
            .error-highlight {
                text-decoration: underline wavy #ef4444;
                cursor: pointer;
            }
            
            /* Highlight effect */
            .highlight {
                animation: highlight-pulse 1.5s ease;
            }
            
            @keyframes highlight-pulse {
                0% { background-color: transparent; }
                20% { background-color: rgba(239, 68, 68, 0.1); }
                100% { background-color: transparent; }
            }
            
            /* States */
            .suggestion-item.accepted .accept-btn {
                background-color: #d1fae5;
                color: #059669;
                cursor: default;
            }
            
            .suggestion-item.dismissed {
                display: none;
            }
        `;
        document.head.appendChild(style);
    }
}
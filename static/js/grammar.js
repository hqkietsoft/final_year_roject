import { applyCorrections } from './utils.js';
import { showNotification } from './ui.js';
import { enhancedSentenceAnalysis } from './analysis.js';

/**
 * Check grammar in the text
 * @param {string} text - Text to check
 * @param {Function} onSuccess - Success callback
 * @param {Function} onError - Error callback
 */
export function checkGrammar(text, onSuccess, onError) {
    if (!text || text.trim() === '') {
        showNotification('Vui lòng nhập văn bản để kiểm tra cấu trúc!', 'warning');
        return;
    }
    
    // Call API
    fetch('/correct', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: text })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (onSuccess) onSuccess(data);
    })
    .catch(error => {
        if (onError) onError(error.message);
    });
}

/**
 * Display grammar check results
 * @param {Object} data - Grammar check result data
 * @param {HTMLElement} resultsContainer - Container to display results
 * @param {HTMLElement} editor - Text editor element
 */
export function displayGrammarResults(data, resultsContainer, editor) {
    resultsContainer.innerHTML = '';

    // Create and display error count heading with icon
    const errorCount = document.createElement('div');
    errorCount.className = 'error-count';
    
    if (data.errors && data.errors.length > 0) {
        errorCount.innerHTML = `<i class="fa-solid fa-circle-exclamation" style="color: var(--error-color);"></i> <span style="font-size: 1.5rem; font-weight: 500;">Found ${data.errors.length} grammar issues</span>`;
    } else {
        errorCount.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--success-color);"></i> <span style="font-size: 1.5rem; font-weight: 500;">No grammar issues found</span>`;
    }
    
    resultsContainer.appendChild(errorCount);

    if (data.errors && data.errors.length > 0) {
        // Create results container
        const container = document.createElement('div');
        container.className = 'results-container';

        // Group errors by type
        const errorsByType = {};
        data.errors.forEach(error => {
            const type = error.error_type.toLowerCase();
            if (!errorsByType[type]) {
                errorsByType[type] = [];
            }
            errorsByType[type].push(error);
        });

        // Display error list
        const errorList = document.createElement('div');
        errorList.className = 'error-list';
        
        Object.keys(errorsByType).forEach(type => {
            const errorItem = document.createElement('div');
            errorItem.className = 'error-type-item';
            
            // Get appropriate icon and color based on error type
            let iconClass = 'fa-circle-exclamation';
            let typeColor = 'var(--error-color)';
            let letterBadge = '';
            
            if (type.includes('spell')) {
                iconClass = 'fa-spell-check';
                typeColor = '#8b5cf6';
                letterBadge = 'AB';
            } else if (type.includes('capital')) {
                iconClass = 'fa-font';
                typeColor = '#ec4899';
                letterBadge = 'A';
            } else if (type.includes('punctuation')) {
                iconClass = 'fa-period';
                typeColor = '#f97316';
            } else if (type.includes('missing sentence punctuation')) {
                iconClass = 'fa-period';
                typeColor = '#f97316';
            } else if (type.includes('agreement')) {
                iconClass = 'fa-code-merge';
                typeColor = '#0ea5e9';
            } else if (type.includes('article')) {
                iconClass = 'fa-a';
                typeColor = '#6366f1';
            } else if (type.includes('verb tense')) {
                iconClass = 'fa-clock';
                typeColor = '#14b8a6';
            } else if (type.includes('verb form')) {
                iconClass = 'fa-arrows-rotate';
                typeColor = '#0891b2';
            } else if (type.includes('preposition')) {
                iconClass = 'fa-arrows-up-down-left-right';
                typeColor = '#84cc16';
            } else if (type.includes('plural')) {
                iconClass = 'fa-copy';
                typeColor = '#f59e0b';
            } else if (type.includes('pronoun')) {
                iconClass = 'fa-user';
                typeColor = '#d946ef';
            } else if (type.includes('word order')) {
                iconClass = 'fa-arrow-right-arrow-left';
                typeColor = '#0284c7';
            } else if (type.includes('missing')) {
                iconClass = 'fa-circle-plus';
                typeColor = '#ef4444';
            } else if (type.includes('unnecessary')) {
                iconClass = 'fa-circle-minus';
                typeColor = '#dc2626';
            } else if (type.includes('modal')) {
                iconClass = 'fa-code-branch';
                typeColor = '#475569';
            } else {
                iconClass = 'fa-circle-exclamation';
                typeColor = '#ef4444';
            }
            
            // Get error count for this type
            const count = errorsByType[type].length;
            
            errorItem.style.borderLeftColor = typeColor;
            errorItem.innerHTML = `
                <div class="error-type-content">
                    ${letterBadge ? `<span class="letter-badge" style="color: ${typeColor}">${letterBadge}</span>` : 
                    `<i class="fa-solid ${iconClass}" style="color: ${typeColor}; font-size: 1.25rem;"></i>`}
                    <span style="color: ${typeColor}; font-size: 1rem; font-weight: 400;">${type.replace(/1/g, '').charAt(0).toUpperCase() + type.replace(/1/g, '').slice(1)} issues</span>
                </div>
                <span class="error-count-badge" style="font-size: 1rem; font-weight: 400;">${count}</span>
            `;
            
            errorList.appendChild(errorItem);
        });
        
        container.appendChild(errorList);

        // Add comparison table
        const comparisonTable = document.createElement('div');
        comparisonTable.className = 'sentence-correction';
        const correctedText = applyCorrections(editor.innerText, data.errors);
        
        comparisonTable.innerHTML = `
            <div class="text-comparison">
                <div class="text-container original-text" style="font-size: 1rem;">${editor.innerText}</div>
                <div class="arrow" style="font-size: 1.5rem;">→</div>
                <div class="text-container corrected-text" style="font-size: 1rem;">${correctedText}</div>
            </div>
        `;
        container.appendChild(comparisonTable);

        const actionButtons = document.createElement('div');
        actionButtons.className = 'action-buttons';
        actionButtons.style.display = 'flex';
        actionButtons.style.justifyContent = 'space-between';
        actionButtons.style.width = '100%';
        actionButtons.innerHTML = `
            <button class="accept-btn" style="flex: 1; margin: 0 5px 0 0; display: flex; justify-content: center; align-items: center; gap: 8px;">
                <i class="fa-solid fa-check"></i>
                Apply
            </button>
            <button class="analyze-btn" style="flex: 1; margin: 0 5px; display: flex; justify-content: center; align-items: center; gap: 8px;">
                <i class="fa-solid fa-magnifying-glass-chart"></i>
                Structure
            </button>
            <button class="dismiss-btn" style="flex: 1; margin: 0 0 0 5px; display: flex; justify-content: center; align-items: center; gap: 8px;">
                <i class="fa-solid fa-xmark"></i>
                Dismiss
            </button>
        `;
        container.appendChild(actionButtons);

        // Add event listeners for buttons
        const acceptBtn = actionButtons.querySelector('.accept-btn');
        const analyzeBtn = actionButtons.querySelector('.analyze-btn');
        const dismissBtn = actionButtons.querySelector('.dismiss-btn');

        acceptBtn.addEventListener('click', () => {
            editor.innerHTML = correctedText;
            showNotification('All corrections applied successfully', 'success');
            setTimeout(() => {
                const analysisSection = enhancedSentenceAnalysis(correctedText);
                resultsContainer.innerHTML = '';
                resultsContainer.appendChild(analysisSection);
            }, 500);
        });
        
        analyzeBtn.addEventListener('click', () => {
            const analysisSection = enhancedSentenceAnalysis(editor.innerText);
            resultsContainer.innerHTML = '';
            resultsContainer.appendChild(analysisSection);
        });

        dismissBtn.addEventListener('click', () => {
            resultsContainer.style.display = 'none';
        });

        resultsContainer.appendChild(container);
    } else {
        const analysisSection = enhancedSentenceAnalysis(editor.innerText);
        resultsContainer.appendChild(analysisSection);
    }

    resultsContainer.style.display = 'block';
}

/**
 * Calculate and update document score based on grammar check
 * @param {Object} data - Grammar check data
 * @param {HTMLElement} scoreElement - Score display element
 * @param {HTMLElement} editor - Text editor element
 */
export function updateDocumentScore(data, scoreElement, editor) {
    let score = 100;
    
    if (data.errors && data.errors.length > 0) {
        // Reduce score based on number of errors and text length
        const textLength = editor.innerText.trim().length;
        const errorRatio = data.errors.length / (textLength / 100);
        score = Math.max(0, Math.round(100 - (errorRatio * 20)));
    }
    
    // Update score display
    scoreElement.textContent = score;
    
    // Update color based on score
    if (score >= 90) {
        scoreElement.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
        scoreElement.style.color = 'var(--success-color)';
    } else if (score >= 70) {
        scoreElement.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
        scoreElement.style.color = 'var(--warning-color)';
    } else {
        scoreElement.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
        scoreElement.style.color = 'var(--error-color)';
    }
}

/**
 * Display error message
 * @param {string} message - Error message
 * @param {HTMLElement} resultsContainer - Container to display error
 */
export function displayError(message, resultsContainer) {
    resultsContainer.innerHTML = `
        <div class="error-item">
            <div class="error-type">
                <i class="fa-solid fa-triangle-exclamation"></i> Lỗi kết nối
            </div>
            <p>Không thể kết nối đến máy chủ: ${message}</p>
            <p>Vui lòng thử lại sau hoặc kiểm tra kết nối mạng của bạn.</p>
            <button class="apply-correction" onclick="location.reload()">
                <i class="fa-solid fa-rotate"></i> Tải lại trang
            </button>
        </div>
    `;
    resultsContainer.style.display = 'block';
}

/**
 * Reset document score to default state
 * @param {HTMLElement} scoreElement - Score display element
 */
export function resetDocumentScore(scoreElement) {
    scoreElement.textContent = '--';
    scoreElement.style.backgroundColor = 'var(--bg-tertiary)';
    scoreElement.style.color = 'var(--text-secondary)';
}
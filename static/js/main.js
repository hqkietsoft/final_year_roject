import { initNotificationStyles, addCustomStyles, showNotification } from './ui.js';
import { initEditor, updateWordCount, applyFormatting, updatePlaceholder, saveDocument, clearEditorContent } from './editor.js';
import { checkGrammar, displayGrammarResults, updateDocumentScore, displayError } from './grammar.js';
import { enhancedSentenceAnalysis } from './analysis.js';
import { generateAiSuggestions, displayAiSuggestions } from './ai-suggestions.js';
import { initSpeechRecognition } from './speech.js';

document.addEventListener('DOMContentLoaded', function() {
    // ======== DOM Elements ========
    const editor = document.getElementById('text-editor');
    const placeholder = document.querySelector('.placeholder');
    const wordCount = document.querySelector('#word-count span');
    const tabButtons = document.querySelectorAll('.tab-button');
    const checkGrammarButton = document.querySelector('#check-grammar');
    const emptyState = document.querySelector('#empty-state');
    const loadingState = document.querySelector('#loading');
    const errorResults = document.querySelector('#error-results');
    const clearTextButton = document.querySelector('#clear-text');
    const saveDocumentButton = document.querySelector('#save-document');
    const helpButton = document.querySelector('#help-button');
    const helpModal = document.querySelector('#help-modal');
    const closeModalButtons = document.querySelectorAll('.close-modal');
    const formatButtons = document.querySelectorAll('.format-btn');
    const generateSuggestionsButton = document.querySelector('#generate-suggestions');
    const documentScore = document.querySelector('#document-score .score-badge');
    const aiSuggestions = document.querySelector('#ai-suggestions');
    const importFileButton = document.getElementById('import-file');
    const fileInput = document.getElementById('file-input');
    
    // Generate AI suggestions
    if (generateSuggestionsButton) {
        generateSuggestionsButton.addEventListener('click', function() {
            const text = editor.innerText.trim();
            
            if (!text) {
                showNotification('Vui lòng nhập văn bản để tạo gợi ý cải thiện!', 'warning');
                return;
            }
            
            // Show loading in AI tab
            const aiEmptyState = document.querySelector('#ai-content .empty-state');
            aiEmptyState.innerHTML = `
                <div class="spinner"></div>
                <p>Đang phân tích văn bản...</p>
            `;
            aiEmptyState.style.display = 'block';
            aiSuggestions.style.display = 'none';
            
            // Call AI suggestion API
            generateAiSuggestions(
                text,
                (data) => {
                    // Hide empty state, show suggestions
                    aiEmptyState.style.display = 'none';
                    aiSuggestions.style.display = 'block';
                    
                    // Display AI suggestions
                    displayAiSuggestions(data, aiSuggestions, editor);
                },
                (error) => {
                    aiEmptyState.style.display = 'none';
                    aiSuggestions.style.display = 'block';
                    aiSuggestions.innerHTML = `
                        <div class="error-message">
                            <i class="fa-solid fa-triangle-exclamation"></i>
                            <p>Đã xảy ra lỗi khi tạo gợi ý: ${error.message}</p>
                            <button class="btn-primary" onclick="location.reload()">
                                <i class="fa-solid fa-rotate"></i> Thử lại
                            </button>
                        </div>
                    `;
                }
            );
        });
    }

    // State elements group for easier passing around
    const stateElements = {
        emptyState,
        loadingState,
        errorResults
    };

    initSpeechRecognition(editor);
    
    // ======== Initialization ========
    initNotificationStyles();
    addCustomStyles();
    
    // Initialize editor
    initEditor(
        editor, 
        placeholder, 
        () => updateWordCount(editor, wordCount),
        stateElements,
        documentScore
    );
    
    // ======== Event Listeners ========
    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Get the current active tab before changing it
            const previousTab = document.querySelector('.tab-button.active')?.id;
            
            // Remove active class from all tabs
            tabButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Show corresponding content
            const tabId = this.id;
            document.getElementById('grammar-content').style.display = tabId === 'grammar-tab' ? 'block' : 'none';
            document.getElementById('ai-content').style.display = tabId === 'ai-tab' ? 'block' : 'none';
            
            // If switching to grammar tab from AI tab, trigger grammar check automatically
            if (tabId === 'grammar-tab' && previousTab === 'ai-tab') {
                const text = editor.innerText.trim();
                
                if (text) {
                    // Show loading state
                    emptyState.style.display = 'none';
                    errorResults.style.display = 'none';
                    loadingState.style.display = 'flex';
                    
                    checkGrammar(
                        text,
                        (data) => {
                            loadingState.style.display = 'none';
                            displayGrammarResults(data, errorResults, editor);
                            updateDocumentScore(data, documentScore, editor);
                        },
                        (error) => {
                            loadingState.style.display = 'none';
                            displayError(error, errorResults);
                        }
                    );
                }
            }
        });
    });
    
    // Grammar check button
    if (checkGrammarButton) {
        checkGrammarButton.addEventListener('click', function() {
            const text = editor.innerText.trim();
            
            // Show loading state
            emptyState.style.display = 'none';
            errorResults.style.display = 'none';
            loadingState.style.display = 'flex';
            
            checkGrammar(
                text,
                (data) => {
                    loadingState.style.display = 'none';
                    displayGrammarResults(data, errorResults, editor);
                    updateDocumentScore(data, documentScore, editor);
                },
                (error) => {
                    loadingState.style.display = 'none';
                    displayError(error, errorResults);
                }
            );
        });
    }
    
    // Format buttons
    formatButtons.forEach(button => {
        button.addEventListener('click', function() {
            const formatAction = this.id.replace('format-', '');
            applyFormatting(formatAction, editor);
        });
    });
    
    // Clear text button
    clearTextButton.addEventListener('click', function() {
        clearEditorContent(
            editor, 
            placeholder, 
            () => updateWordCount(editor, wordCount),
            documentScore,
            stateElements
        );
    });
    
    // Save document button
    saveDocumentButton.addEventListener('click', function() {
        saveDocument(editor);
    });

    // Import file button
    if (importFileButton && fileInput) {
        importFileButton.addEventListener('click', function() {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            // Show loading notification
            showNotification('Đang đọc file...', 'info');
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    // Get file content and insert into editor
                    let content = e.target.result;
                    
                    // Clean content if needed
                    content = content.replace(/\r\n/g, '\n');
                    
                    // Insert into editor
                    editor.innerHTML = content;
                    
                    // Update UI
                    updatePlaceholder(editor, placeholder);
                    updateWordCount(editor, wordCount);
                    
                    // Reset file input for next import
                    fileInput.value = '';
                    
                    showNotification('Đã nhập file thành công', 'success');
                    
                    // Automatically trigger grammar check
                    const text = editor.innerText.trim();
                    if (text) {
                        // Show loading state
                        stateElements.emptyState.style.display = 'none';
                        stateElements.errorResults.style.display = 'none';
                        stateElements.loadingState.style.display = 'flex';
                        
                        // Switch to grammar tab
                        document.getElementById('grammar-tab')?.click();
                        
                        // Perform grammar check
                        checkGrammar(
                            text,
                            (data) => {
                                stateElements.loadingState.style.display = 'none';
                                displayGrammarResults(data, stateElements.errorResults, editor);
                                updateDocumentScore(data, documentScore, editor);
                            },
                            (error) => {
                                stateElements.loadingState.style.display = 'none';
                                displayError(error, stateElements.errorResults);
                            }
                        );
                    }
                } catch (error) {
                    console.error('Error reading file:', error);
                    showNotification('Đã xảy ra lỗi khi đọc file', 'error');
                    fileInput.value = '';
                }
            };
            
            reader.onerror = function() {
                showNotification('Không thể đọc file', 'error');
                fileInput.value = '';
            };
            
            reader.readAsText(file);
        });
    }
    
    // Help modal
    helpButton.addEventListener('click', function() {
        helpModal.classList.add('show');
    });
    
    closeModalButtons.forEach(button => {
        button.addEventListener('click', function() {
            helpModal.classList.remove('show');
        });
    });
    
    // Close modal when clicking outside
    helpModal.addEventListener('click', function(e) {
        if (e.target === helpModal) {
            helpModal.classList.remove('show');
        }
    });
    
    // Font size dropdown toggle
    const fontSizeButton = document.getElementById('format-font-size');
    const fontSizeDropdown = document.querySelector('.font-size-dropdown');
    
    if (fontSizeButton && fontSizeDropdown) {
        fontSizeButton.addEventListener('click', function(e) {
            e.stopPropagation();
            fontSizeDropdown.classList.toggle('show');
        });
        
        // Font size options
        document.querySelectorAll('.font-size-option').forEach(option => {
            option.addEventListener('click', function(e) {
                e.stopPropagation();
                const size = this.getAttribute('data-size');
                document.execCommand('fontSize', false, size);
                fontSizeDropdown.classList.remove('show');
                editor.focus();
            });
        });
        
        // Close font size dropdown when clicking elsewhere
        document.addEventListener('click', function() {
            fontSizeDropdown.classList.remove('show');
        });
    }
    
});
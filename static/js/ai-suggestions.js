import { showNotification } from './ui.js';
import { GEMINI_API_KEY } from './config.js';

/**
 * Generate AI suggestions using Gemini API
 * @param {string} text - Text to analyze and generate suggestions for
 * @param {Function} onSuccess - Success callback function
 * @param {Function} onError - Error callback function
 */
export async function generateAiSuggestions(text, onSuccess, onError) {
    if (!text || text.trim() === '') {
        showNotification('Please enter text to generate improvement suggestions!', 'warning');
        return;
    }

    try {
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

        // Prepare request body
        const requestBody = {
            contents: [{
                parts: [{
                    text: `Analyze the following English text and provide 3-5 suggestions to improve it.
                    For each suggestion:
                    1. Identify a specific issue (grammar, vocabulary, structure, etc.)
                    2. Provide the original problematic text
                    3. Provide an improved version
                    
                    Format each suggestion as JSON objects with the following keys:
                    - type: The type of improvement (e.g., "Grammar correction", "Vocabulary enhancement", etc.)
                    - original: The original text with issues
                    - improved: The improved version
                    
                    Respond ONLY with valid JSON. Example format:
                    {
                      "suggestions": [
                        {
                          "type": "Grammar correction",
                          "original": "The original problematic text",
                          "improved": "The corrected text"
                        },
                        ...
                      ]
                    }
                    
                    Text to analyze:
                    ${text}`
                }]
            }]
        };

        // Call Gemini API directly
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const responseData = await response.json();
        
        // Extract text from the response
        const responseText = responseData.candidates[0].content.parts[0].text;
        
        // Parse JSON from the response text
        // The text might contain markdown formatting or extra text, so we need to extract the JSON
        let jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                        responseText.match(/{[\s\S]*}/);
                        
        let jsonText = jsonMatch ? jsonMatch[0].replace(/```json\n|```/g, '') : responseText;
        
        // Parse the JSON
        const suggestionsData = JSON.parse(jsonText);
        
        if (onSuccess) onSuccess(suggestionsData);
    } catch (error) {
        console.error('Error generating suggestions:', error);
        if (onError) onError(error);
    }
}

/**
 * Display AI suggestions with accept/dismiss buttons
 * @param {Object} suggestionsData - Suggestions data from API
 * @param {HTMLElement} container - Container to display suggestions
 * @param {HTMLElement} editor - Text editor element
 */
export function displayAiSuggestions(suggestionsData, container, editor) {
    // Clear previous suggestions
    container.innerHTML = '';

    // Create heading
    const heading = document.createElement('div');
    heading.className = 'results-heading';
    heading.innerHTML = `
        <h3>Improvement Suggestions</h3>
        <p>AI has analyzed the text and provided the following suggestions:</p>
    `;
    container.appendChild(heading);

    // Create suggestions list
    const suggestionsList = document.createElement('div');
    suggestionsList.className = 'suggestions-list';

    // Add each suggestion
    suggestionsData.suggestions.forEach((suggestion, index) => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item';
        
        suggestionItem.innerHTML = `
            <div class="suggestion-header">
                <i class="fa-solid fa-lightbulb"></i>
                <span>Suggestion ${index + 1}: ${suggestion.type}</span>
            </div>
            <div class="suggestion-content">
                <div class="original-text">
                    <div class="text-label">Original text:</div>
                    <div class="text-content">${suggestion.original}</div>
                </div>
                <div class="suggested-text">
                    <div class="text-label">Suggestion:</div>
                    <div class="text-content">${suggestion.improved}</div>
                </div>
            </div>
            <div class="suggestion-actions">
                <button class="accept-btn" title="Apply this suggestion">
                    <i class="fa-solid fa-check"></i> Apply
                </button>
                <button class="dismiss-btn" title="Dismiss this suggestion">
                    <i class="fa-solid fa-xmark"></i> Dismiss
                </button>
            </div>
        `;
        
        suggestionsList.appendChild(suggestionItem);
    });
    
    container.appendChild(suggestionsList);
    
    // Add event listeners for accept/dismiss buttons
    container.querySelectorAll('.accept-btn').forEach((btn, index) => {
        btn.addEventListener('click', () => {
            applyAiSuggestion(suggestionsData.suggestions[index], editor);
            // Mark this suggestion as applied
            btn.closest('.suggestion-item').classList.add('applied');
            btn.closest('.suggestion-item').style.opacity = '0.5';
            btn.disabled = true;
            btn.nextElementSibling.disabled = true;
            showNotification('Suggestion applied successfully', 'success');
        });
    });
    
    container.querySelectorAll('.dismiss-btn').forEach((btn, index) => {
        btn.addEventListener('click', () => {
            // Mark this suggestion as dismissed
            btn.closest('.suggestion-item').classList.add('dismissed');
            btn.closest('.suggestion-item').style.opacity = '0.5';
            btn.disabled = true;
            btn.previousElementSibling.disabled = true;
            showNotification('Suggestion dismissed', 'info');
        });
    });
}

/**
 * Apply an AI suggestion to the editor
 * @param {Object} suggestion - Suggestion object
 * @param {HTMLElement} editor - Editor element
 */
function applyAiSuggestion(suggestion, editor) {
    const content = editor.innerHTML;
    // Replace the original text with improved text
    const updatedContent = content.replace(
        suggestion.original,
        suggestion.improved
    );
    editor.innerHTML = updatedContent;
}
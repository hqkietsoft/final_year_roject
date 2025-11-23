import { getPosLabel, getPartOfSpeechDescription } from './utils.js';

/**
 * Analyze a sentence into words and their types
 * @param {string} text - Text to analyze
 * @returns {Array} Array of word objects with their types
 */
export function analyzeSentence(text) {
    // Phân tích câu thành các từ và loại từ
    const words = text.trim().split(/\s+/);
    return words.map(word => {
        let type = determineWordType(word);
        return {
            text: word,
            type: type
        };
    });
}

/**
 * Create a sentence component visualization
 * @param {string} text - The text to analyze
 * @returns {HTMLElement} Analysis visualization element
 */
export function enhancedSentenceAnalysis(text) {
    // Get detailed analysis with confidence levels
    const analysis = analyzeSentence(text);
    
    const container = document.createElement('div');
    container.className = 'enhanced-analysis-container';
    
    // Add main header
    const header = document.createElement('div');
    header.className = 'analysis-header';
    header.innerHTML = `
        <h4><i class="fa-solid fa-diagram-project"></i> Sentence Structure Analysis</h4>
        <p class="analysis-subtitle">Visualization of sentence components and grammatical structure</p>
    `;
    container.appendChild(header);
    
    // Create word flow visualization
    const flowVisualization = document.createElement('div');
    flowVisualization.className = 'structure-visualization';
    
    // Create word components with indicators
    const wordsFlow = document.createElement('div');
    wordsFlow.className = 'words-flow';
    
    // Add each word with its type
    analysis.forEach(item => {
        if (item.type === 'sentence_structure') return; // Skip structure item for now
        
        // Convert type to lowercase for CSS classes
        const type = item.type ? item.type.toLowerCase() : 
                    (item.pos ? item.pos.toLowerCase() : 'unknown');
        
        const confidence = item.confidence || 'medium';
        
        const wordComponent = document.createElement('div');
        wordComponent.className = `word-component ${type}`;
        wordComponent.setAttribute('data-confidence', confidence);
        
        // Get user-friendly label for the part of speech
        const posLabel = getPosLabel(item.pos || type);
        
        wordComponent.innerHTML = `
            <span class="word">${item.word || item.text}</span>
            <span class="pos-label">${posLabel}</span>
            ${confidence !== 'high' ? 
                `<span class="confidence-indicator" title="Confidence: ${confidence}"></span>` : ''}
        `;
        
        // Add tooltip explanation on hover
        wordComponent.title = getPartOfSpeechDescription(item.pos || type);
        
        wordsFlow.appendChild(wordComponent);
    });
    
    flowVisualization.appendChild(wordsFlow);
    
    // Add connections between components (optional visual enhancement)
    const connections = createComponentConnections(analysis);
    if (connections) {
        flowVisualization.appendChild(connections);
    }
    
    container.appendChild(flowVisualization);
    
    // Add sentence structure information
    const structureInfo = createStructureInfo(analysis);
    container.appendChild(structureInfo);
    
    return container;
}

/**
 * Create structure information visualization
 * @param {Array} analysis - Analysis data
 * @returns {HTMLElement} Structure info element
 */
function createStructureInfo(analysis) {
    // Find the structure item in the analysis
    const structureItem = analysis.find(item => item.type === 'sentence_structure');
    
    const container = document.createElement('div');
    container.className = 'structure-info';
    
    if (structureItem) {
        if (structureItem.value === 'valid') {
            // Valid structure
            container.innerHTML = `
                <div class="structure-valid">
                    <i class="fa-solid fa-check-circle"></i>
                    <span>Valid sentence structure detected</span>
                </div>
            `;
            
            // Add components breakdown
            if (structureItem.components && structureItem.components.length > 0) {
                const componentsSection = document.createElement('div');
                componentsSection.className = 'structure-components';
                
                structureItem.components.forEach(comp => {
                    const componentEl = document.createElement('div');
                    componentEl.className = `component ${comp.type}`;
                    
                    componentEl.innerHTML = `
                        <div class="component-type">${comp.type.charAt(0).toUpperCase() + comp.type.slice(1)}</div>
                        <div class="component-words">${comp.words.join(' ')}</div>
                    `;
                    
                    componentsSection.appendChild(componentEl);
                });
                
                container.appendChild(componentsSection);
            }
        } else {
            // Invalid structure with suggestions
            container.innerHTML = `
                <div class="structure-invalid">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <span>Potential issues with sentence structure</span>
                </div>
            `;
            
            // Add suggestions if available
            if (structureItem.suggestions && structureItem.suggestions.length > 0) {
                const suggestionsSection = document.createElement('div');
                suggestionsSection.className = 'structure-suggestions';
                
                structureItem.suggestions.forEach(suggestion => {
                    const suggestionEl = document.createElement('div');
                    suggestionEl.className = 'suggestion';
                    suggestionEl.innerHTML = `
                        <i class="fa-solid fa-lightbulb"></i>
                        <span>${suggestion}</span>
                    `;
                    
                    suggestionsSection.appendChild(suggestionEl);
                });
                
                container.appendChild(suggestionsSection);
            }
        }
    }
    
    return container;
}

/**
 * Create connections between word components
 * @param {Array} analysis - Analysis data
 * @returns {HTMLElement|null} Connections element or null
 */
function createComponentConnections(analysis) {
    // This would create visual connections between related components
    // Implementation would depend on how you want to visualize connections
    // For example, SVG lines connecting subject to verb, etc.
    
    // Basic implementation - return null if not implementing
    return null;
}

/**
 * Create a basic sentence analysis display
 * @param {string} text - Text to analyze
 * @returns {HTMLElement} Analysis display element
 */
export function displaySentenceAnalysis(text) {
    const analysis = analyzeSentence(text);
    
    const analysisContainer = document.createElement('div');
    analysisContainer.className = 'sentence-analysis';

    const title = document.createElement('div');
    title.className = 'analysis-title';
    title.textContent = 'Sentence Analysis';
    analysisContainer.appendChild(title);

    const wordList = document.createElement('div');
    wordList.className = 'word-list';

    analysis.forEach(word => {
        const wordItem = document.createElement('div');
        wordItem.className = `word-item ${word.type}`;
        wordItem.innerHTML = `
            <span class="word-text">${word.text}</span>
            <span class="word-type">${word.type}</span>
        `;
        wordList.appendChild(wordItem);
    });

    analysisContainer.appendChild(wordList);
    return analysisContainer;
}

/**
 * Determine the type of a word
 * @param {string} word - Word to analyze
 * @returns {string} Word type
 */
function determineWordType(word) {
    // Danh sách các từ đặc biệt
    const articles = ['a', 'an', 'the'];
    const pronouns = ['i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'];
    const prepositions = ['in', 'on', 'at', 'to', 'for', 'with', 'by', 'of', 'from'];
    const conjunctions = ['and', 'but', 'or', 'nor', 'for', 'yet', 'so'];
    const auxiliaryVerbs = ['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being'];

    word = word.toLowerCase();

    // Kiểm tra dấu câu
    if (/[.,!?]/.test(word)) {
        return 'punctuation';
    }
    // Kiểm tra article
    if (articles.includes(word)) {
        return 'article';
    }
    // Kiểm tra đại từ
    if (pronouns.includes(word)) {
        return 'pronoun';
    }
    // Kiểm tra giới từ
    if (prepositions.includes(word)) {
        return 'preposition';
    }
    // Kiểm tra liên từ
    if (conjunctions.includes(word)) {
        return 'conjunction';
    }
    // Kiểm tra trợ động từ
    if (auxiliaryVerbs.includes(word)) {
        return 'verb';
    }
    // Kiểm tra các dạng khác
    if (/ly$/.test(word)) {
        return 'adverb';
    }
    if (/[aeiou]ble$|ful$|ous$|al$|ive$/.test(word)) {
        return 'adjective';
    }
    if (/ing$|ed$|s$/.test(word)) {
        return 'verb';
    }
    
    // Mặc định là danh từ
    return 'noun';
}
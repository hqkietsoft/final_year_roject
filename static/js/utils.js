/**
 * Create a debounced function
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, delay) {
    let timer;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(context, args), delay);
    };
}

/**
 * Apply grammar corrections to a text
 * @param {string} text - Original text
 * @param {Array} errors - Array of error objects
 * @returns {string} Corrected text
 */
export function applyCorrections(text, errors) {
    let correctedText = text;
    // Sort errors by position to handle overlapping changes
    errors.sort((a, b) => text.indexOf(b.original) - text.indexOf(a.original));
    
    errors.forEach(error => {
        correctedText = correctedText.replace(error.original, error.corrected);
    });
    
    return correctedText;
}

/**
 * Get the label for a part of speech
 * @param {string} pos - Part of speech code
 * @returns {string} User-friendly label
 */
export function getPosLabel(pos) {
    const posMap = {
        'SUBJECT': 'Chủ ngữ',
        'VERB': 'Động từ',
        'OBJECT': 'Tân ngữ',
        'COMPLEMENT': 'Bổ ngữ',
        'ADVERB': 'Trạng từ',
        'ADJECTIVE': 'Tính từ',
        'CONJUNCTION': 'Liên từ',
        'PREPOSITION': 'Giới từ',
        'PRONOUN': 'Đại từ',
        'ARTICLE': 'Mạo từ',
        'INTERJECTION': 'Thán từ',
        'NOUN': 'Danh từ',
        'DETERMINER': 'Từ hạn định',
        'PUNCTUATION': 'Dấu câu'
    };
    
    return posMap[pos] || pos;
}

/**
 * Get descriptive explanation for each part of speech
 * @param {string} pos - Part of speech
 * @returns {string} Description
 */
export function getPartOfSpeechDescription(pos) {
    const descriptions = {
        'noun': 'Nouns name people, places, things, or ideas',
        'verb': 'Verbs express actions, states, or occurrences',
        'adjective': 'Adjectives modify or describe nouns',
        'adverb': 'Adverbs modify verbs, adjectives, or other adverbs',
        'pronoun': 'Pronouns replace nouns',
        'preposition': 'Prepositions show relationships between words',
        'conjunction': 'Conjunctions connect clauses or sentences',
        'interjection': 'Interjections express emotions',
        'article': 'Articles specify or generalize nouns',
        'determiner': 'Determiners identify or quantify nouns',
        'punctuation': 'Punctuation marks organize and clarify text',
        'subject': 'The subject is what the sentence is about',
        'object': 'The object receives the action of the verb',
        'complement': 'Complements complete the meaning of subjects or objects'
    };
    
    return descriptions[pos.toLowerCase()] || `Part of speech: ${pos}`;
}
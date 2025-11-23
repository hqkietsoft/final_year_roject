/**
 * Speech recognition functionality
 */
export function initSpeechRecognition(editor) {
    const speechButton = document.getElementById('speech-to-text');
    const voiceOverlay = document.getElementById('voice-overlay');
    const placeholder = document.querySelector('.placeholder');
    const wordCount = document.querySelector('#word-count span');
    
    // Check if browser supports speech recognition
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        speechButton.setAttribute('disabled', 'true');
        speechButton.setAttribute('title', 'Speech recognition not supported in this browser');
        return;
    }
    
    // Create speech recognition object
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // Configure the recognition
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US'; // Set to English
    
    let isRecording = false;
    let finalTranscript = '';
    
    // Add event listeners
    speechButton.addEventListener('click', toggleSpeechRecognition);
    
    // Handle recording state
    function toggleSpeechRecognition() {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }
    
    function startRecording() {
        isRecording = true;
        finalTranscript = '';
        
        editor.innerHTML = '';
        
        // Show placeholder
        if (placeholder) {
            placeholder.style.display = 'block';
        }
        
        // Reset word count
        if (wordCount) {
            wordCount.textContent = '0 từ';
        }
        
        speechButton.classList.add('recording');
        speechButton.querySelector('i').classList.remove('fa-microphone');
        speechButton.querySelector('i').classList.add('fa-microphone-slash');
        speechButton.querySelector('.button-label').textContent = 'Stop';
        
        // Show voice overlay
        voiceOverlay.classList.remove('hidden');
        
        try {
            recognition.start();
        } catch (e) {
            console.error('Speech recognition error:', e);
        }
    }
    
    function stopRecording() {
        isRecording = false;
        speechButton.classList.remove('recording');
        speechButton.querySelector('i').classList.remove('fa-microphone-slash');
        speechButton.querySelector('i').classList.add('fa-microphone');
        speechButton.querySelector('.button-label').textContent = 'Voice';
        
        // Hide voice overlay
        voiceOverlay.classList.add('hidden');
        
        try {
            recognition.stop();
        } catch (e) {
            console.error('Speech recognition error:', e);
        }
    }
    
    // Handle recognition results
    recognition.onresult = function(event) {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        
        // Hide placeholder as soon as we start getting results
        if (placeholder && (finalTranscript || interimTranscript)) {
            placeholder.style.display = 'none';
        }
        
        // Add interim results to editor with a special class
        if (interimTranscript !== '') {
            const tempElement = document.createElement('span');
            tempElement.classList.add('interim-text');
            tempElement.textContent = interimTranscript;
            
            // Remove any existing interim text
            const existingInterim = editor.querySelector('.interim-text');
            if (existingInterim) {
                existingInterim.remove();
            }
            
            // Add new interim text
            editor.appendChild(tempElement);
        }
    };
    
    // Handle recognition end
    recognition.onend = function() {
        // Remove any interim text
        const interimElement = editor.querySelector('.interim-text');
        if (interimElement) {
            interimElement.remove();
        }
        
        // Add final transcript to editor
        if (finalTranscript !== '') {
            editor.textContent = finalTranscript;
            
            // Hide placeholder
            if (placeholder) {
                placeholder.style.display = 'none';
            }
            
            // Update word count
            if (wordCount) {
                const words = editor.innerText.trim().split(/\s+/).filter(word => word.length > 0);
                wordCount.textContent = words.length + ' từ';
            }
            
            // Trigger input event to invoke any other listeners
            const inputEvent = new Event('input', {
                bubbles: true,
                cancelable: true,
            });
            editor.dispatchEvent(inputEvent);
        }
        
        stopRecording();
    };
    
    // Handle errors
    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        stopRecording();
    };
}
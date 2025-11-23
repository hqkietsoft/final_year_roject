import { showNotification } from './ui.js';
import { debounce } from './utils.js';
import { checkGrammar, displayGrammarResults, updateDocumentScore, displayError, resetDocumentScore } from './grammar.js';

/**
 * Initialize the text editor
 * @param {HTMLElement} editor - Editor element
 * @param {HTMLElement} placeholder - Placeholder element
 * @param {Function} updateWordCount - Word count update function
 * @param {Object} stateElements - State display elements
 * @param {HTMLElement} documentScore - Document score element
 */
export function initEditor(editor, placeholder, updateWordCount, stateElements, documentScore) {
    // Input event - handle content changes, word count, and grammar checking
    editor.addEventListener('input', function() {
        handleEditorInput(editor, placeholder, updateWordCount, stateElements, documentScore);
    });
    
    // Selection events for formatting buttons
    editor.addEventListener('mouseup', updateFormattingButtons);
    editor.addEventListener('keyup', function(e) {
        updateFormattingButtons();
        if (e.key === 'Delete' || e.key === 'Backspace') {
            updatePlaceholder(editor, placeholder);
            if (editor.textContent.trim() === '') {
                resetDocumentScore(documentScore);
            }
        }
    });
    
    // Check after paste
    editor.addEventListener('paste', function() {
        setTimeout(() => updatePlaceholder(editor, placeholder), 0);
    });
    
    // Đảm bảo placeholder hiển thị đúng khi khởi tạo trang
    // Thêm một setTimeout nhỏ để đảm bảo DOM đã load hoàn toàn
    setTimeout(function() {
        if (!editor.textContent.trim()) {
            placeholder.style.display = 'block';
        } else {
            placeholder.style.display = 'none';
        }
    }, 0);
}

/**
 * Handle editor input events
 */
function handleEditorInput(editor, placeholder, updateWordCount, stateElements, documentScore) {
    // Update placeholder
    updatePlaceholder(editor, placeholder);
    
    // Update word count
    updateWordCount();
    
    // Auto check grammar with debounce
    const autoCheckGrammar = createAutoCheckGrammar(editor, stateElements, documentScore);
    autoCheckGrammar();
}

/**
 * Update placeholder visibility
 */
// Replace the updatePlaceholder function in editor.js to fix any placeholder issues
export function updatePlaceholder(editor, placeholder) {
    if (!editor || !placeholder) return;
    
    // Check if editor is empty - strict check for no content including whitespace
    const editorContent = editor.innerText || editor.textContent;
    const isEmpty = !editorContent || editorContent.trim() === '';
    
    // Update placeholder visibility
    placeholder.style.display = isEmpty ? 'block' : 'none';
}

/**
 * Create a debounced auto grammar check function
 */
function createAutoCheckGrammar(editor, stateElements, documentScore) {
    return debounce(() => {
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
        } else {
            // Reset result area state
            stateElements.emptyState.style.display = 'block';
            stateElements.loadingState.style.display = 'none';
            stateElements.errorResults.style.display = 'none';
            
            // Reset document score
            resetDocumentScore(documentScore);
        }
    }, 300); // 300ms after typing stops
}

/**
 * Update formatting buttons state based on current selection
 */
export function updateFormattingButtons() {
    // Bold button
    document.getElementById('format-bold')?.classList.toggle('active', document.queryCommandState('bold'));
    
    // Italic button
    document.getElementById('format-italic')?.classList.toggle('active', document.queryCommandState('italic'));
    
    // Underline button
    document.getElementById('format-underline')?.classList.toggle('active', document.queryCommandState('underline'));
    
    // Heading buttons
    const formatBlock = document.queryCommandValue('formatBlock').toLowerCase();
    document.getElementById('format-h1')?.classList.toggle('active', formatBlock === 'h1');
    document.getElementById('format-h2')?.classList.toggle('active', formatBlock === 'h2');
}

/**
 * Apply formatting to selected text
 * @param {string} action - Formatting action to apply
 * @param {HTMLElement} editor - Editor element to focus after formatting
 */
export function applyFormatting(action, editor) {
    switch(action) {
        case 'bold':
            document.execCommand('bold', false, null);
            break;
            
        case 'italic':
            document.execCommand('italic', false, null);
            break;
            
        case 'underline':
            document.execCommand('underline', false, null);
            break;
            
        case 'h1':
            if (document.queryCommandValue('formatBlock').toLowerCase() === 'h1') {
                document.execCommand('formatBlock', false, '<p>');
            } else {
                document.execCommand('formatBlock', false, '<h1>');
            }
            break;
            
        case 'h2':
            if (document.queryCommandValue('formatBlock').toLowerCase() === 'h2') {
                document.execCommand('formatBlock', false, '<p>');
            } else {
                document.execCommand('formatBlock', false, '<h2>');
            }
            break;
            
        case 'link':
            const url = prompt('Nhập URL liên kết:', 'https://');
            if (url) {
                document.execCommand('createLink', false, url);
            }
            break;
            
        case 'ul':
            document.execCommand('insertUnorderedList', false, null);
            break;
            
        case 'ol':
            document.execCommand('insertOrderedList', false, null);
            break;
            
        case 'clear':
            document.execCommand('removeFormat', false, null);
            break;
    }
    
    // Update formatting buttons state
    updateFormattingButtons();
    
    // Focus back on editor
    if (editor) {
        editor.focus();
    }
}

/**
 * Update word count display
 * @param {HTMLElement} editor - Editor element
 * @param {HTMLElement} wordCountElement - Word count display element
 */
export function updateWordCount(editor, wordCountElement) {
    const text = editor.innerText || '';
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    wordCountElement.textContent = words + ' words';
}

/**
 * Save document to disk
 * @param {HTMLElement} editor - Editor element with content
 */
export async function saveDocument(editor) {
    const text = editor.innerText.trim();

    if (!text) {
        showNotification('Vui lòng nhập nội dung trước khi lưu tài liệu', 'warning');
        return;
    }

    try {
        // Sử dụng File System Access API để chọn vị trí lưu
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: 'document.txt',
            types: [
                {
                    description: 'Text Files',
                    accept: { 'text/plain': ['.txt'] },
                },
            ],
        });

        // Ghi nội dung vào file
        const writableStream = await fileHandle.createWritable();
        await writableStream.write(text);
        await writableStream.close();

        showNotification('Văn bản đã được lưu thành công!', 'success');
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Lỗi khi lưu tài liệu:', error);
            showNotification('Đã xảy ra lỗi khi lưu tài liệu', 'error');
        }
    }
}

/**
 * Clear editor content
 * @param {HTMLElement} editor - Editor element
 * @param {HTMLElement} placeholder - Placeholder element
 * @param {Function} updateWordCount - Word count update function
 * @param {HTMLElement} documentScore - Document score element
 * @param {Object} stateElements - State display elements
 */
export function clearEditorContent(editor, placeholder, updateWordCountFn, documentScore, stateElements) {
    if (editor.textContent.trim() === '') {
        return;
    }
    
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ văn bản?')) {
        editor.innerHTML = '';
        updatePlaceholder(editor, placeholder);
        updateWordCountFn();
        resetDocumentScore(documentScore);
        
        // Reset result area state
        stateElements.emptyState.style.display = 'block';
        stateElements.loadingState.style.display = 'none';
        stateElements.errorResults.style.display = 'none';
    }
}
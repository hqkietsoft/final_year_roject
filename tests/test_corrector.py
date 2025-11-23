# test_corrector.py
from models.corrector import GrammarCorrector
import json

def test_grammar_correction():
    # Initialize the grammar corrector
    corrector = GrammarCorrector()
    
    # Test sentences with grammar errors
    test_sentences = [
        "She don't like cats.",
        "I has been to Paris last year.",
        "They is going to the movies tomorrow.",
        "We iss walk the park tomorrow",
        "He speak English very good."
    ]
    
    # Test each sentence and print results
    for sentence in test_sentences:
        print("\n" + "="*50)
        print(f"Original: {sentence}")
        
        # Get correction
        corrected_text = corrector.correct(sentence)
        print(f"Corrected: {corrected_text}")
        
        # Get detailed analysis
        errors = corrector.analyze_errors(sentence)
        print("\nErrors found:")
        for error in errors:
            print(f"  - Original: '{error['original']}'")
            print(f"    Corrected: '{error['corrected']}'")
            print(f"    Error type: {error['error_type']}")

if __name__ == "__main__":
    test_grammar_correction()
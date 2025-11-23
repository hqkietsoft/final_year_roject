"""Utility functions for grammar correction."""

import json
import re
from collections import Counter

def load_examples(file_path):
    """Load example sentences from JSON file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_corrections(filepath, corrections):
    """Save corrections to a JSON file."""
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(corrections, f, indent=2)

def analyze_errors(error_list):
    """
    Analyze common types of grammar errors.
    
    Args:
        error_list (list): List of error dictionaries
        
    Returns:
        dict: Statistics about error types
    """
    error_types = Counter()
    for error in error_list:
        # This is a simplified classifier - in a real system, 
        # we would use more sophisticated error classification
        orig = error["original"].lower()
        corr = error["corrected"].lower()
        
        if re.search(r'\bis\b', orig) and re.search(r'\bare\b', corr):
            error_types["subject-verb agreement"] += 1
        elif re.search(r'\ba\b', orig) and re.search(r'\ban\b', corr):
            error_types["article usage"] += 1
        elif len(orig.split()) != len(corr.split()):
            error_types["missing/extra words"] += 1
        else:
            error_types["other"] += 1
    
    return dict(error_types)
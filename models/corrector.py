"""Core model for grammar correction."""

import traceback
import torch 
from transformers import T5ForConditionalGeneration, T5Tokenizer, AutoTokenizer
import nltk 
from nltk.tokenize import sent_tokenize
from nltk.tokenize import word_tokenize
from nltk.parse.chart import ChartParser
import logging
import os
import re
from spellchecker import SpellChecker


# Download necessary NLTK data
nltk.download('punkt', quiet=True)

logger = logging.getLogger(__name__)

class PartOfSpeechAnalyzer:
    def __init__(self):
        # Định nghĩa ngữ pháp CFG cho tiếng Anh
        grammar_str = """
                    # Sentence Structure Rules
                    S -> NP VP | NP VP PP | NP AUX VP | NP AUX NP | NP AUX ADJP | NP AUX ADVP
                    S -> INTERJ NP VP | PP NP VP | CONJ S | S CONJ S | S PUNC
                    S -> NP VP ADVP | ADVP NP VP | NP ADVP VP
                    S -> INFTO VP | COMP S | S COMP S
                    
                    # Noun Phrase Rules
                    NP -> DET NOUN | DET ADJ NOUN | DET ADJ ADJ NOUN | PRON | PROP_NOUN | NP PP
                    NP -> DET NOUN PP | NOUN | NP CONJ NP | ADJ NOUN | NUM NOUN | POSS NOUN
                    NP -> DET NUM NOUN | DET NUM ADJ NOUN | POSS ADJ NOUN
                    NP -> NOUN NOUN | ADJ NOUN NOUN | PROP_NOUN NOUN
                    
                    # Verb Phrase Rules
                    VP -> VERB | VERB NP | VERB ADVP | VERB NP PP | VERB PP | AUX VERB | VERB ADJP
                    VP -> AUX VERB NP | VERB INFTO VP | VP CONJ VP | VERB COMP
                    VP -> VERB NP NP | VERB NP INFTO VP | MODAL VERB
                    VP -> BE VERB_ING | HAVE VERB_PP | MODAL HAVE VERB_PP
                    
                    # Prepositional Phrase Rules
                    PP -> PREP NP | PREP VERB_ING NP
                    PP -> PREP PRON | PREP DET NOUN
                    
                    # Adjective Phrase Rules
                    ADJP -> ADJ | ADV ADJ | ADJP CONJ ADJP | ADJ PP
                    ADJP -> ADJ INFTO VP | ADJ COMP S | VERY ADJ
                    
                    # Adverb Phrase Rules
                    ADVP -> ADV | ADV ADV | ADVP CONJ ADVP
                    ADVP -> ADV INFTO VP | VERY ADV
                    
                    # Verb Forms
                    BE -> 'is' | 'are' | 'am' | 'was' | 'were' | 'be' | 'been'
                    HAVE -> 'have' | 'has' | 'had'
                    MODAL -> 'can' | 'could' | 'may' | 'might' | 'must' | 'shall' | 'should' | 'will' | 'would'
                    VERB_ING -> 'running' | 'walking' | 'eating' | 'sleeping' | 'studying' | 'working' | 'playing' | 'writing' | 'reading' | 'speaking'
                    VERB_PP -> 'run' | 'walked' | 'eaten' | 'slept' | 'studied' | 'worked' | 'played' | 'written' | 'read' | 'spoken'
                    VERY -> 'very' | 'really' | 'extremely' | 'quite' | 'rather'
                    
                    # Terminal Categories
                    DET -> 'the' | 'a' | 'an' | 'my' | 'your' | 'this' | 'that' | 'these' | 'those' | 'some' | 'any'
                    DET -> 'every' | 'each' | 'no' | 'all' | 'both' | 'few' | 'many' | 'several'
                    
                    NOUN -> 'book' | 'cat' | 'dog' | 'house' | 'car' | 'student' | 'teacher' | 'computer' | 'city' | 'country'
                    NOUN -> 'food' | 'water' | 'day' | 'time' | 'year' | 'person' | 'man' | 'woman' | 'child' | 'boy' | 'girl'
                    NOUN -> 'friend' | 'family' | 'school' | 'work' | 'job' | 'money' | 'life' | 'world' | 'way' | 'thing'
                    NOUN -> 'problem' | 'question' | 'answer' | 'idea' | 'mind' | 'fact' | 'case' | 'point' | 'system' | 'group'
                    NOUN -> 'company' | 'business' | 'market' | 'team' | 'customer' | 'product' | 'service' | 'price' | 'cost'
                    NOUN -> 'technology' | 'software' | 'data' | 'information' | 'research' | 'development' | 'management'
                    
                    VERB -> 'is' | 'are' | 'am' | 'was' | 'were' | 'be' | 'been' | 'run' | 'walk' | 'read' | 'write' | 'study'
                    VERB -> 'eat' | 'drink' | 'play' | 'work' | 'live' | 'go' | 'come' | 'see' | 'hear' | 'know' | 'think'
                    VERB -> 'feel' | 'want' | 'need' | 'like' | 'love' | 'hate' | 'make' | 'take' | 'give' | 'find' | 'use'
                    VERB -> 'help' | 'start' | 'stop' | 'create' | 'develop' | 'build' | 'design' | 'implement' | 'test'
                    VERB -> 'analyze' | 'evaluate' | 'improve' | 'increase' | 'decrease' | 'change' | 'manage' | 'lead'
                    
                    ADJ -> 'big' | 'small' | 'red' | 'blue' | 'happy' | 'sad' | 'smart' | 'beautiful' | 'ugly' | 'good'
                    ADJ -> 'bad' | 'new' | 'old' | 'young' | 'tall' | 'short' | 'rich' | 'poor' | 'busy' | 'free'
                    ADJ -> 'easy' | 'difficult' | 'important' | 'necessary' | 'possible' | 'impossible' | 'different'
                    ADJ -> 'efficient' | 'effective' | 'innovative' | 'creative' | 'productive' | 'successful' | 'professional'
                    ADJ -> 'technical' | 'scientific' | 'digital' | 'global' | 'local' | 'strategic' | 'operational'
                    
                    ADV -> 'quickly' | 'slowly' | 'carefully' | 'happily' | 'sadly' | 'very' | 'really' | 'too' | 'quite'
                    ADV -> 'almost' | 'always' | 'never' | 'sometimes' | 'often' | 'rarely' | 'usually' | 'here' | 'there'
                    ADV -> 'now' | 'then' | 'today' | 'yesterday' | 'tomorrow' | 'already' | 'still' | 'just' | 'only'
                    ADV -> 'well' | 'better' | 'best' | 'badly' | 'worse' | 'worst' | 'effectively' | 'efficiently'
                    
                    PRON -> 'I' | 'you' | 'he' | 'she' | 'it' | 'we' | 'they' | 'me' | 'him' | 'her' | 'us' | 'them'
                    PRON -> 'mine' | 'yours' | 'his' | 'hers' | 'ours' | 'theirs' | 'myself' | 'yourself' | 'himself'
                    PRON -> 'herself' | 'itself' | 'ourselves' | 'yourselves' | 'themselves' | 'who' | 'whom' | 'whose'
                    
                    PREP -> 'in' | 'on' | 'at' | 'to' | 'from' | 'with' | 'by' | 'for' | 'of' | 'about' | 'between'
                    PREP -> 'among' | 'through' | 'during' | 'before' | 'after' | 'above' | 'below' | 'under' | 'over'
                    PREP -> 'behind' | 'in front of' | 'beside' | 'near' | 'within' | 'without' | 'despite' | 'except'
                    
                    PROP_NOUN -> 'John' | 'Mary' | 'London' | 'Paris' | 'America' | 'China' | 'Germany' | 'France'
                    PROP_NOUN -> 'Japan' | 'Russia' | 'Google' | 'Microsoft' | 'Facebook' | 'Twitter' | 'Amazon' | 'Apple'
                    PROP_NOUN -> 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'
                    PROP_NOUN -> 'January' | 'February' | 'March' | 'April' | 'May' | 'June' | 'July' | 'August'
                    
                    CONJ -> 'and' | 'or' | 'but' | 'so' | 'because' | 'if' | 'when' | 'while' | 'although' | 'though'
                    CONJ -> 'since' | 'until' | 'unless' | 'as' | 'whether' | 'before' | 'after' | 'where' | 'whereas'
                    
                    INTERJ -> 'oh' | 'wow' | 'ouch' | 'hello' | 'hi' | 'goodbye' | 'bye' | 'hey' | 'well' | 'ah'
                    
                    INFTO -> 'to'
                    
                    COMP -> 'that' | 'which' | 'who' | 'whom' | 'whose' | 'where' | 'when' | 'why' | 'how'
                    
                    PUNC -> '.' | '?' | '!' | ',' | ';' | ':'
                    
                    NUM -> 'one' | 'two' | 'three' | 'four' | 'five' | 'first' | 'second' | 'third' | 'fourth' | 'fifth'
                    NUM -> 'many' | 'few' | 'several' | 'some' | 'any' | 'all' | 'both' | 'half' | 'quarter'
                    """
        self.grammar = nltk.CFG.fromstring(grammar_str)
        self.parser = ChartParser(self.grammar)
        
    def analyze_sentence(self, sentence):
        try:
            # Tiền xử lý câu
            sentence = sentence.lower().strip()
            if sentence[-1] in ['.', '?', '!']:
                sentence = sentence[:-1]
            
            tokens = word_tokenize(sentence)
            
            n = len(tokens)
            table = [[set() for _ in range(n)] for _ in range(n)]
            
            for i in range(n):
                word = tokens[i]
                for rule in self.grammar.productions():
                    if rule.is_lexical() and word == rule.rhs()[0]:
                        table[0][i].add(rule.lhs().symbol())
            
            for l in range(1, n):
                for s in range(n - l):
                    for p in range(l):
                        for rule in self.grammar.productions():
                            if not rule.is_lexical():
                                B = rule.rhs()[0]
                                C = rule.rhs()[1]
                                if B in table[p][s] and C in table[l-p-1][s+p+1]:
                                    table[l][s].add(rule.lhs().symbol())
            
            if 'S' in table[n-1][0]:
                return self._get_detailed_analysis(tokens, table)
            else:
                tagged_tokens = nltk.pos_tag(tokens)
                return [
                    {
                        "word": word,
                        "pos": self._map_tag_to_part_of_speech(tag)
                    }
                    for word, tag in tagged_tokens
                ]
                
        except Exception as e:
            print(f"Error in sentence analysis: {str(e)}")
            return []
            
    def _get_detailed_analysis(self, tokens, table):
        """Trích xuất phân tích chi tiết từ bảng CYK"""
        n = len(tokens)
        result = []
        
        # Duyệt qua từng từ và lấy thông tin từ bảng
        for i in range(n):
            word = tokens[i]
            # Lấy tất cả các nhãn có thể có cho từ này
            possible_labels = table[0][i]
            
            # Chọn nhãn phù hợp nhất dựa trên ngữ cảnh
            best_label = None
            for label in possible_labels:
                if label in ['NOUN', 'VERB', 'ADJ', 'ADV', 'PRON', 'PREP', 'DET', 'CONJ', 'INTERJ', 'PROP_NOUN', 'AUX', 'INFTO', 'COMP', 'PUNC', 'POSS', 'NUM']:
                    # Kiểm tra ngữ cảnh để chọn nhãn phù hợp nhất
                    if label == 'NOUN' and i > 0 and 'DET' in table[0][i-1]:
                        best_label = label
                        break
                    elif label == 'VERB' and i > 0 and 'NOUN' in table[0][i-1]:
                        best_label = label
                        break
                    elif label == 'ADJ' and i < n-1 and 'NOUN' in table[0][i+1]:
                        best_label = label
                        break
                    else:
                        best_label = label
            
            if best_label:
                result.append({
                    "word": word,
                    "pos": self._map_category_to_part_of_speech(best_label),
                    "confidence": "high" if len(possible_labels) == 1 else "medium"
                })
            else:
                # Nếu không tìm thấy nhãn phù hợp, sử dụng NLTK POS tagger
                tag = nltk.pos_tag([word])[0][1]
                result.append({
                    "word": word,
                    "pos": self._map_tag_to_part_of_speech(tag),
                    "confidence": "low"
                })
        
        # Thêm thông tin về cấu trúc câu
        if 'S' in table[n-1][0]:
            result.append({
                "type": "sentence_structure",
                "value": "valid",
                "components": self._extract_sentence_components(table, tokens)
            })
        else:
            result.append({
                "type": "sentence_structure",
                "value": "invalid",
                "suggestions": self._generate_structure_suggestions(tokens)
            })
        
        return result
    
    def _extract_sentence_components(self, table, tokens):
        """Trích xuất các thành phần câu từ bảng CYK"""
        n = len(tokens)
        components = []
        
        # Tìm chủ ngữ
        for i in range(n):
            if 'NP' in table[0][i]:
                components.append({
                    "type": "subject",
                    "words": [tokens[i]],
                    "position": i
                })
                break
        
        # Tìm động từ
        for i in range(n):
            if 'VP' in table[0][i]:
                components.append({
                    "type": "verb",
                    "words": [tokens[i]],
                    "position": i
                })
                break
        
        # Tìm tân ngữ
        for i in range(n):
            if 'NP' in table[0][i] and i > 0 and 'VP' in table[0][i-1]:
                components.append({
                    "type": "object",
                    "words": [tokens[i]],
                    "position": i
                })
                break
        
        return components
    
    def _generate_structure_suggestions(self, tokens):
        """Tạo gợi ý cải thiện cấu trúc câu"""
        suggestions = []
        
        # Kiểm tra xem có chủ ngữ không
        has_subject = any(tag[1].startswith('NN') for tag in nltk.pos_tag(tokens))
        if not has_subject:
            suggestions.append("Thiếu chủ ngữ trong câu")
        
        # Kiểm tra xem có động từ không
        has_verb = any(tag[1].startswith('VB') for tag in nltk.pos_tag(tokens))
        if not has_verb:
            suggestions.append("Thiếu động từ trong câu")
        
        # Kiểm tra thứ tự từ
        tags = nltk.pos_tag(tokens)
        for i in range(len(tags)-1):
            if tags[i][1].startswith('VB') and tags[i+1][1].startswith('NN'):
                suggestions.append("Có thể cần điều chỉnh thứ tự từ: động từ nên đứng sau danh từ")
        
        return suggestions
    
    def _map_category_to_part_of_speech(self, category):
        category_map = {
            'NOUN': 'OBJECT',
            'VERB': 'VERB',
            'ADJ': 'ADJECTIVE',
            'ADV': 'ADVERB',
            'PRON': 'PRONOUN',
            'PREP': 'PREPOSITION',
            'DET': 'ARTICLE',
            'CONJ': 'CONJUNCTION',
            'INTERJ': 'INTERJECTION',
            'PROP_NOUN': 'SUBJECT',
            'AUX': 'VERB',
            'INFTO': 'PREPOSITION',
            'COMP': 'CONJUNCTION',
            'PUNC': 'PUNCTUATION',
            'POSS': 'PRONOUN',
            'NUM': 'DETERMINER'
        }
        return category_map.get(category, category)
    
    def _map_tag_to_part_of_speech(self, tag):
        # Ánh xạ từ POS tag của NLTK sang thành phần câu
        tag_map = {
            'NN': 'OBJECT', 'NNS': 'OBJECT', 'NNP': 'SUBJECT', 'NNPS': 'SUBJECT',
            'VB': 'VERB', 'VBD': 'VERB', 'VBG': 'VERB', 'VBN': 'VERB', 'VBP': 'VERB', 'VBZ': 'VERB',
            'JJ': 'ADJECTIVE', 'JJR': 'ADJECTIVE', 'JJS': 'ADJECTIVE',
            'RB': 'ADVERB', 'RBR': 'ADVERB', 'RBS': 'ADVERB',
            'PRP': 'PRONOUN', 'PRP$': 'PRONOUN', 'WP': 'PRONOUN', 'WP$': 'PRONOUN',
            'IN': 'PREPOSITION',
            'DT': 'ARTICLE', 'PDT': 'ARTICLE', 'WDT': 'ARTICLE',
            'CC': 'CONJUNCTION',
            'UH': 'INTERJECTION',
            'TO': 'PREPOSITION',
            'MD': 'VERB',
            'CD': 'DETERMINER'
        }
        return tag_map.get(tag, 'NOUN')

class GrammarCorrector:
    """
    A grammar correction model using T5.
    """
    
    def __init__(self, model_name="models/coedit-large", device="cpu", use_8bit=False):
        """
        Khởi tạo mô hình sửa lỗi ngữ pháp.
        
        Args:
            model_name (str): Tên hoặc đường dẫn của mô hình T5
            device (str): Thiết bị để chạy mô hình ('cuda' hoặc 'cpu')
            use_8bit (bool): Sử dụng lượng tử hóa 8-bit để giảm sử dụng bộ nhớ
        """
        self.device = device
        logger.info(f"Sử dụng thiết bị: {self.device}")
        
        # Trực tiếp sử dụng model coedit-large
        try:
            if os.path.isdir(model_name):
                logger.info(f"Sử dụng model cục bộ từ: {model_name}")
                model_name = os.path.abspath(model_name)
            else:
                logger.info(f"Tải model từ Hugging Face: grammarly/coedit-large")
                model_name = "grammarly/coedit-large"
            
            # Tải mô hình
            logger.info(f"Đang tải model: {model_name}")
            
            logger.info("Đang tải tokenizer...")
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            
            logger.info("Đang tải mô hình (có thể mất vài phút)...")
            
            # Sử dụng định dạng chuẩn cho CPU
            logger.info("Đang tải mô hình ở định dạng chuẩn...")
            self.model = T5ForConditionalGeneration.from_pretrained(model_name)
            self.model = self.model.to(self.device)
            
            logger.info("Đã tải xong model")
                
        except Exception as e:
            logger.error(f"Lỗi khi tải mô hình: {e}")
            logger.error(traceback.format_exc())
            raise

        self.pos_analyzer = PartOfSpeechAnalyzer()
        # Tải các gói NLTK cần thiết
        try:
            nltk.data.find('tokenizers/punkt')
        except LookupError:
            nltk.download('punkt')
        try:
            nltk.data.find('taggers/averaged_perceptron_tagger')
        except LookupError:
            nltk.download('averaged_perceptron_tagger')
        
    def correct_text(self, text, max_length=128):
        sentences = sent_tokenize(text)
        corrected_sentences = []
        
        for sentence in sentences:
            # For T5, we prefix the input with "grammar: "
            input_text = f"grammar: {sentence}"
            
            # Tokenize and prepare for the model
            input_ids = self.tokenizer.encode(input_text, return_tensors="pt").to(self.device)
            
            # Generate corrected output
            outputs = self.model.generate(
                input_ids=input_ids,
                max_length=max_length,
                num_beams=5,
                early_stopping=True
            )
            
            # Decode the generated tokens
            corrected = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            corrected_sentences.append(corrected)
        
        # Join the corrected sentences
        return " ".join(corrected_sentences)
    
    def identify_errors(self, original, corrected):
        errors = []
        if original == corrected:
            return errors
        
        orig_lower = original.lower()
        corr_lower = corrected.lower()
        
        # Track whether the sentence has at least one identified error
        found_specific_error = False

        # First, check for capitalization errors at the beginning of sentences
        if original and corrected and original[0].islower() and corrected[0].isupper():
            errors.append({
                "original": original,
                "corrected": corrected,
                "error_type": "capitalization (sentence beginning)"
            })
            found_specific_error = True

        # Then, check for missing punctuation at the end of sentences
        end_punctuation = ['.', '!', '?']
        if original and corrected and (not original[-1] in end_punctuation) and (corrected[-1] in end_punctuation):
            errors.append({
                "original": original,
                "corrected": corrected,
                "error_type": "missing sentence punctuation"
            })
            found_specific_error = True
        
        # There are some more errors below.
        #Spelling errors - use dedicated spell checker
        spell = SpellChecker()
        orig_words = orig_lower.split()
        misspelled = list(spell.unknown(orig_words))
        
        if misspelled:
            errors.append({
                "original": original,
                "corrected": corrected,
                "error_type": f"spelling: {', '.join(misspelled)}"
            })
            found_specific_error = True


        # Subject-verb agreement errors
        if (re.search(r'\bis\b', orig_lower) and re.search(r'\bare\b', corr_lower)) or \
        (re.search(r'\bis\b', orig_lower) and re.search(r'\bam\b', corr_lower)) or \
        (re.search(r'\bare\b', orig_lower) and re.search(r'\bis\b', corr_lower)) or \
        (re.search(r'\bare\b', orig_lower) and re.search(r'\bam\b', corr_lower)) or \
        (re.search(r'\bam\b', orig_lower) and re.search(r'\bis\b', corr_lower)) or \
        (re.search(r'\bam\b', orig_lower) and re.search(r'\bare\b', corr_lower)) or \
        (re.search(r'\bwas\b', orig_lower) and re.search(r'\bwere\b', corr_lower)) or \
        (re.search(r'\bwere\b', orig_lower) and re.search(r'\bwas\b', corr_lower)) or \
        (re.search(r'\bdon\'t\b', orig_lower) and re.search(r'\bdoesn\'t\b', corr_lower)) or \
        (re.search(r'\bhave\b', orig_lower) and re.search(r'\bhas\b', corr_lower)) or \
        (re.search(r'\b(go|do|play|run|walk|have|fly|eat|run|make|come|get)\b', orig_lower) and 
            re.search(r'\b(goes|does|plays|runs|walks|has|flies|eats|runs|makes|comes|gets)\b', corr_lower)):
            errors.append({
                "original": original,
                "corrected": corrected,
                "error_type": "subject-verb agreement"
            })
            found_specific_error = True
        
        # Article usage errors
        if (re.search(r'\ba\b', orig_lower) and re.search(r'\ban\b', corr_lower)) or \
            (re.search(r'\ban\b', orig_lower) and re.search(r'\ba\b', corr_lower)) or \
            (re.search(r'\bthe\b', orig_lower) and not re.search(r'\bthe\b', corr_lower)) or \
            (not re.search(r'\bthe\b', orig_lower) and re.search(r'\bthe\b', corr_lower)):
            errors.append({
                "original": original,
                "corrected": corrected,
                "error_type": "article usage"
            })
            found_specific_error = True
        
        # Verb tense errors
        if ('yesterday' in orig_lower or 'ago' in orig_lower or 'last' in orig_lower) and \
            (re.search(r'\bgo\b', orig_lower) and re.search(r'\bwent\b', corr_lower)) or \
            (re.search(r'\beat\b', orig_lower) and re.search(r'\bate\b', corr_lower)) or \
            (re.search(r'\bcome\b', orig_lower) and re.search(r'\bcame\b', corr_lower)) or \
            (re.search(r'\bis\b', orig_lower) and re.search(r'\bwas\b', corr_lower)) or \
            (re.search(r'\bfinish\b', orig_lower) and re.search(r'\bfinished\b', corr_lower)) or \
            (re.search(r'\bare\b', orig_lower) and re.search(r'\bwere\b', corr_lower)):
            errors.append({
                "original": original,
                "corrected": corrected,
                "error_type": "verb tense"
            })
            found_specific_error = True
        
        # Verb form errors (past participle, etc.)
        if (re.search(r'\b(eat|see|go|run|write|do|make|speak|take|give|finish)\b', orig_lower) and 
            re.search(r'\b(eaten|seen|gone|run|written|done|made|spoken|taken|given|finished)\b', corr_lower)):
            errors.append({
                "original": original,
                "corrected": corrected,
                "error_type": "verb form"
            })
            found_specific_error = True
        
        # Preposition errors
        orig_preps = re.findall(r'\b(in|on|at|for|to|with|by|about|under|over)\b', orig_lower)
        corr_preps = re.findall(r'\b(in|on|at|for|to|with|by|about|under|over)\b', corr_lower)
        if set(orig_preps) != set(corr_preps):
            errors.append({
                "original": original,
                "corrected": corrected,
                "error_type": "preposition usage"
            })
            found_specific_error = True
        
        # Plural/singular noun errors
        if any(re.search(rf'\b{word[:-1]}\b', corr_lower) for word in orig_lower.split() if word.endswith('s')) or \
            any(re.search(rf'\b{word}s\b', corr_lower) for word in orig_lower.split()):
            errors.append({
                "original": original,
                "corrected": corrected,
                "error_type": "plural/singular noun"
            })
            found_specific_error = True
        
        # Pronoun errors
        orig_pronouns = re.findall(r'\b(he|she|it|they|him|her|them|his|hers|their|theirs)\b', orig_lower)
        corr_pronouns = re.findall(r'\b(he|she|it|they|him|her|them|his|hers|their|theirs)\b', corr_lower)
        if set(orig_pronouns) != set(corr_pronouns):
            errors.append({
                "original": original,
                "corrected": corrected,
                "error_type": "pronoun usage"
            })
            found_specific_error = True
        
        # Word order errors
        if sorted(orig_lower.split()) == sorted(corr_lower.split()) and orig_lower.split() != corr_lower.split():
            errors.append({
                "original": original,
                "corrected": corrected,
                "error_type": "word order"
            })
            found_specific_error = True
        
        # Punctuation errors
        if re.sub(r'[^\w\s]', '', orig_lower) == re.sub(r'[^\w\s]', '', corr_lower) and original != corrected:
            errors.append({
                "original": original,
                "corrected": corrected,
                "error_type": "punctuation"
            })
            found_specific_error = True
        
        # Missing word errors
        if len(original.split()) < len(corrected.split()):
            orig_words = set(orig_lower.split())
            corr_words = set(corr_lower.split())
            missing = corr_words - orig_words
            if missing:
                errors.append({
                    "original": original,
                    "corrected": corrected,
                    "error_type": f"missing word(s): {', '.join(missing)}"
                })
                found_specific_error = True
        
        # Unnecessary word errors
        if len(original.split()) > len(corrected.split()):
            orig_words = set(orig_lower.split())
            corr_words = set(corr_lower.split())
            extra = orig_words - corr_words
            if extra:
                errors.append({
                    "original": original,
                    "corrected": corrected,
                    "error_type": f"unnecessary word(s): {', '.join(extra)}"
                })
                found_specific_error = True
        
        # Modal verb errors
        orig_modals = re.findall(r'\b(can|could|may|might|must|shall|should|will|would)\b', orig_lower)
        corr_modals = re.findall(r'\b(can|could|may|might|must|shall|should|will|would)\b', corr_lower)
        if set(orig_modals) != set(corr_modals):
            errors.append({
                "original": original,
                "corrected": corrected,
                "error_type": "modal verb usage"
            })
            found_specific_error = True
        
        # If no specific error type was identified but the texts differ, add a generic grammar error
        if not found_specific_error and original != corrected:
            errors.append({
                "original": original,
                "corrected": corrected,
                "error_type": "grammar"
            })
        
        return errors

    # Helper function for spelling error detection
    def levenshtein_distance(self, s1, s2):
        """Calculate the Levenshtein distance between two strings."""
        if len(s1) < len(s2):
            return self.levenshtein_distance(s2, s1)
        if len(s2) == 0:
            return len(s1)
        
        previous_row = range(len(s2) + 1)
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row
        
        return previous_row[-1]
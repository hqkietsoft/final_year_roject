# Fix the imports at the top of your file
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import os
import logging
import difflib # Thêm thư viện này để so sánh văn bản

# Import class GrammarCorrector
from models.corrector import GrammarCorrector

app = Flask(__name__)
app.config['SECRET_KEY'] = os.urandom(24)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# User model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)

    def __repr__(self):
        return f'<User {self.name}>'

# Create the database tables
with app.app_context():
    db.create_all()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# --- CẤU HÌNH MODEL ---
# Sử dụng tên trực tiếp trên HuggingFace để Docker tự tải về
model_name = "grammarly/coedit-large"
logging.info("Initializing model...")
# Thêm use_8bit=False để chạy ổn định trên CPU
model = GrammarCorrector(model_name=model_name, device="cpu", use_8bit=False)
logging.info("Model initialized successfully!")

# --- HELPER FUNCTION: Tạo Diff cho Frontend ---
def generate_diff(original, corrected):
    """
    So sánh văn bản gốc và văn bản sửa để tìm ra các lỗi sai.
    Thay thế cho hàm identify_errors cũ.
    """
    matcher = difflib.SequenceMatcher(None, original, corrected)
    errors = []
    
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'replace':
            errors.append({
                'type': 'grammar',
                'original': original[i1:i2],
                'correction': corrected[j1:j2],
                'start_index': i1,
                'end_index': i2,
                'message': f"Change '{original[i1:i2]}' to '{corrected[j1:j2]}'"
            })
        elif tag == 'delete':
            errors.append({
                'type': 'delete',
                'original': original[i1:i2],
                'correction': '',
                'start_index': i1,
                'end_index': i2,
                'message': f"Remove '{original[i1:i2]}'"
            })
        elif tag == 'insert':
            # Với insert, ta gán vào vị trí i1
            errors.append({
                'type': 'insert',
                'original': '',
                'correction': corrected[j1:j2],
                'start_index': i1,
                'end_index': i1, # Insert tại vị trí này
                'message': f"Insert '{corrected[j1:j2]}'"
            })
            
    return errors

@app.route('/')
def index():
    user = None
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
    return render_template('index.html', user=user)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        user = User.query.filter_by(email=email).first()
        
        if not user or not check_password_hash(user.password, password):
            return render_template('login.html', error='Invalid email or password')
        
        # Store user in session
        session['user_id'] = user.id
        
        # Redirect to home page
        return redirect(url_for('index'))
    
    # GET request - show login form
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        # Validate passwords match
        if password != confirm_password:
            return render_template('register.html', error='Passwords do not match')
        
        # Check if email already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return render_template('register.html', error='Email already registered')
        
        # Create new user
        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
        new_user = User(
            name=name,
            email=email,
            password=hashed_password
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        # Auto-login after registration
        session['user_id'] = new_user.id
        
        # Redirect to home page
        return redirect(url_for('index'))
    
    # GET request - show registration form
    return render_template('register.html')

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    return redirect(url_for('index'))

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

@app.route('/correct', methods=['POST'])
def correct():
    try:
        data = request.get_json()
        text = data.get('text', '').strip()
        
        if not text:
            return jsonify({
                'errors': [],
                'sentence_analysis': None,
                'sentence_structure': None
            })

        # 1. Sửa lỗi ngữ pháp (Quan trọng nhất)
        corrected = model.correct_text(text)
        
        # 2. Tạo danh sách lỗi (Sử dụng hàm generate_diff mới)
        # Thay vì gọi model.identify_errors (có thể gây lỗi nếu class chưa update)
        errors = generate_diff(text, corrected)
        
        # 3. Phân tích cấu trúc câu (Optional - Try/Except để tránh crash)
        sentence_analysis = []
        sentence_structure = None
        
        try:
            # Kiểm tra xem pos_analyzer có tồn tại trong model không
            if hasattr(model, 'pos_analyzer') and model.pos_analyzer:
                sentence_analysis = model.pos_analyzer.analyze_sentence(text)
                
                # Tìm thành phần structure
                for item in sentence_analysis:
                    if isinstance(item, dict) and item.get('type') == 'sentence_structure':
                        sentence_structure = item
                        sentence_analysis.remove(item)
                        break
        except Exception as pos_error:
            logging.warning(f"Skipping POS analysis due to error: {pos_error}")
            # Vẫn tiếp tục chạy để trả về kết quả sửa lỗi

        return jsonify({
            'corrected_text': corrected, # Trả về thêm text đã sửa
            'errors': errors,
            'sentence_analysis': sentence_analysis,
            'sentence_structure': sentence_structure
        })

    except Exception as e:
        logging.error(f"Error correcting text: {str(e)}")
        # In ra log chi tiết để debug
        import traceback
        traceback.print_exc()
        
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    # Chạy host 0.0.0.0 để Docker map port được
    app.run(host='0.0.0.0', port=5000, debug=False)
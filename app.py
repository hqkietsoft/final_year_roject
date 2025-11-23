# Fix the imports at the top of your file
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import os
import logging  # Use Python's built-in logging module instead of flask.logging

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

model_path = "models/coedit-large"  
model = GrammarCorrector(model_name=model_path, device="cpu")

# Fix: Remove duplicate route by combining the two index functions
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

        # Phân tích cấu trúc câu
        sentence_analysis = model.pos_analyzer.analyze_sentence(text)
        
        # Sửa lỗi ngữ pháp
        corrected = model.correct_text(text)
        
        # Xác định các lỗi
        errors = model.identify_errors(text, corrected)
        
        # Tìm thành phần cuối cùng là sentence_structure
        sentence_structure = None
        for item in sentence_analysis:
            if isinstance(item, dict) and item.get('type') == 'sentence_structure':
                sentence_structure = item
                sentence_analysis.remove(item)
                break

        return jsonify({
            'errors': errors,
            'sentence_analysis': sentence_analysis,
            'sentence_structure': sentence_structure
        })

    except Exception as e:
        logging.error(f"Error correcting text: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500


if __name__ == '__main__':
    app.run(debug=True)
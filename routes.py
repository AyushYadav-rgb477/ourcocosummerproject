import os
from flask import request, jsonify, send_from_directory, session
from app import app, db
from models import User, Project, Comment, Vote, Collaboration, Donation
from sqlalchemy import desc, func

# Serve static HTML files
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/login.html')
def login_page():
    return send_from_directory('static', 'login.html')

@app.route('/register.html')
def register_page():
    return send_from_directory('static', 'register.html')

@app.route('/dashboard.html')
def dashboard_page():
    return send_from_directory('static', 'dashboard.html')

@app.route('/browse.html')
def browse_page():
    return send_from_directory('static', 'browse.html')

# Serve CSS and JS files
@app.route('/styles.css')
def styles():
    return send_from_directory('static', 'styles.css')

@app.route('/login.css')
def login_css():
    return send_from_directory('static', 'login.css')

@app.route('/register.css')
def register_css():
    return send_from_directory('static', 'register.css')

@app.route('/dashboard.css')
def dashboard_css():
    return send_from_directory('static', 'dashboard.css')

@app.route('/browse.css')
def browse_css():
    return send_from_directory('static', 'browse.css')

@app.route('/js/<path:filename>')
def js_files(filename):
    return send_from_directory('static/js', filename)

# Authentication APIs
@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['username', 'email', 'fullName', 'college', 'password']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if user already exists
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already exists'}), 400
        
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        # Create new user
        user = User()
        user.username = data['username']
        user.email = data['email']
        user.full_name = data['fullName']
        user.college = data['college']
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        # Set session
        session['user_id'] = user.id
        session['username'] = user.username
        
        return jsonify({
            'message': 'Registration successful',
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data.get('username') or not data.get('password'):
            return jsonify({'error': 'Username and password are required'}), 400
        
        user = User.query.filter_by(username=data['username']).first()
        
        if user and user.check_password(data['password']):
            session['user_id'] = user.id
            session['username'] = user.username
            
            return jsonify({
                'message': 'Login successful',
                'user': user.to_dict()
            }), 200
        else:
            return jsonify({'error': 'Invalid username or password'}), 401
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logout successful'}), 200

@app.route('/api/user', methods=['GET'])
def get_current_user():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'user': user.to_dict()}), 200

# Project APIs
@app.route('/api/projects', methods=['GET'])
def get_projects():
    try:
        # Get query parameters
        sort_by = request.args.get('sort', 'recent')  # recent, popular, funding
        category = request.args.get('category', '')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        
        # Build query
        query = Project.query
        
        if category:
            query = query.filter(Project.category == category)
        
        # Apply sorting
        if sort_by == 'popular':
            # Sort by vote count (subquery)
            vote_counts = db.session.query(
                Vote.project_id,
                func.count(Vote.id).label('vote_count')
            ).filter(Vote.is_upvote == True).group_by(Vote.project_id).subquery()
            
            query = query.outerjoin(vote_counts, Project.id == vote_counts.c.project_id)\
                         .order_by(desc(vote_counts.c.vote_count))
        elif sort_by == 'funding':
            query = query.order_by(desc(Project.current_funding))
        else:  # recent
            query = query.order_by(desc(Project.created_at))
        
        # Paginate
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        projects = [project.to_dict() for project in paginated.items]
        
        return jsonify({
            'projects': projects,
            'total': paginated.total,
            'pages': paginated.pages,
            'current_page': page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects', methods=['POST'])
def create_project():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['title', 'description', 'category']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        project = Project()
        project.title = data['title']
        project.description = data['description']
        project.category = data['category']
        project.funding_goal = float(data.get('fundingGoal', 0))
        project.user_id = user_id
        
        db.session.add(project)
        db.session.commit()
        
        return jsonify({
            'message': 'Project created successfully',
            'project': project.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects/<int:project_id>', methods=['GET'])
def get_project(project_id):
    try:
        project = Project.query.get_or_404(project_id)
        return jsonify({'project': project.to_dict()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Vote APIs
@app.route('/api/projects/<int:project_id>/vote', methods=['POST'])
def vote_project(project_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        project = Project.query.get_or_404(project_id)
        
        # Check if user already voted
        existing_vote = Vote.query.filter_by(user_id=user_id, project_id=project_id).first()
        
        if existing_vote:
            # Toggle vote or remove it
            if existing_vote.is_upvote:
                db.session.delete(existing_vote)
                action = 'removed'
            else:
                existing_vote.is_upvote = True
                action = 'updated'
        else:
            # Create new upvote
            vote = Vote()
            vote.user_id = user_id
            vote.project_id = project_id
            vote.is_upvote = True
            db.session.add(vote)
            action = 'added'
        
        db.session.commit()
        
        return jsonify({
            'message': f'Vote {action} successfully',
            'vote_count': project.get_vote_count()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Comment APIs
@app.route('/api/projects/<int:project_id>/comments', methods=['GET'])
def get_comments(project_id):
    try:
        comments = Comment.query.filter_by(project_id=project_id)\
                               .order_by(desc(Comment.created_at)).all()
        return jsonify({
            'comments': [comment.to_dict() for comment in comments]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects/<int:project_id>/comments', methods=['POST'])
def add_comment(project_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        data = request.get_json()
        if not data.get('content'):
            return jsonify({'error': 'Content is required'}), 400
        
        comment = Comment()
        comment.content = data['content']
        comment.user_id = user_id
        comment.project_id = project_id
        
        db.session.add(comment)
        db.session.commit()
        
        return jsonify({
            'message': 'Comment added successfully',
            'comment': comment.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Collaboration APIs
@app.route('/api/projects/<int:project_id>/collaborate', methods=['POST'])
def request_collaboration(project_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        project = Project.query.get_or_404(project_id)
        
        # Check if user is project owner
        if project.user_id == user_id:
            return jsonify({'error': 'Cannot collaborate on your own project'}), 400
        
        # Check if collaboration request already exists
        existing_collab = Collaboration.query.filter_by(
            user_id=user_id, project_id=project_id
        ).first()
        
        if existing_collab:
            return jsonify({'error': 'Collaboration request already exists'}), 400
        
        data = request.get_json()
        collaboration = Collaboration()
        collaboration.user_id = user_id
        collaboration.project_id = project_id
        collaboration.message = data.get('message', '')
        
        db.session.add(collaboration)
        db.session.commit()
        
        return jsonify({
            'message': 'Collaboration request sent successfully',
            'collaboration': collaboration.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Donation APIs
@app.route('/api/projects/<int:project_id>/donate', methods=['POST'])
def donate_to_project(project_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        project = Project.query.get_or_404(project_id)
        data = request.get_json()
        
        amount = float(data.get('amount', 0))
        if amount <= 0:
            return jsonify({'error': 'Invalid donation amount'}), 400
        
        donation = Donation()
        donation.user_id = user_id
        donation.project_id = project_id
        donation.amount = amount
        donation.message = data.get('message', '')
        
        # Update project funding
        project.current_funding += amount
        
        db.session.add(donation)
        db.session.commit()
        
        return jsonify({
            'message': 'Donation successful',
            'donation': donation.to_dict(),
            'new_funding': project.current_funding
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Profile APIs
@app.route('/api/profile', methods=['GET'])
def get_profile():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        user = User.query.get_or_404(user_id)
        return jsonify({'user': user.to_dict()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/profile', methods=['PUT'])
def update_profile():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        user = User.query.get_or_404(user_id)
        data = request.get_json()
        
        # Update basic info
        if data.get('email'):
            user.email = data['email']
        if data.get('full_name'):
            user.full_name = data['full_name']
        if data.get('college'):
            user.college = data['college']
            
        # Update bank details
        if data.get('bank_name'):
            user.bank_name = data['bank_name']
        if data.get('account_holder_name'):
            user.account_holder_name = data['account_holder_name']
        if data.get('account_number'):
            user.account_number = data['account_number']
        if data.get('ifsc_code'):
            user.ifsc_code = data['ifsc_code']
        if data.get('upi_id'):
            user.upi_id = data['upi_id']
        if data.get('preferred_currency'):
            user.preferred_currency = data['preferred_currency']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/generate-qr/<int:project_id>', methods=['GET'])
def generate_donation_qr(project_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        project = Project.query.get_or_404(project_id)
        project_owner = User.query.get_or_404(project.user_id)
        
        # Check if owner has bank details
        if not project_owner.bank_name or not project_owner.account_number:
            return jsonify({'error': 'Project owner has not set up bank details'}), 400
        
        # Generate QR code with payment info
        import qrcode
        from io import BytesIO
        import base64
        
        # Create payment info string
        if project_owner.upi_id:
            # UPI payment
            payment_info = f"upi://pay?pa={project_owner.upi_id}&pn={project_owner.account_holder_name}&tn=Donation for {project.title}"
        else:
            # Bank transfer info
            payment_info = f"Bank: {project_owner.bank_name}\nAccount: {project_owner.account_holder_name}\nNumber: {project_owner.account_number}\nIFSC: {project_owner.ifsc_code}\nProject: {project.title}"
        
        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(payment_info)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return jsonify({
            'qr_code': f'data:image/png;base64,{img_str}',
            'payment_info': {
                'bank_name': project_owner.bank_name,
                'account_holder': project_owner.account_holder_name,
                'account_number': project_owner.account_number,
                'ifsc_code': project_owner.ifsc_code,
                'upi_id': project_owner.upi_id,
                'currency': project_owner.preferred_currency
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/collaborations', methods=['GET'])
def get_user_collaborations():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Get collaborations for user's projects
        user_projects = Project.query.filter_by(user_id=user_id).all()
        project_ids = [p.id for p in user_projects]
        
        collaborations = Collaboration.query.filter(
            Collaboration.project_id.in_(project_ids)
        ).order_by(desc(Collaboration.created_at)).all()
        
        return jsonify({
            'collaborations': [collab.to_dict() for collab in collaborations]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/collaborations/<int:collab_id>/respond', methods=['POST'])
def respond_to_collaboration(collab_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        collaboration = Collaboration.query.get_or_404(collab_id)
        project = Project.query.get_or_404(collaboration.project_id)
        
        # Check if user owns the project
        if project.user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        data = request.get_json()
        action = data.get('action')  # 'accept' or 'reject'
        
        if action not in ['accept', 'reject']:
            return jsonify({'error': 'Invalid action'}), 400
        
        collaboration.status = 'accepted' if action == 'accept' else 'rejected'
        db.session.commit()
        
        return jsonify({
            'message': f'Collaboration request {action}ed successfully',
            'collaboration': collaboration.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Dashboard APIs
@app.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        user_projects = Project.query.filter_by(user_id=user_id).all()
        total_funding = sum(project.current_funding for project in user_projects)
        total_votes = sum(project.get_vote_count() for project in user_projects)
        
        return jsonify({
            'total_projects': len(user_projects),
            'total_funding': total_funding,
            'total_votes': total_votes,
            'projects': [project.to_dict() for project in user_projects]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

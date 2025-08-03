import os
from flask import request, jsonify, send_from_directory, session
from app import app, db
from models import User, Project, Comment, Vote, Collaboration, Donation, DiscussionPost, PostComment, PostLike, PostSave
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

@app.route('/profile.html')
def profile_page():
    return send_from_directory('static', 'profile.html')

@app.route('/discussion.html')
def discussion_page():
    return send_from_directory('static', 'discussion.html')

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

@app.route('/profile.css')
def profile_css():
    return send_from_directory('static', 'profile.css')

@app.route('/discussion.css')
def discussion_css():
    return send_from_directory('static', 'discussion.css')

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

# User profile management endpoint
@app.route('/api/user/profile', methods=['PUT'])
def update_user_profile():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        data = request.get_json()
        user_id = session['user_id']
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Update user profile
        if 'fullName' in data:
            user.full_name = data['fullName']
        if 'college' in data:
            user.college = data['college']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': user.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Database error'}), 500

# Collaborations management endpoint
@app.route('/api/collaborations', methods=['GET'])
def get_user_collaborations():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        user_id = session['user_id']
        
        # Get collaborations where the user owns the project (collaboration requests to them)
        collaborations = db.session.query(Collaboration).join(Project).filter(
            Project.user_id == user_id
        ).order_by(desc(Collaboration.created_at)).all()
        
        return jsonify({
            'collaborations': [collab.to_dict() for collab in collaborations]
        })
        
    except Exception as e:   
        return jsonify({'error': str(e)}), 500

@app.route('/api/collaborations/<int:collab_id>/<action>', methods=['POST'])
def handle_collaboration_action(collab_id, action):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    if action not in ['accept', 'reject']:
        return jsonify({'error': 'Invalid action'}), 400
    
    try:
        user_id = session['user_id']
        
        # Get collaboration and verify user owns the project
        collaboration = db.session.query(Collaboration).join(Project).filter(
            Collaboration.id == collab_id,
            Project.user_id == user_id
        ).first()
        
        if not collaboration:
            return jsonify({'error': 'Collaboration not found'}), 404
        
        collaboration.status = 'accepted' if action == 'accept' else 'rejected'
        db.session.commit()
        
        return jsonify({
            'message': f'Collaboration {action}ed successfully',
            'collaboration': collaboration.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Discussion API endpoints
@app.route('/api/posts', methods=['GET'])
def get_posts():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        post_type = request.args.get('type', 'all')
        
        query = DiscussionPost.query
        
        if post_type != 'all':
            query = query.filter(DiscussionPost.post_type == post_type)
        
        posts = query.order_by(DiscussionPost.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'posts': [post.to_dict() for post in posts.items],
            'has_next': posts.has_next,
            'has_prev': posts.has_prev,
            'total': posts.total
        })
        
    except Exception as e:
        logging.error(f"Error fetching posts: {str(e)}")
        return jsonify({'error': 'Failed to fetch posts'}), 500

@app.route('/api/posts', methods=['POST'])
def create_post():
    if 'user_id' not in session:
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        data = request.get_json()
        
        post = DiscussionPost(
            user_id=session['user_id'],
            title=data.get('title'),
            content=data.get('content'),
            post_type=data.get('type', 'discussion'),
            tags=','.join(data.get('tags', [])) if data.get('tags') else None,
            anonymous=data.get('anonymous', False),
            allow_comments=data.get('allowComments', True),
            poll_options=','.join(data.get('pollOptions', [])) if data.get('pollOptions') else None,
            event_date=datetime.fromisoformat(data.get('eventDate').replace('Z', '+00:00')) if data.get('eventDate') else None,
            event_location=data.get('eventLocation')
        )
        
        db.session.add(post)
        db.session.commit()
        
        return jsonify({'message': 'Post created successfully', 'post': post.to_dict()}), 201
        
    except Exception as e:
        logging.error(f"Error creating post: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to create post'}), 500

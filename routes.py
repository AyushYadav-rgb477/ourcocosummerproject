import os
from flask import request, jsonify, send_from_directory, session
from app import app, db
from models import User, Project, Comment, Vote, Collaboration, Donation, Discussion, DiscussionReply, DiscussionLike
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

@app.route('/discussion.html')
def discussion_page():
    return send_from_directory('static', 'discussion.html')

@app.route('/profile.html')
def profile_page():
    return send_from_directory('static', 'profile.html')

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

@app.route('/discussion.css')
def discussion_css():
    return send_from_directory('static', 'discussion.css')

@app.route('/profile.css')
def profile_css():
    return send_from_directory('static', 'profile.css')

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
        
        # Validate minimum word count for description
        description_words = data['description'].strip().split()
        if len(description_words) < 50:
            return jsonify({'error': 'Project description must be at least 50 words. Please provide more details about your project idea.'}), 400
        
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
        total_collaborations = Collaboration.query.filter_by(user_id=user_id).count()
        
        return jsonify({
            'total_projects': len(user_projects),
            'total_funding': total_funding,
            'total_votes': total_votes,
            'total_collaborations': total_collaborations,
            'projects': [project.to_dict() for project in user_projects]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Discussion APIs
@app.route('/api/discussions', methods=['GET'])
def get_discussions():
    try:
        # Get query parameters
        sort_by = request.args.get('sort', 'recent')  # recent, popular
        category = request.args.get('category', '')
        search = request.args.get('search', '')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        
        # Build query
        query = Discussion.query
        
        if category:
            query = query.filter(Discussion.category == category)
        
        if search:
            query = query.filter(Discussion.title.contains(search) | Discussion.content.contains(search))
        
        # Apply sorting
        if sort_by == 'popular':
            # Sort by like count (subquery)
            like_counts = db.session.query(
                DiscussionLike.discussion_id,
                func.count(DiscussionLike.id).label('like_count')
            ).group_by(DiscussionLike.discussion_id).subquery()
            
            query = query.outerjoin(like_counts, Discussion.id == like_counts.c.discussion_id)\
                         .order_by(desc(like_counts.c.like_count))
        else:  # recent
            query = query.order_by(desc(Discussion.created_at))
        
        # Paginate
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        discussions = [discussion.to_dict() for discussion in paginated.items]
        
        return jsonify({
            'discussions': discussions,
            'total': paginated.total,
            'pages': paginated.pages,
            'current_page': page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/discussions', methods=['POST'])
def create_discussion():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['title', 'content', 'category']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        discussion = Discussion()
        discussion.title = data['title']
        discussion.content = data['content']
        discussion.category = data['category']
        discussion.tags = ','.join(data.get('tags', []))
        discussion.user_id = user_id
        
        db.session.add(discussion)
        db.session.commit()
        
        return jsonify({
            'message': 'Discussion created successfully',
            'discussion': discussion.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/discussions/<int:discussion_id>', methods=['GET'])
def get_discussion(discussion_id):
    try:
        user_id = session.get('user_id')
        discussion = Discussion.query.get_or_404(discussion_id)
        return jsonify({'discussion': discussion.to_dict(user_id)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/discussions/<int:discussion_id>/like', methods=['POST'])
def like_discussion(discussion_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        discussion = Discussion.query.get_or_404(discussion_id)
        
        # Check if user already liked
        existing_like = DiscussionLike.query.filter_by(user_id=user_id, discussion_id=discussion_id).first()
        
        if existing_like:
            # Unlike
            db.session.delete(existing_like)
            is_liked = False
            action = 'removed'
        else:
            # Like
            like = DiscussionLike()
            like.user_id = user_id
            like.discussion_id = discussion_id
            db.session.add(like)
            is_liked = True
            action = 'added'
        
        db.session.commit()
        
        return jsonify({
            'message': f'Like {action} successfully',
            'like_count': discussion.get_like_count(),
            'is_liked': is_liked
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/discussions/<int:discussion_id>/replies', methods=['GET'])
def get_discussion_replies(discussion_id):
    try:
        replies = DiscussionReply.query.filter_by(discussion_id=discussion_id)\
                                     .order_by(desc(DiscussionReply.created_at)).all()
        return jsonify({
            'replies': [reply.to_dict() for reply in replies]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/discussions/<int:discussion_id>/replies', methods=['POST'])
def add_discussion_reply(discussion_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        data = request.get_json()
        if not data.get('content'):
            return jsonify({'error': 'Content is required'}), 400
        
        reply = DiscussionReply()
        reply.content = data['content']
        reply.user_id = user_id
        reply.discussion_id = discussion_id
        
        db.session.add(reply)
        db.session.commit()
        
        return jsonify({
            'message': 'Reply added successfully',
            'reply': reply.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/discussions/stats', methods=['GET'])
def get_discussion_stats():
    try:
        total_discussions = Discussion.query.count()
        active_members = User.query.count()
        ideas_shared = Discussion.query.count() + Project.query.count()
        
        return jsonify({
            'totalDiscussions': total_discussions,
            'activeMembers': active_members,
            'ideasShared': ideas_shared
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Profile API endpoints
@app.route('/api/profile', methods=['PUT'])
def update_profile():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        # Update user fields
        if 'full_name' in data:
            user.full_name = data['full_name']
        if 'email' in data:
            # Check if email is already taken by another user
            existing_user = User.query.filter_by(email=data['email']).first()
            if existing_user and existing_user.id != user_id:
                return jsonify({'error': 'Email already taken'}), 400
            user.email = data['email']
        if 'college' in data:
            user.college = data['college']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/dashboard/user-collaborations', methods=['GET'])
def get_user_collaborations_sent():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Get collaborations requested by the user
        collaborations = db.session.query(
            Collaboration,
            Project.title.label('project_title'),
            User.full_name.label('owner_name')
        ).join(
            Project, Collaboration.project_id == Project.id
        ).join(
            User, Project.user_id == User.id
        ).filter(
            Collaboration.user_id == user_id
        ).all()
        
        collab_list = []
        for collab, project_title, owner_name in collaborations:
            collab_dict = {
                'id': collab.id,
                'message': collab.message,
                'status': collab.status,
                'created_at': collab.created_at.isoformat(),
                'project_title': project_title,
                'owner_name': owner_name
            }
            collab_list.append(collab_dict)
        
        return jsonify({
            'collaborations': collab_list
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/dashboard/user-donations', methods=['GET'])
def get_user_donations():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Get donations made by the user
        donations = db.session.query(
            Donation,
            Project.title.label('project_title'),
            User.full_name.label('owner_name')
        ).join(
            Project, Donation.project_id == Project.id
        ).join(
            User, Project.user_id == User.id
        ).filter(
            Donation.user_id == user_id
        ).order_by(desc(Donation.created_at)).all()
        
        donations_list = []
        for donation, project_title, owner_name in donations:
            donation_dict = {
                'id': donation.id,
                'amount': donation.amount,
                'message': donation.message,
                'created_at': donation.created_at.isoformat(),
                'project_title': project_title,
                'owner_name': owner_name
            }
            donations_list.append(donation_dict)
        
        return jsonify({
            'donations': donations_list
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/dashboard/user-activity', methods=['GET'])
def get_user_activity():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        activities = []
        
        # Recent projects created
        recent_projects = Project.query.filter_by(user_id=user_id)\
            .order_by(desc(Project.created_at)).limit(5).all()
        
        for project in recent_projects:
            activities.append({
                'type': 'project_created',
                'text': f'Created new project "{project.title}"',
                'time': project.created_at.isoformat(),
                'project_id': project.id
            })
        
        # Recent collaborations
        recent_collabs = db.session.query(
            Collaboration, Project.title
        ).join(
            Project, Collaboration.project_id == Project.id
        ).filter(
            Collaboration.user_id == user_id
        ).order_by(desc(Collaboration.created_at)).limit(5).all()
        
        for collab, project_title in recent_collabs:
            activities.append({
                'type': 'collaboration',
                'text': f'Requested collaboration on "{project_title}"',
                'time': collab.created_at.isoformat(),
                'status': collab.status
            })
        
        # Recent donations
        recent_donations = db.session.query(
            Donation, Project.title
        ).join(
            Project, Donation.project_id == Project.id
        ).filter(
            Donation.user_id == user_id
        ).order_by(desc(Donation.created_at)).limit(5).all()
        
        for donation, project_title in recent_donations:
            activities.append({
                'type': 'donation',
                'text': f'Donated ${donation.amount:.2f} to "{project_title}"',
                'time': donation.created_at.isoformat(),
                'amount': donation.amount
            })
        
        # Recent votes
        recent_votes = db.session.query(
            Vote, Project.title
        ).join(
            Project, Vote.project_id == Project.id
        ).filter(
            Vote.user_id == user_id,
            Vote.is_upvote == True
        ).order_by(desc(Vote.created_at)).limit(5).all()
        
        for vote, project_title in recent_votes:
            activities.append({
                'type': 'vote',
                'text': f'Voted for "{project_title}"',
                'time': vote.created_at.isoformat()
            })
        
        # Recent comments
        recent_comments = db.session.query(
            Comment, Project.title
        ).join(
            Project, Comment.project_id == Project.id
        ).filter(
            Comment.user_id == user_id
        ).order_by(desc(Comment.created_at)).limit(5).all()
        
        for comment, project_title in recent_comments:
            activities.append({
                'type': 'comment',
                'text': f'Commented on "{project_title}"',
                'time': comment.created_at.isoformat()
            })
        
        # Sort all activities by time (newest first)
        activities.sort(key=lambda x: x['time'], reverse=True)
        
        # Return only the 10 most recent activities
        return jsonify({
            'activities': activities[:10]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Collaboration management for dashboard
@app.route('/api/collaborations', methods=['GET'])
def get_user_collaborations():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Get collaborations for projects owned by the user
        user_projects = Project.query.filter_by(user_id=user_id).all()
        project_ids = [project.id for project in user_projects]
        
        collaborations = Collaboration.query.filter(
            Collaboration.project_id.in_(project_ids)
        ).all()
        
        return jsonify({
            'collaborations': [collab.to_dict() for collab in collaborations]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/collaborations/<int:collab_id>/accept', methods=['POST'])
def accept_collaboration(collab_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        collaboration = Collaboration.query.get_or_404(collab_id)
        
        # Check if user owns the project
        if collaboration.project.user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        collaboration.status = 'accepted'
        db.session.commit()
        
        return jsonify({
            'message': 'Collaboration request accepted',
            'collaboration': collaboration.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/collaborations/<int:collab_id>/reject', methods=['POST'])
def reject_collaboration(collab_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        collaboration = Collaboration.query.get_or_404(collab_id)
        
        # Check if user owns the project
        if collaboration.project.user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        collaboration.status = 'rejected'
        db.session.commit()
        
        return jsonify({
            'message': 'Collaboration request rejected',
            'collaboration': collaboration.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Notification APIs for dashboard
@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        # For now, return empty notifications since we haven't implemented the notification system yet
        # In a real app, you would query a notifications table
        notifications = []
        
        return jsonify({
            'notifications': notifications,
            'unread_count': 0
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/notifications/count', methods=['GET'])
def get_notification_count():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        # For now, return 0 notifications
        return jsonify({'unread_count': 0}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/notifications/<int:notification_id>/read', methods=['POST'])
def mark_notification_read(notification_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        # For now, just return success
        return jsonify({'message': 'Notification marked as read'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/notifications/mark-all-read', methods=['POST'])
def mark_all_notifications_read():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        # For now, just return success
        return jsonify({'message': 'All notifications marked as read'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/notifications/clear-all', methods=['DELETE'])
def clear_all_notifications():
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        # For now, just return success
        return jsonify({'message': 'All notifications cleared'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

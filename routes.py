import os
import logging
from datetime import datetime
from flask import request, jsonify, send_from_directory, session
from app import app, db
from models import User, Project, Comment, Vote, Collaboration, Donation, DiscussionPost, PostComment, PostLike, PostSave, PostReaction, FollowRequest
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

@app.route('/users.html')
def users_page():
    return send_from_directory('static', 'users.html')



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

@app.route('/users.css')
def users_css():
    return send_from_directory('static', 'users.css')

@app.route('/user-profile.css')
def user_profile_css():
    return send_from_directory('static', 'user-profile.css')

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

@app.route('/api/posts/<int:post_id>/reactions', methods=['POST'])
def toggle_reaction(post_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        data = request.get_json()
        reaction_type = data.get('reaction_type')
        
        if reaction_type not in ['like', 'celebrate', 'support', 'insightful', 'curious']:
            return jsonify({'error': 'Invalid reaction type'}), 400
        
        user_id = session['user_id']
        
        # Check if user already reacted to this post
        existing_reaction = PostReaction.query.filter_by(
            post_id=post_id, user_id=user_id
        ).first()
        
        if existing_reaction:
            if existing_reaction.reaction_type == reaction_type:
                # Remove reaction if same type
                db.session.delete(existing_reaction)
                action = 'removed'
            else:
                # Update reaction type
                existing_reaction.reaction_type = reaction_type
                action = 'updated'
        else:
            # Add new reaction
            new_reaction = PostReaction(
                post_id=post_id,
                user_id=user_id,
                reaction_type=reaction_type
            )
            db.session.add(new_reaction)
            action = 'added'
        
        db.session.commit()
        
        # Get updated post with reaction counts
        post = DiscussionPost.query.get(post_id)
        return jsonify({
            'message': f'Reaction {action}',
            'reaction_counts': post.get_reaction_counts()
        }), 200
        
    except Exception as e:
        logging.error(f"Error toggling reaction: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to update reaction'}), 500

@app.route('/api/posts/<int:post_id>/comments', methods=['GET'])
def get_post_comments(post_id):
    try:
        comments = PostComment.query.filter_by(post_id=post_id)\
                                  .order_by(PostComment.created_at.asc()).all()
        return jsonify({
            'comments': [comment.to_dict() for comment in comments]
        }), 200
    except Exception as e:
        logging.error(f"Error fetching comments: {str(e)}")
        return jsonify({'error': 'Failed to fetch comments'}), 500

@app.route('/api/posts/<int:post_id>/comments', methods=['POST'])
def add_post_comment(post_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        data = request.get_json()
        if not data.get('content'):
            return jsonify({'error': 'Content is required'}), 400
        
        comment = PostComment(
            post_id=post_id,
            user_id=session['user_id'],
            content=data['content'],
            parent_id=data.get('parent_id')
        )
        
        db.session.add(comment)
        
        # Update comment count on post
        post = DiscussionPost.query.get(post_id)
        post.comments_count += 1
        
        db.session.commit()
        
        return jsonify({
            'message': 'Comment added successfully',
            'comment': comment.to_dict()
        }), 201
        
    except Exception as e:
        logging.error(f"Error adding comment: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to add comment'}), 500

# Auth status endpoint for discussion page
@app.route('/api/auth/status', methods=['GET'])
def auth_status():
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
        if user:
            return jsonify({
                'authenticated': True,
                'user': user.to_dict()
            })
    
    return jsonify({'authenticated': False})

# Trending topics endpoint
@app.route('/api/trending-topics', methods=['GET'])
def get_trending_topics():
    try:
        # Get all posts with tags
        posts_with_tags = DiscussionPost.query.filter(
            DiscussionPost.tags.isnot(None),
            DiscussionPost.tags != ''
        ).order_by(DiscussionPost.created_at.desc()).all()
        
        # Count hashtags
        hashtag_counts = {}
        
        for post in posts_with_tags:
            if post.tags:
                tags = [tag.strip() for tag in post.tags.split(',') if tag.strip()]
                for tag in tags:
                    # Ensure tag starts with #
                    if not tag.startswith('#'):
                        tag = '#' + tag
                    
                    if tag in hashtag_counts:
                        hashtag_counts[tag] += 1
                    else:
                        hashtag_counts[tag] = 1
        
        # Sort by count and get top 5
        trending_topics = sorted(hashtag_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        
        # Format for response
        topics_data = []
        for hashtag, count in trending_topics:
            topics_data.append({
                'hashtag': hashtag,
                'count': count
            })
        
        return jsonify({'topics': topics_data}), 200
        
    except Exception as e:
        logging.error(f"Error fetching trending topics: {str(e)}")
        return jsonify({'error': 'Failed to fetch trending topics', 'topics': []}), 500

# Homepage statistics endpoint
@app.route('/api/homepage/stats', methods=['GET'])
def get_homepage_stats():
    try:
        # Count total unique users (Students Connected)
        total_users = User.query.count()
        
        # Count users who made at least one donation (Projects Funded - means users who funded)
        users_who_funded = db.session.query(Donation.user_id).distinct().count()
        
        # Sum of all donations (Total Funding)
        total_funding_result = db.session.query(func.sum(Donation.amount)).scalar()
        total_funding = total_funding_result if total_funding_result else 0.0
        
        return jsonify({
            'students_connected': total_users,
            'projects_funded': users_who_funded,
            'total_funding': total_funding
        }), 200
        
    except Exception as e:
        logging.error(f"Error fetching homepage stats: {str(e)}")
        return jsonify({
            'students_connected': 0,
            'projects_funded': 0,
            'total_funding': 0.0
        }), 500

# User stats endpoint for discussion page
@app.route('/api/user/stats', methods=['GET'])
def get_user_stats():
    if 'user_id' not in session:
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        user_id = session['user_id']
        
        # Count user's posts
        posts_count = DiscussionPost.query.filter_by(user_id=user_id).count()
        
        # Count collaborations (connections) - users who collaborated with this user
        connections_count = Collaboration.query.filter_by(user_id=user_id, status='accepted').count()
        
        return jsonify({
            'posts_count': posts_count,
            'connections_count': connections_count
        }), 200
        
    except Exception as e:
        logging.error(f"Error fetching user stats: {str(e)}")
        return jsonify({
            'posts_count': 0,
            'connections_count': 0
        }), 500

# User discovery and profile APIs
@app.route('/api/users', methods=['GET'])
def get_users():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search_query = request.args.get('search', '')
        
        query = User.query
        
        # Filter by search query if provided
        if search_query:
            query = query.filter(
                db.or_(
                    User.username.contains(search_query),
                    User.full_name.contains(search_query),
                    User.college.contains(search_query)
                )
            )
        
        users = query.order_by(User.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'users': [user.to_dict() for user in users.items],
            'has_next': users.has_next,
            'has_prev': users.has_prev,
            'total': users.total
        }), 200
        
    except Exception as e:
        logging.error(f"Error fetching users: {str(e)}")
        return jsonify({'error': 'Failed to fetch users'}), 500

@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user_profile(user_id):
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get user's projects
        user_projects = Project.query.filter_by(user_id=user_id).order_by(Project.created_at.desc()).all()
        
        # Get user's stats
        posts_count = DiscussionPost.query.filter_by(user_id=user_id).count()
        projects_count = len(user_projects)
        total_funding_received = sum(project.current_funding for project in user_projects)
        
        # Check if current user is following this user
        following_status = 'none'  # none, pending, following
        current_user_id = session.get('user_id')
        
        if current_user_id and current_user_id != user_id:
            follow_request = FollowRequest.query.filter_by(
                follower_id=current_user_id,
                followed_id=user_id
            ).first()
            
            if follow_request:
                if follow_request.status == 'accepted':
                    following_status = 'following'
                elif follow_request.status == 'pending':
                    following_status = 'pending'
        
        return jsonify({
            'user': user.to_dict(),
            'projects': [project.to_dict() for project in user_projects],
            'stats': {
                'posts_count': posts_count,
                'projects_count': projects_count,
                'total_funding_received': total_funding_received,
                'followers_count': FollowRequest.query.filter_by(followed_id=user_id, status='accepted').count(),
                'following_count': FollowRequest.query.filter_by(follower_id=user_id, status='accepted').count()
            },
            'following_status': following_status,
            'can_interact': current_user_id is not None and current_user_id != user_id
        }), 200
        
    except Exception as e:
        logging.error(f"Error fetching user profile: {str(e)}")
        return jsonify({'error': 'Failed to fetch user profile'}), 500

# Follow request management APIs
@app.route('/api/follow-requests', methods=['POST'])
def send_follow_request():
    if 'user_id' not in session:
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        data = request.get_json()
        followed_id = data.get('user_id')
        
        if not followed_id:
            return jsonify({'error': 'User ID is required'}), 400
        
        follower_id = session['user_id']
        
        # Can't follow yourself
        if follower_id == followed_id:
            return jsonify({'error': 'Cannot follow yourself'}), 400
        
        # Check if user exists
        followed_user = User.query.get(followed_id)
        if not followed_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Check if follow request already exists
        existing_request = FollowRequest.query.filter_by(
            follower_id=follower_id,
            followed_id=followed_id
        ).first()
        
        if existing_request:
            if existing_request.status == 'pending':
                return jsonify({'error': 'Follow request already sent'}), 400
            elif existing_request.status == 'accepted':
                return jsonify({'error': 'Already following this user'}), 400
            else:  # rejected - allow resending
                existing_request.status = 'pending'
                existing_request.created_at = datetime.utcnow()
        else:
            # Create new follow request
            follow_request = FollowRequest(
                follower_id=follower_id,
                followed_id=followed_id
            )
            db.session.add(follow_request)
        
        db.session.commit()
        
        return jsonify({'message': 'Follow request sent successfully'}), 201
        
    except Exception as e:
        logging.error(f"Error sending follow request: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to send follow request'}), 500

@app.route('/api/follow-requests', methods=['GET'])
def get_follow_requests():
    if 'user_id' not in session:
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        user_id = session['user_id']
        
        # Get follow requests received by this user
        received_requests = FollowRequest.query.filter_by(
            followed_id=user_id,
            status='pending'
        ).order_by(FollowRequest.created_at.desc()).all()
        
        # Get follow requests sent by this user
        sent_requests = FollowRequest.query.filter_by(
            follower_id=user_id
        ).order_by(FollowRequest.created_at.desc()).all()
        
        return jsonify({
            'received_requests': [req.to_dict() for req in received_requests],
            'sent_requests': [req.to_dict() for req in sent_requests]
        }), 200
        
    except Exception as e:
        logging.error(f"Error fetching follow requests: {str(e)}")
        return jsonify({'error': 'Failed to fetch follow requests'}), 500

@app.route('/api/follow-requests/<int:request_id>/<action>', methods=['POST'])
def handle_follow_request(request_id, action):
    if 'user_id' not in session:
        return jsonify({'error': 'Authentication required'}), 401
    
    if action not in ['accept', 'reject']:
        return jsonify({'error': 'Invalid action'}), 400
    
    try:
        user_id = session['user_id']
        
        # Get follow request and verify user is the one being followed
        follow_request = FollowRequest.query.filter_by(
            id=request_id,
            followed_id=user_id,
            status='pending'
        ).first()
        
        if not follow_request:
            return jsonify({'error': 'Follow request not found'}), 404
        
        follow_request.status = 'accepted' if action == 'accept' else 'rejected'
        db.session.commit()
        
        return jsonify({
            'message': f'Follow request {action}ed successfully',
            'request': follow_request.to_dict()
        }), 200
        
    except Exception as e:
        logging.error(f"Error handling follow request: {str(e)}")
        db.session.rollback()
        return jsonify({'error': f'Failed to {action} follow request'}), 500

# Collaboration request from user profile
@app.route('/api/collaboration-requests', methods=['POST'])
def send_collaboration_request():
    if 'user_id' not in session:
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        data = request.get_json()
        project_id = data.get('project_id')
        message = data.get('message', '')
        
        if not project_id:
            return jsonify({'error': 'Project ID is required'}), 400
        
        user_id = session['user_id']
        
        # Check if project exists
        project = Project.query.get(project_id)
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        # Can't collaborate on your own project
        if project.user_id == user_id:
            return jsonify({'error': 'Cannot collaborate on your own project'}), 400
        
        # Check if collaboration request already exists
        existing_collab = Collaboration.query.filter_by(
            user_id=user_id,
            project_id=project_id
        ).first()
        
        if existing_collab:
            if existing_collab.status == 'pending':
                return jsonify({'error': 'Collaboration request already sent'}), 400
            elif existing_collab.status == 'accepted':
                return jsonify({'error': 'Already collaborating on this project'}), 400
            else:  # rejected - allow resending
                existing_collab.status = 'pending'
                existing_collab.message = message
                existing_collab.created_at = datetime.utcnow()
        else:
            # Create new collaboration request
            collaboration = Collaboration(
                user_id=user_id,
                project_id=project_id,
                message=message
            )
            db.session.add(collaboration)
        
        db.session.commit()
        
        return jsonify({'message': 'Collaboration request sent successfully'}), 201
        
    except Exception as e:
        logging.error(f"Error sending collaboration request: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to send collaboration request'}), 500


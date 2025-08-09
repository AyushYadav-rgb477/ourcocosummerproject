from datetime import datetime
from app import db
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    full_name = db.Column(db.String(200), nullable=False)
    college = db.Column(db.String(200), nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    bio = db.Column(db.Text, nullable=True)
    skills = db.Column(db.Text, nullable=True)
    profile_image = db.Column(db.Text, nullable=True)  # Store base64 image or URL
    phone = db.Column(db.String(20), nullable=True)
    location = db.Column(db.String(200), nullable=True)
    title = db.Column(db.String(200), nullable=True)
    twitter = db.Column(db.String(255), nullable=True)
    linkedin = db.Column(db.String(255), nullable=True)
    github = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    projects = db.relationship('Project', backref='owner', lazy=True, cascade='all, delete-orphan')
    comments = db.relationship('Comment', backref='author', lazy=True, cascade='all, delete-orphan')
    votes = db.relationship('Vote', backref='user', lazy=True, cascade='all, delete-orphan')
    collaborations = db.relationship('Collaboration', backref='collaborator', lazy=True, cascade='all, delete-orphan')
    donations = db.relationship('Donation', backref='donor', lazy=True, cascade='all, delete-orphan')
    discussions = db.relationship('Discussion', backref='author', lazy=True, cascade='all, delete-orphan')
    discussion_replies = db.relationship('DiscussionReply', backref='author', lazy=True, cascade='all, delete-orphan')
    discussion_likes = db.relationship('DiscussionLike', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'college': self.college,
            'bio': self.bio,
            'skills': self.skills,
            'profile_image': self.profile_image,
            'phone': self.phone,
            'location': self.location,
            'title': self.title,
            'twitter': self.twitter,
            'linkedin': self.linkedin,
            'github': self.github,
            'created_at': self.created_at.isoformat()
        }

class Project(db.Model):
    __tablename__ = 'projects'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(100), nullable=False)
    funding_goal = db.Column(db.Float, default=0.0)
    current_funding = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(50), default='active')  # active, completed, paused
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Foreign Keys
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Relationships
    comments = db.relationship('Comment', backref='project', lazy=True, cascade='all, delete-orphan')
    votes = db.relationship('Vote', backref='project', lazy=True, cascade='all, delete-orphan')
    collaborations = db.relationship('Collaboration', backref='project', lazy=True, cascade='all, delete-orphan')
    donations = db.relationship('Donation', backref='project', lazy=True, cascade='all, delete-orphan')
    
    def get_vote_count(self):
        from models import Vote
        return Vote.query.filter_by(project_id=self.id, is_upvote=True).count()
    
    def get_collaboration_count(self):
        from models import Collaboration
        return Collaboration.query.filter_by(project_id=self.id).count()
    
    def get_comment_count(self):
        from models import Comment
        return Comment.query.filter_by(project_id=self.id).count()
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'funding_goal': self.funding_goal,
            'current_funding': self.current_funding,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'owner': self.owner.to_dict() if self.owner else None,
            'vote_count': self.get_vote_count(),
            'collaboration_count': self.get_collaboration_count(),
            'comment_count': self.get_comment_count()
        }

class Comment(db.Model):
    __tablename__ = 'comments'
    
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Foreign Keys
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'content': self.content,
            'created_at': self.created_at.isoformat(),
            'author': self.author.to_dict() if self.author else None
        }

class Vote(db.Model):
    __tablename__ = 'votes'
    
    id = db.Column(db.Integer, primary_key=True)
    is_upvote = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Foreign Keys
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    
    # Ensure one vote per user per project
    __table_args__ = (db.UniqueConstraint('user_id', 'project_id', name='unique_user_project_vote'),)

class Collaboration(db.Model):
    __tablename__ = 'collaborations'
    
    id = db.Column(db.Integer, primary_key=True)
    message = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(50), default='pending')  # pending, accepted, rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Foreign Keys
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    
    # Ensure one collaboration request per user per project
    __table_args__ = (db.UniqueConstraint('user_id', 'project_id', name='unique_user_project_collab'),)
    
    def to_dict(self):
        return {
            'id': self.id,
            'message': self.message,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'collaborator': self.collaborator.to_dict() if self.collaborator else None
        }

class Donation(db.Model):
    __tablename__ = 'donations'
    
    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, nullable=False)
    message = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Foreign Keys
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'amount': self.amount,
            'message': self.message,
            'created_at': self.created_at.isoformat(),
            'donor': self.donor.to_dict() if self.donor else None
        }

class Discussion(db.Model):
    __tablename__ = 'discussions'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(100), nullable=False)
    tags = db.Column(db.Text, nullable=True)  # Store as comma-separated string
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Foreign Keys
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Relationships
    replies = db.relationship('DiscussionReply', backref='discussion', lazy=True, cascade='all, delete-orphan')
    likes = db.relationship('DiscussionLike', backref='discussion', lazy=True, cascade='all, delete-orphan')
    
    def get_like_count(self):
        return DiscussionLike.query.filter_by(discussion_id=self.id).count()
    
    def get_reply_count(self):
        return DiscussionReply.query.filter_by(discussion_id=self.id).count()
    
    def is_liked_by_user(self, user_id):
        return DiscussionLike.query.filter_by(discussion_id=self.id, user_id=user_id).first() is not None
    
    def to_dict(self, current_user_id=None):
        tags_list = [tag.strip() for tag in self.tags.split(',')] if self.tags else []
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'category': self.category,
            'tags': tags_list,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'author': self.author.to_dict() if self.author else None,
            'like_count': self.get_like_count(),
            'reply_count': self.get_reply_count(),
            'is_liked': self.is_liked_by_user(current_user_id) if current_user_id else False,
            'likes': self.get_like_count(),
            'replies': self.get_reply_count()
        }

class DiscussionReply(db.Model):
    __tablename__ = 'discussion_replies'
    
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Foreign Keys
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    discussion_id = db.Column(db.Integer, db.ForeignKey('discussions.id'), nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'content': self.content,
            'created_at': self.created_at.isoformat(),
            'author': self.author.to_dict() if self.author else None
        }

class DiscussionLike(db.Model):
    __tablename__ = 'discussion_likes'
    
    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Foreign Keys
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    discussion_id = db.Column(db.Integer, db.ForeignKey('discussions.id'), nullable=False)
    
    # Ensure one like per user per discussion
    __table_args__ = (db.UniqueConstraint('user_id', 'discussion_id', name='unique_user_discussion_like'),)

class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50), nullable=False)  # comment, like, collaboration, donation, etc.
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Foreign Keys
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)  # recipient
    related_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # actor (who caused the notification)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=True)
    
    # Relationships
    recipient = db.relationship('User', foreign_keys=[user_id], backref='received_notifications')
    actor = db.relationship('User', foreign_keys=[related_user_id], backref='sent_notifications')
    related_project = db.relationship('Project', backref='notifications')
    
    def to_dict(self):
        return {
            'id': self.id,
            'type': self.type,
            'title': self.title,
            'message': self.message,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat(),
            'actor': self.actor.to_dict() if self.actor else None,
            'project': self.related_project.to_dict() if self.related_project else None
        }

class TeamChat(db.Model):
    __tablename__ = 'team_chats'
    
    id = db.Column(db.Integer, primary_key=True)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Foreign Keys
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Relationships
    project = db.relationship('Project', backref='chat_messages')
    author = db.relationship('User', backref='chat_messages')
    
    def to_dict(self):
        return {
            'id': self.id,
            'message': self.message,
            'created_at': self.created_at.isoformat(),
            'author': self.author.to_dict() if self.author else None
        }

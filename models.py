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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Bank details for donations
    bank_name = db.Column(db.String(200), nullable=True)
    account_holder_name = db.Column(db.String(200), nullable=True)
    account_number = db.Column(db.String(50), nullable=True)
    ifsc_code = db.Column(db.String(20), nullable=True)
    upi_id = db.Column(db.String(100), nullable=True)
    preferred_currency = db.Column(db.String(10), default='INR')
    
    # Relationships
    projects = db.relationship('Project', backref='owner', lazy=True, cascade='all, delete-orphan')
    comments = db.relationship('Comment', backref='author', lazy=True, cascade='all, delete-orphan')
    votes = db.relationship('Vote', backref='user', lazy=True, cascade='all, delete-orphan')
    collaborations = db.relationship('Collaboration', backref='collaborator', lazy=True, cascade='all, delete-orphan')
    donations = db.relationship('Donation', backref='donor', lazy=True, cascade='all, delete-orphan')
    
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
            'created_at': self.created_at.isoformat(),
            'bank_name': self.bank_name,
            'account_holder_name': self.account_holder_name,
            'account_number': self.account_number,
            'ifsc_code': self.ifsc_code,
            'upi_id': self.upi_id,
            'preferred_currency': self.preferred_currency
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

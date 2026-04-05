"""
User Serializers for Authentication and User Management

This module contains serializers for user authentication, registration,
password management, and user profile handling in the CTRG Grant System.

Serializers:
    - UserSerializer: Full user profile with role information
    - LoginSerializer: Email/password validation for login
    - UserCreateSerializer: User registration with role assignment
    - ChangePasswordSerializer: Password change validation
    - UserListSerializer: Summary user information for listings
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.urls import reverse

# Get the custom User model
User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """
    Complete user profile serializer with role information.

    This serializer returns comprehensive user details including their role
    (determined by Django Group membership) for use in authentication responses
    and profile views.

    Fields:
        - id: User's unique identifier
        - username: User's username
        - email: User's email address
        - first_name: User's first name
        - last_name: User's last name
        - role: User's primary role (PI, Reviewer, or SRC_Chair)
        - is_active: Whether the user account is active

    Example:
        {
            "id": 1,
            "username": "john.doe",
            "email": "john.doe@nsu.edu",
            "first_name": "John",
            "last_name": "Doe",
            "role": "SRC_Chair",
            "is_active": true
        }
    """

    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_active', 'is_staff']
        read_only_fields = ['id', 'is_staff']

    def get_role(self, obj):
        """
        Get the user's primary role from their group membership.

        Args:
            obj (User): User instance

        Returns:
            str: Role name ('PI', 'Reviewer', 'SRC_Chair') or None if no group assigned
        """
        # Get the first group as the primary role
        group = obj.groups.first()
        return group.name if group else None


class LoginSerializer(serializers.Serializer):
    """
    Login request serializer for email/password authentication.

    Validates user credentials and returns the authenticated user instance.
    Used by the LoginView to authenticate users before issuing tokens.

    Fields:
        - email: User's email address (required)
        - password: User's password (write-only, required)

    Validation:
        - Checks if user exists with provided email
        - Validates password correctness
        - Ensures user account is active

    Raises:
        ValidationError: If credentials are invalid or account is inactive
    """

    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )

    def validate(self, attrs):
        """
        Validate login credentials and return authenticated user.

        Args:
            attrs (dict): Dictionary with 'email' and 'password'

        Returns:
            dict: Validated data with authenticated user instance

        Raises:
            ValidationError: If credentials are invalid or account inactive
        """
        email = attrs.get('email')
        password = attrs.get('password')

        # Look up the user by email.  Use a generic error message when the
        # account is not found to avoid disclosing which email addresses are
        # registered (user-enumeration / account oracle vulnerability).
        try:
            matched_user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({
                'non_field_errors': 'Invalid email or password.'
            })

        # Use the same generic error for inactive accounts to avoid confirming
        # that the email address is registered (user-enumeration prevention).
        if not matched_user.is_active:
            raise serializers.ValidationError({
                'non_field_errors': 'Invalid email or password.'
            })

        # Authenticate with username (Django's ModelBackend uses username)
        user = authenticate(
            request=self.context.get('request'),
            username=matched_user.username,
            password=password
        )

        if not user:
            # Generic message — do not reveal whether the email exists
            raise serializers.ValidationError({
                'non_field_errors': 'Invalid email or password.'
            })

        # Add authenticated user to validated data
        attrs['user'] = user
        return attrs


class UserCreateSerializer(serializers.ModelSerializer):
    """
    User registration serializer for creating new users.

    This serializer is used by SRC Chair (admin) to create new user accounts
    for PIs and Reviewers. Handles password validation, role assignment,
    and automatic group membership.

    Fields:
        - username: Unique username (required)
        - email: Unique email address (required)
        - password: Password (write-only, validated, required)
        - first_name: User's first name (required)
        - last_name: User's last name (required)
        - role: User's role - must be 'PI', 'Reviewer', or 'SRC_Chair' (required)

    Validation:
        - Password must meet Django's password validation requirements
        - Email must be unique
        - Username must be unique
        - Role must be one of the three valid roles

    Example:
        {
            "username": "jane.smith",
            "email": "jane.smith@nsu.edu",
            "password": "SecurePass123!",
            "first_name": "Jane",
            "last_name": "Smith",
            "role": "Reviewer"
        }
    """

    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    role = serializers.ChoiceField(
        choices=['PI', 'Reviewer', 'SRC_Chair'],
        required=True,
        write_only=True
    )
    department = serializers.CharField(required=False, allow_blank=True, write_only=True)
    area_of_expertise = serializers.CharField(required=False, allow_blank=True, write_only=True)
    max_review_load = serializers.IntegerField(required=False, min_value=1, max_value=50, write_only=True)
    is_active_reviewer = serializers.BooleanField(required=False, write_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'password', 'first_name', 'last_name', 'role',
            'department', 'area_of_expertise', 'max_review_load', 'is_active_reviewer'
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
        }

    def validate_email(self, value):
        """
        Ensure email is unique across all users.

        Args:
            value (str): Email address to validate

        Returns:
            str: Validated email address

        Raises:
            ValidationError: If email already exists
        """
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        """
        Create new user with hashed password and role assignment.

        Extracts the role from validated data, creates the user with a properly
        hashed password, and assigns the user to the appropriate Django group.

        Args:
            validated_data (dict): Validated user data including role

        Returns:
            User: Newly created user instance with assigned role
        """
        # Extract role from validated data (not a User model field)
        role = validated_data.pop('role')
        department = validated_data.pop('department', '')
        area_of_expertise = validated_data.pop('area_of_expertise', '')
        max_review_load = validated_data.pop('max_review_load', 5)
        is_active_reviewer = validated_data.pop('is_active_reviewer', True)

        # Create user with hashed password
        user = User.objects.create_user(**validated_data)

        # Assign user to the specified role group
        try:
            group = Group.objects.get(name=role)
            user.groups.add(group)
        except Group.DoesNotExist:
            # If group doesn't exist, create it and assign
            group = Group.objects.create(name=role)
            user.groups.add(group)

        # Create ReviewerProfile if role is Reviewer
        if role == 'Reviewer':
            from reviews.models import ReviewerProfile
            ReviewerProfile.objects.create(
                user=user,
                department=department,
                area_of_expertise=area_of_expertise,
                max_review_load=max_review_load,
                is_active_reviewer=is_active_reviewer,
            )

        return user


class ChangePasswordSerializer(serializers.Serializer):
    """
    Password change serializer for authenticated users.

    Allows users to change their password by providing their current password
    for verification and a new password that meets validation requirements.

    Fields:
        - old_password: Current password for verification (write-only, required)
        - new_password: New password (write-only, validated, required)

    Validation:
        - Old password must be correct
        - New password must meet Django's password validation requirements
        - New password must be different from old password

    Example:
        {
            "old_password": "OldPass123!",
            "new_password": "NewSecurePass456!"
        }
    """

    old_password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )

    def validate_old_password(self, value):
        """
        Verify the old password is correct.

        Args:
            value (str): The old password provided by user

        Returns:
            str: Validated old password

        Raises:
            ValidationError: If old password is incorrect
        """
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value

    def validate(self, attrs):
        """
        Ensure new password is different from old password.

        Args:
            attrs (dict): Dictionary with old and new passwords

        Returns:
            dict: Validated data

        Raises:
            ValidationError: If new password is same as old password
        """
        if attrs['old_password'] == attrs['new_password']:
            raise serializers.ValidationError({
                'new_password': 'New password must be different from the old password.'
            })
        return attrs

    def save(self, **kwargs):
        """
        Update user's password with the new password.

        Extracts new password, updates the user's password using Django's
        set_password method (which handles hashing), and saves the user.

        Returns:
            User: Updated user instance
        """
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class UserListSerializer(serializers.ModelSerializer):
    """
    Lightweight user serializer for user listings.

    Used by admin views to display lists of users without full profile details.
    Includes essential information and role.

    Fields:
        - id: User identifier
        - username: Username
        - email: Email address
        - full_name: Combined first and last name
        - role: User's primary role
        - is_active: Account status

    Example:
        {
            "id": 1,
            "username": "john.doe",
            "email": "john.doe@nsu.edu",
            "full_name": "John Doe",
            "role": "Reviewer",
            "is_active": true
        }
    """

    role = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    cv_url = serializers.SerializerMethodField()
    cv_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'role', 'is_active', 'date_joined', 'cv_url', 'cv_name']

    def get_role(self, obj):
        """
        Get user's primary role from group membership.

        Args:
            obj (User): User instance

        Returns:
            str: Role name or None
        """
        group = obj.groups.first()
        return group.name if group else None

    def get_full_name(self, obj):
        """
        Get user's full name from first and last name.

        Args:
            obj (User): User instance

        Returns:
            str: Full name or email if name not set
        """
        if obj.first_name and obj.last_name:
            return f"{obj.first_name} {obj.last_name}"
        return obj.email

    def get_cv_url(self, obj):
        profile = getattr(obj, 'reviewer_profile', None)
        cv = getattr(profile, 'cv', None)
        if not cv:
            return None

        request = self.context.get('request')
        url = reverse('users:reviewer-cv', kwargs={'pk': obj.pk})
        return request.build_absolute_uri(url) if request else url

    def get_cv_name(self, obj):
        profile = getattr(obj, 'reviewer_profile', None)
        cv = getattr(profile, 'cv', None)
        if not cv:
            return None
        return cv.name.rsplit('/', 1)[-1]


class ReviewerRegistrationSerializer(serializers.ModelSerializer):
    """
    ============================================================================
    PUBLIC REVIEWER SELF-REGISTRATION SERIALIZER
    ============================================================================

    PURPOSE:
    Allows reviewers to create accounts without admin intervention.
    Accounts are created as INACTIVE and require SRC Chair approval.

    SECURITY WORKFLOW:
    1. Public endpoint (no authentication required)
    2. Account created with is_active=False
    3. Assigned to "Reviewer" group automatically
    4. ReviewerProfile created (also inactive)
    5. SRC Chair approves via admin panel
    6. Account becomes active, user can login

    VALIDATION:
    - Password: Django validators (min 8 chars, not too common, not all numeric)
    - Email: Must be unique across all users
    - Username: Must be unique across all users
    - First/Last name: Required fields

    FIELDS:
        - username: Unique username (required)
        - email: Unique email address (required)
        - password: Password (write-only, validated, required)
        - first_name: User's first name (required)
        - last_name: User's last name (required)

    REQUEST EXAMPLE:
        POST /api/auth/register-reviewer/
        {
            "username": "jane.reviewer",
            "email": "jane.reviewer@nsu.edu",
            "password": "SecurePass123!",
            "first_name": "Jane",
            "last_name": "Reviewer"
        }

    RESPONSE EXAMPLE (201 Created):
        {
            "id": 5,
            "username": "jane.reviewer",
            "email": "jane.reviewer@nsu.edu",
            "first_name": "Jane",
            "last_name": "Reviewer"
        }
    """

    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    cv = serializers.FileField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'cv']
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
        }

    def validate_email(self, value):
        """
        Ensure email is unique across all users.

        Args:
            value (str): Email address to validate

        Returns:
            str: Validated email address

        Raises:
            ValidationError: If email already exists
        """
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_username(self, value):
        """
        Ensure username is unique across all users.

        Args:
            value (str): Username to validate

        Returns:
            str: Validated username

        Raises:
            ValidationError: If username already exists
        """
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_cv(self, value):
        if not value:
            return value

        allowed_extensions = ('.pdf', '.doc', '.docx')
        filename = value.name.lower()
        if not filename.endswith(allowed_extensions):
            raise serializers.ValidationError("CV must be a PDF, DOC, or DOCX file.")

        max_size = 5 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError("CV must be 5 MB or smaller.")

        return value

    def create(self, validated_data):
        """
        Create new reviewer user with hashed password and Reviewer role.

        WORKFLOW:
        1. Create user account with hashed password
        2. Set is_active=False (requires approval)
        3. Assign to "Reviewer" group (creates group if needed)
        4. Create ReviewerProfile (also inactive)
        5. Return created user

        IMPORTANT: Account starts INACTIVE
        - User CANNOT login until SRC Chair approves
        - SRC Chair must call approve-reviewer endpoint to activate

        Args:
            validated_data (dict): Validated user data containing:
                - username
                - email
                - password (will be hashed)
                - first_name
                - last_name

        Returns:
            User: Newly created reviewer user instance (is_active=False)
        """
        # ====================================================================
        # STEP 1: Create user account
        # ====================================================================
        # create_user() handles password hashing automatically
        cv = validated_data.pop('cv', None)
        user = User.objects.create_user(**validated_data)

        # ====================================================================
        # STEP 2: Set account as INACTIVE
        # ====================================================================
        # This prevents login until SRC Chair approves
        user.is_active = False
        user.save()

        # ====================================================================
        # STEP 3: Assign to Reviewer group
        # ====================================================================
        # Group membership determines role/permissions in the system
        try:
            # Try to get existing Reviewer group
            group = Group.objects.get(name='Reviewer')
            user.groups.add(group)
        except Group.DoesNotExist:
            # Create Reviewer group if it doesn't exist
            # (Useful for fresh installations)
            group = Group.objects.create(name='Reviewer')
            user.groups.add(group)

        # ====================================================================
        # STEP 4: Create ReviewerProfile
        # ====================================================================
        # ReviewerProfile stores reviewer-specific data:
        # - area_of_expertise
        # - max_review_load
        # - is_active_reviewer (separate from User.is_active)
        from reviews.models import ReviewerProfile
        ReviewerProfile.objects.create(
            user=user,
            area_of_expertise='',
            cv=cv,
            is_active_reviewer=False  # Also starts inactive
        )

        return user


class ReviewerInvitationSerializer(serializers.Serializer):
    """
    Serializer for SRC Chair to invite a reviewer by email.
    """
    email = serializers.EmailField(required=True)
    expires_in_days = serializers.IntegerField(required=False, default=7, min_value=1, max_value=30)

    def validate_email(self, value):
        if User.objects.filter(email=value, is_active=True).exists():
            raise serializers.ValidationError("A user with this email already exists and is active.")
        return value


class InvitedReviewerRegistrationSerializer(serializers.ModelSerializer):
    """
    Registration serializer that requires a valid invitation token.
    Reviewers can only register if they have been invited by the SRC Chair.
    """
    password = serializers.CharField(
        write_only=True, required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    token = serializers.UUIDField(write_only=True, required=True)
    cv = serializers.FileField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'token', 'cv']
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'email': {'read_only': True},  # Email comes from invitation, not user input
        }

    def validate_token(self, value):
        from .models import ReviewerInvitation
        try:
            invitation = ReviewerInvitation.objects.get(token=value)
        except ReviewerInvitation.DoesNotExist:
            raise serializers.ValidationError("Invalid invitation token.")
        if invitation.is_used:
            raise serializers.ValidationError("This invitation has already been used.")
        if invitation.is_expired:
            raise serializers.ValidationError("This invitation has expired.")
        return value

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_cv(self, value):
        if not value:
            return value
        allowed_extensions = ('.pdf', '.doc', '.docx')
        filename = value.name.lower()
        if not filename.endswith(allowed_extensions):
            raise serializers.ValidationError("CV must be a PDF, DOC, or DOCX file.")
        max_size = 5 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError("CV must be 5 MB or smaller.")
        return value

    def create(self, validated_data):
        from .models import ReviewerInvitation
        from django.utils import timezone
        from django.db import transaction

        token = validated_data.pop('token')
        cv = validated_data.pop('cv', None)

        with transaction.atomic():
            # Lock the invitation row to prevent race conditions
            try:
                invitation = ReviewerInvitation.objects.select_for_update().get(token=token)
            except ReviewerInvitation.DoesNotExist:
                raise serializers.ValidationError({"token": "Invalid invitation token."})

            # Re-validate inside the transaction (guards against concurrent use)
            if invitation.is_used:
                raise serializers.ValidationError({"token": "This invitation has already been used."})
            if invitation.is_expired:
                raise serializers.ValidationError({"token": "This invitation has expired."})

            # Check email uniqueness (invitation email may collide with existing user)
            if User.objects.filter(email=invitation.email).exists():
                raise serializers.ValidationError(
                    {"email": "A user with this email already exists."}
                )

            # Use email from invitation
            validated_data['email'] = invitation.email

            user = User.objects.create_user(**validated_data)
            user.is_active = False  # Requires SRC Chair approval
            user.save()

            group, _ = Group.objects.get_or_create(name='Reviewer')
            user.groups.add(group)

            from reviews.models import ReviewerProfile
            ReviewerProfile.objects.create(
                user=user,
                area_of_expertise='',
                cv=cv,
                is_active_reviewer=False
            )

            # Mark invitation as used
            invitation.is_used = True
            invitation.used_at = timezone.now()
            invitation.save()

        return user

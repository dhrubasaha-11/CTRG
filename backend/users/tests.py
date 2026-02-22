from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from rest_framework.test import APIClient

from reviews.models import ReviewerProfile
from users.serializers import LoginSerializer, ReviewerRegistrationSerializer, UserCreateSerializer


User = get_user_model()


class ReviewerRegistrationSerializerTests(TestCase):
    def test_create_reviewer_is_inactive_and_has_profile(self):
        serializer = ReviewerRegistrationSerializer(data={
            'username': 'new.reviewer',
            'email': 'new.reviewer@nsu.edu',
            'password': 'StrongPass123!',
            'first_name': 'New',
            'last_name': 'Reviewer',
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()
        user.refresh_from_db()

        self.assertFalse(user.is_active)
        self.assertTrue(user.groups.filter(name='Reviewer').exists())

        profile = ReviewerProfile.objects.get(user=user)
        self.assertEqual(profile.area_of_expertise, '')
        self.assertFalse(profile.is_active_reviewer)


class LoginSerializerTests(TestCase):
    def test_inactive_user_returns_disabled_error(self):
        User.objects.create_user(
            username='inactive.reviewer',
            email='inactive.reviewer@nsu.edu',
            password='StrongPass123!',
            is_active=False,
        )

        serializer = LoginSerializer(
            data={'email': 'inactive.reviewer@nsu.edu', 'password': 'StrongPass123!'},
            context={'request': None},
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)


class UserCreateSerializerTests(TestCase):
    def test_create_reviewer_assigns_group_and_profile(self):
        serializer = UserCreateSerializer(data={
            'username': 'chair.created.reviewer',
            'email': 'chair.created.reviewer@nsu.edu',
            'password': 'StrongPass123!',
            'first_name': 'Chair',
            'last_name': 'Created',
            'role': 'Reviewer',
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()

        self.assertTrue(user.groups.filter(name='Reviewer').exists())
        self.assertTrue(ReviewerProfile.objects.filter(user=user).exists())


class TokenValidationEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_validate_token_returns_admin_redirect_for_staff(self):
        user = User.objects.create_user(
            username='src.chair',
            email='src.chair@nsu.edu',
            password='StrongPass123!',
            is_staff=True,
        )
        group, _ = Group.objects.get_or_create(name='SRC_Chair')
        user.groups.add(group)

        self.client.force_authenticate(user=user)
        response = self.client.get('/api/auth/validate-token/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['valid'], True)
        self.assertEqual(response.data['role'], 'SRC_Chair')
        self.assertEqual(response.data['redirect_to'], '/admin/dashboard')

    def test_validate_token_returns_reviewer_redirect(self):
        user = User.objects.create_user(
            username='reviewer.user',
            email='reviewer.user@nsu.edu',
            password='StrongPass123!',
        )
        group, _ = Group.objects.get_or_create(name='Reviewer')
        user.groups.add(group)

        self.client.force_authenticate(user=user)
        response = self.client.get('/api/auth/validate-token/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['role'], 'Reviewer')
        self.assertEqual(response.data['redirect_to'], '/reviewer/dashboard')

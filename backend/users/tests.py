from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.cache import caches
from django.test import TestCase, override_settings
from tempfile import TemporaryDirectory
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from proposals.models import AuditLog
from reviews.models import ReviewerProfile
from users.serializers import LoginSerializer, ReviewerRegistrationSerializer, UserCreateSerializer


User = get_user_model()


class ReviewerRegistrationSerializerTests(TestCase):
    def setUp(self):
        self.media_dir = TemporaryDirectory()
        self.override = override_settings(MEDIA_ROOT=self.media_dir.name)
        self.override.enable()

    def tearDown(self):
        self.override.disable()
        self.media_dir.cleanup()

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

    def test_create_reviewer_persists_uploaded_cv(self):
        serializer = ReviewerRegistrationSerializer(data={
            'username': 'cv.reviewer',
            'email': 'cv.reviewer@nsu.edu',
            'password': 'StrongPass123!',
            'first_name': 'CV',
            'last_name': 'Reviewer',
            'cv': SimpleUploadedFile('reviewer_cv.pdf', b'%PDF-1.4 sample cv', content_type='application/pdf'),
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()

        profile = ReviewerProfile.objects.get(user=user)
        self.assertTrue(profile.cv.name.endswith('reviewer_cv.pdf'))

    def test_deleting_reviewer_profile_removes_cv_file(self):
        serializer = ReviewerRegistrationSerializer(data={
            'username': 'delete.cv.reviewer',
            'email': 'delete.cv.reviewer@nsu.edu',
            'password': 'StrongPass123!',
            'first_name': 'Delete',
            'last_name': 'CV',
            'cv': SimpleUploadedFile('delete_me.pdf', b'%PDF-1.4 delete me', content_type='application/pdf'),
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()
        profile = ReviewerProfile.objects.get(user=user)
        cv_path = profile.cv.path

        self.assertTrue(profile.cv.storage.exists(profile.cv.name))
        user.delete()
        self.assertFalse(profile.cv.storage.exists('reviewer_cvs/delete_me.pdf'))


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
            'department': 'CSE',
            'area_of_expertise': 'Distributed Systems',
            'max_review_load': 7,
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()

        self.assertTrue(user.groups.filter(name='Reviewer').exists())
        profile = ReviewerProfile.objects.get(user=user)
        self.assertEqual(profile.department, 'CSE')
        self.assertEqual(profile.area_of_expertise, 'Distributed Systems')
        self.assertEqual(profile.max_review_load, 7)


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


class UserAuditTrailTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        reviewer_group, _ = Group.objects.get_or_create(name='Reviewer')
        self.admin = User.objects.create_user(
            username='audit.admin',
            email='audit.admin@nsu.edu',
            password='StrongPass123!',
            is_staff=True,
        )
        self.user = User.objects.create_user(
            username='audit.user',
            email='audit.user@nsu.edu',
            password='StrongPass123!',
        )
        self.user.groups.add(reviewer_group)
        ReviewerProfile.objects.create(user=self.user, area_of_expertise='Testing')

    def test_login_and_logout_create_audit_entries(self):
        login_response = self.client.post('/api/auth/login/', {
            'email': self.user.email,
            'password': 'StrongPass123!',
        }, format='json')

        self.assertEqual(login_response.status_code, 200, login_response.data)
        self.assertTrue(AuditLog.objects.filter(action_type='USER_LOGIN', user=self.user).exists())

        token = Token.objects.get(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        logout_response = self.client.post('/api/auth/logout/')

        self.assertEqual(logout_response.status_code, 200, logout_response.data)
        self.assertTrue(AuditLog.objects.filter(action_type='USER_LOGOUT', user=self.user).exists())

    def test_admin_user_creation_is_logged(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/auth/register/', {
            'username': 'new.pi.user',
            'email': 'new.pi@nsu.edu',
            'password': 'StrongPass123!',
            'first_name': 'New',
            'last_name': 'PI',
            'role': 'PI',
        }, format='json')

        self.assertEqual(response.status_code, 201, response.data)
        created_user = User.objects.get(email='new.pi@nsu.edu')
        self.assertTrue(
            AuditLog.objects.filter(
                action_type='USER_CREATED',
                user=self.admin,
                details__target_user_id=created_user.id,
            ).exists()
        )

    def test_password_change_is_logged(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/auth/change-password/', {
            'old_password': 'StrongPass123!',
            'new_password': 'EvenStrongerPass123!',
        }, format='json')

        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(AuditLog.objects.filter(action_type='PASSWORD_CHANGED', user=self.user).exists())


class ReviewerCVDownloadEndpointTests(TestCase):
    def setUp(self):
        self.media_dir = TemporaryDirectory()
        self.override = override_settings(MEDIA_ROOT=self.media_dir.name)
        self.override.enable()
        self.client = APIClient()

    def tearDown(self):
        self.override.disable()
        self.media_dir.cleanup()

    def test_admin_can_download_reviewer_cv(self):
        reviewer_group, _ = Group.objects.get_or_create(name='Reviewer')
        admin = User.objects.create_user(
            username='src.chair.download',
            email='src.chair.download@nsu.edu',
            password='StrongPass123!',
            is_staff=True,
        )
        reviewer = User.objects.create_user(
            username='download.cv.reviewer',
            email='download.cv.reviewer@nsu.edu',
            password='StrongPass123!',
            is_active=False,
        )
        reviewer.groups.add(reviewer_group)
        ReviewerProfile.objects.create(
            user=reviewer,
            area_of_expertise='',
            is_active_reviewer=False,
            cv=SimpleUploadedFile('download_cv.pdf', b'%PDF-1.4 download', content_type='application/pdf'),
        )

        self.client.force_authenticate(user=admin)
        response = self.client.get(f'/api/auth/reviewer-cv/{reviewer.pk}/')

        self.assertEqual(response.status_code, 200)
        self.assertIn('download_cv.pdf', response.headers.get('Content-Disposition', ''))
        response.close()


class HealthEndpointTests(TestCase):
    def test_live_health_endpoint_returns_ok(self):
        response = self.client.get('/health/live/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'ok')

    def test_ready_health_endpoint_returns_ok(self):
        caches['default'].clear()

        response = self.client.get('/health/ready/')

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload['status'], 'ok')
        self.assertEqual(payload['checks']['database']['status'], 'ok')
        self.assertEqual(payload['checks']['cache']['status'], 'ok')
        self.assertEqual(payload['checks']['media_root']['status'], 'ok')

from unittest import TestCase

from pydantic import ValidationError

from backend.auth.models import Authenticate, RegisterHome


class AuthModelTests(TestCase):
    def test_blank_password_disables_code(self) -> None:
        payload = Authenticate.model_validate(
            {
                "home_name": "Jarvis Home",
                "login_name": "Jarvis",
                "password": "   ",
            }
        )

        self.assertIsNone(payload.password)

    def test_password_has_no_complexity_requirement(self) -> None:
        payload = RegisterHome.model_validate(
            {
                "home_name": "Jarvis Home",
                "login_name": "Jarvis",
                "password": "x",
            }
        )

        self.assertEqual(payload.password, "x")

    def test_login_rejects_legacy_email_payload(self) -> None:
        with self.assertRaises(ValidationError):
            Authenticate.model_validate(
                {
                    "email": "jarvis@example.com",
                    "password": "password",
                }
            )

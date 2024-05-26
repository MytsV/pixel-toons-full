from django.test import TestCase, RequestFactory
import os
from django.core.files.uploadedfile import SimpleUploadedFile

from digit_vision.views import recognize_digit
import json
from django.conf import settings


class TestRecognizeDigit(TestCase):
    def setUp(self):
        self.factory = RequestFactory()

    def test_recognize_digit(self):
        image_path = os.path.join(
            settings.BASE_DIR, "assets", "sample_digit.png")
        # Load the sample image from the assets folder
        # The image is a digit 3 from MNIST train dataset
        with open(image_path, "rb") as f:
            image_content = f.read()

        image_file = SimpleUploadedFile(
            "sample_image.png", image_content, content_type="image/png"
        )
        # Create a POST request with image data
        request = self.factory.post(
            "/recognize/", {"image": image_file}, format="multipart"
        )
        response = recognize_digit(request)

        # Check if the response is a JSON response
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["content-type"], "application/json")

        # Parse the JSON content of the response
        content = json.loads(response.content.decode("utf-8"))

        # Check if the predicted_digit key exists in the JSON content
        self.assertIn("predicted_digit", content)

        # Check if the prediction matches the sample image
        self.assertEqual(content["predicted_digit"], 3)

from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from keras.models import load_model
import numpy as np
from PIL import Image
import os
from django.conf import settings
from django.views.decorators.http import require_POST

# Load the pre-trained Keras model
model_file_path = os.path.join(settings.BASE_DIR, "assets", "mnist_model.h5")
model = load_model(model_file_path)


def preprocess_image(image):
    # Convert to grayscale and resize to 28x28
    img = image.convert("L").resize((28, 28))
    # Normalize pixel values to [0, 1]
    img_array = np.array(img) / 255.0
    # Reshape to match model input shape
    img_array = img_array.reshape(1, 28, 28, 1)
    return img_array


@require_POST
@csrf_exempt
def recognize_digit(request):
    # Get the uploaded image file from the request
    image_file = request.FILES.get("image")
    if image_file is None:
        raise ValidationError("No image provided")

    image = Image.open(image_file)

    # Preprocess the image
    processed_image = preprocess_image(image)

    # Make a prediction
    prediction = model.predict(processed_image)
    predicted_digit = np.argmax(prediction)

    # Return the predicted digit as JSON response
    return JsonResponse({"predicted_digit": int(predicted_digit)})

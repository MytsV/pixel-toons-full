from django.contrib import admin
from django.urls import path
from digit_vision import views

urlpatterns = [
    path("admin/", admin.site.urls),
    path('recognize/', views.recognize_digit, name='recognize'),
]

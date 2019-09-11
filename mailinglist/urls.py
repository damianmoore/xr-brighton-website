from django.conf.urls import url

from . import views


urlpatterns = [
    url('signup', views.signup, name='signup'),
    url('confirmation', views.confirmation, name='confirmation'),
]

from django.forms import ModelForm
from .models import Event


class EventForm(ModelForm):
    class Meta:
        model = Event
        fields = ['name', 'start', 'finish', 'location', 'category', 'hosting_group', 'description', 'image']

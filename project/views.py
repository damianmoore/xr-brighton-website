import datetime

from django.shortcuts import render
import markdown

from .models import Event


def event_detail(request, slug):
    event = Event.objects.get(slug=slug)
    return render(request, 'event_detail.html', {
        'event': event,
        'description': markdown.markdown(event.description),
    })

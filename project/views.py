import datetime
import re

from django.shortcuts import render
import markdown

from .models import Event


def event_detail(request, slug):
    event = Event.objects.get(slug=slug)

    regex = r'http[s]*:\/\/[\w\S]+[\w\/]+'
    description = re.sub(regex, lambda url: '[{0}]({0})'.format(url.group()), event.description)
    description = markdown.markdown(description)

    return render(request, 'event_detail.html', {
        'event': event,
        'description': description,
    })

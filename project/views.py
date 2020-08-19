import datetime
import re

from django.http import HttpResponseRedirect
from django.shortcuts import render, get_object_or_404
from django.utils.crypto import get_random_string
import markdown
import requests

from .forms import EventForm
from .models import Event, Article, Arrestee, Human, Group


def event_detail(request, slug):
    event = get_object_or_404(Event, slug=slug)

    regex = r'([^\"])(http[s]*:\/\/[\w\S]+[\w\/]+)'
    description = re.sub(regex, lambda url: '{0}[{1}]({1})'.format(url.group(1), url.group(2)), event.description)
    description = markdown.markdown(description)

    return render(request, 'event_detail.html', {
        'event': event,
        'description': description,
    })


def article_detail(request, slug):
    article = get_object_or_404(Article, slug=slug)

    regex = r'([^\"])(http[s]*:\/\/[\w\S]+[\w\/]+)'
    description = re.sub(regex, lambda url: '{0}[{1}]({1})'.format(url.group(1), url.group(2)), article.description)
    description = markdown.markdown(description)

    return render(request, 'article_detail.html', {
        'article': article,
        'description': description,
    })


def arrestee_details(request):
    if request.method == 'POST':
        context = {}
        error = False
        arrestee_name = request.POST.get('arrestee_name')
        arrestee_contact = request.POST.get('arrestee_contact')
        observer_name = request.POST.get('observer_name')

        if not arrestee_name:
            context['error'] = 'Arrestee name missing'
            error = True
        elif not observer_name:
            context['error'] = 'Observer name missing'
            error = True

        if error:
            context.update({
                'arrestee_name': arrestee_name,
                'arrestee_contact': arrestee_contact,
                'observer_name': observer_name,
            })
            return render(request, 'arrestee_details.html', context)

        try:
            Arrestee(name=arrestee_name, contact_details=arrestee_contact, observer_name=observer_name).save()
            requests.post('https://skylark.epixstudios.co.uk/webhook/', params={
                'title': "XR arrestee details added",
                'icon': 'https://xrbrighton.earth/static/images/cropped-favicon-192x192.png',
                'body': 'Total: {}'.format(Arrestee.objects.count()),
                'color': '#21a73d',
            })
        except:
            return render(request, 'arrestee_error.html')

        return HttpResponseRedirect('/arrestee-details/confirmation')

    return render(request, 'arrestee_details.html', {})


def humans_of_xr(request, id=None):
    if id:
        return render(request, 'human.html', {'human': Human.objects.get(id=id)})
    else:
        return render(request, 'humans-of-xr.html', {'humans': Human.objects.filter()})


def group_detail(request, slug):
    group = get_object_or_404(Group,slug=slug)
    events = Event.objects.filter(hosting_group=group.id)
    return render(request, 'group_detail.html', {
        'group': group,
        'events': events
    })


def events_dashboard(request):
    anon_user_token = request.COOKIES.get('anon_user_token', None)
    new_token = False
    if anon_user_token:
        form = EventForm(request.POST)
        if form.is_valid():
            form.cleaned_data['anon_user_token'] = anon_user_token
            form.save()
        events = Event.objects.filter(anon_user_token=anon_user_token)
    else:
        anon_user_token = get_random_string(length=64)
        new_token = True
        events = []

    response = render(request, 'events_dashboard.html', {
        'events': events,
        'token': anon_user_token,
        'form': EventForm,
    })
    if new_token:
        response.set_cookie('anon_user_token', )
    return response

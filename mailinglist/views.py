from django.db import IntegrityError
from django.shortcuts import render
from django.http import HttpResponse, HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt
import requests

from .models import Subscription


@csrf_exempt
def signup(request):
    email = request.POST.get('email')
    first_name = request.POST.get('first_name')
    last_name = request.POST.get('last_name')

    try:
        Subscription(email=email, first_name=first_name, last_name=last_name).save()
        requests.post('https://skylark.epixstudios.co.uk/webhook/', params={
            'title': "New XR mailing list subscription",
            'icon': 'https://xrbrighton.earth/static/images/cropped-favicon-192x192.png',
            'body': 'Domain: {}  Total: {}'.format(email.split('@')[-1], Subscription.objects.count()),
            'color': '#21a73d',
        })
    except IntegrityError:
        pass
    except:
        return render(request, 'mailinglist/error.html')

    context = {
        'email': email
    }
    return HttpResponseRedirect('/mailinglist/confirmation')


def confirmation(request):
    context = {}
    return render(request, 'mailinglist/confirmation.html', context)
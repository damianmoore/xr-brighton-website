from django.shortcuts import render
from django.http import HttpResponse, HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt

# import requests

from .models import Subscription


@csrf_exempt
def signup(request):
    email = request.POST.get('email')
    first_name = request.POST.get('first_name')
    last_name = request.POST.get('last_name')

    try:
        Subscription(email=email, first_name=first_name, last_name=last_name).save()
        context = {
            'email': email
        }
        return HttpResponseRedirect('/mailinglist/confirmation')

    except:
        return render(request, 'mailinglist/error.html')


def confirmation(request):
    context = {}
    return render(request, 'mailinglist/confirmation.html', context)
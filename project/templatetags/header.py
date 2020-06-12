import os
import time
import random

from django import template
from django.utils.safestring import mark_safe
from django.utils.dateformat import DateFormat
from easy_thumbnails.files import get_thumbnailer

from project.models import Article


register = template.Library()


@register.simple_tag()
def header(image=None, size='normal', caption=None, link=None):
    if not image:
        article = Article.objects.filter(header=True).order_by('?')[0]
        image = article.image
        if not caption:
            if article.name:
                caption = article.name
            elif article.event:
                caption = article.event.name
            if caption:
                date_str = DateFormat(article.date).format('jS F Y')
                caption = f'{caption}, {date_str}'
        if not link:
            link = f'/news/{article.slug}/'

    crop = 'smart'
    if image.subject_location:
        vertical_pos = int((int(image.subject_location.split(',')[1]) / image.height) * 100)
        crop = f',{vertical_pos}'

    options = {
        'size': (1920, 600),
        'crop': crop,
        'quality': 60,
    }
    url = get_thumbnailer(image).get_thumbnail(options).url

    extra_class = ''
    if size == 'large':
        extra_class = 'hero-large'

    if caption:
        caption = f'<span class="caption">{caption}</span>'
    if link:
        caption = f'<a href="{link}">{caption}</a>'

    return mark_safe(f'<div class="hero {extra_class}" style="background-image: url({url})">{caption}</div>')

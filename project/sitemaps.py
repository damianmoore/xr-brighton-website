from datetime import datetime, date

from cms.models.titlemodels import Title
from cms.sitemaps import CMSSitemap
from django.utils import timezone

from .models import Event, Article, Newsletter


class CMSSitemap(CMSSitemap):
    protocol = 'https'

    def priority(self, item):

        priorities = {
            'home':     1.0,
            'events':   0.8,
            'news':     0.7,
        }
        try:
            return priorities.get(item.slug, 0.5)
        except AttributeError:
            return 0.5

    def lastmod(self, item):
        if type(item) == Event:
            return datetime.combine(item.updated_at, datetime.min.time()).replace(tzinfo=timezone.utc)

        if type(item) == Article:
            return datetime.combine(item.updated_at, datetime.min.time()).replace(tzinfo=timezone.utc)

        if type(item) == Newsletter:
            return datetime.combine(item.updated_at, datetime.min.time()).replace(tzinfo=timezone.utc)

        elif item.slug in ['events']:
            return Event.objects.all().order_by('-updated_at')[0].updated_at

        return super(CMSSitemap, self).lastmod(item)

    def changefreq(self, item):
        if type(item) == Event:
            return 'daily'
        if type(item) == Article:
            return 'weekly'
        if type(item) == Newsletter:
            return 'weekly'
        if item.slug in ['home']:
            return 'weekly'
        return 'monthly'

    def items(self):
        items = []
        items.extend(super(CMSSitemap, self).items())
        items.extend(Event.objects.in_future().order_by('start')[:100])
        items.extend(Article.objects.order_by('-date')[:100])
        items.extend(Article.objects.order_by('-date')[:100])
        items.extend(Newsletter.objects.order_by('-date')[:100])
        return items

    def location(self, item):
        if type(item) == Event:
            return '/event/{}/'.format(item.slug)
        if type(item) == Article:
            return '/news/{}/'.format(item.slug)
        if type(item) == Newsletter:
            return '/newsletter/{}/'.format(item.date)
        else:
            return super(CMSSitemap, self).location(item)

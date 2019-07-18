from datetime import datetime, date

from cms.models.titlemodels import Title
from cms.sitemaps import CMSSitemap
from django.utils import timezone

from .models import Event, Article


class CMSSitemap(CMSSitemap):
    def priority(self, item):
        priorities = {
            'home': 1.0,
            'dates-and-prices': 0.7,
            'apartments': 0.6,
            'resort-info': 0.6,
            'news': 0.6,
        }
        return priorities.get(item.slug, 0.5)

    def lastmod(self, item):
        if type(item) == Event:
            return datetime.combine(item.updated_at, datetime.min.time()).replace(tzinfo=timezone.utc)

        if type(item) == Article:
            return datetime.combine(item.updated_at, datetime.min.time()).replace(tzinfo=timezone.utc)

        elif item.slug in ['home']:
            return Event.objects.all().order_by('-updated_at')[0].updated_at

        return super(CMSSitemap, self).lastmod(item)

    def changefreq(self, item):
        if item.slug in ['home']:
            return 'daily'
        elif item.slug in ['news']:
            return 'weekly'
        return 'monthly'

    def items(self):
        items = []
        items.extend(super(CMSSitemap, self).items())
        items.extend(Event.objects.in_future().order_by('start')[:50])
        items.extend(Article.objects.order_by('-date')[:50])
        return items

    def location(self, item):
        if type(item) == Event:
            return '/event/{}/'.format(item.slug)
        if type(item) == Article:
            return '/news/{}/'.format(item.slug)
        else:
            return super(CMSSitemap, self).location(item)

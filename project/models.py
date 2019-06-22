from datetime import datetime, timedelta

from django.contrib.auth import get_user_model
from django.db import models
from django.db.models import Q
from django.utils.text import slugify
from django.utils import timezone

from cms.models import CMSPlugin
from filer.fields.image import FilerImageField


User = get_user_model()


class VersionedModel(models.Model):
    created_at = models.DateTimeField(blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, related_name='+')
    updated_at = models.DateTimeField(blank=True, null=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, related_name='+')

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        now = datetime.now()
        if not self.created_at:
            self.created_at = now
        self.updated_at = now
        super(VersionedModel, self).save()


class Category(VersionedModel):
    name = models.CharField(max_length=50)

    class Meta:
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name

class EventManager(models.Manager):
    def in_future(self):
        return self.get_queryset().filter(Q(start__gte=timezone.now()) | Q(finish__gte=timezone.now()))

    def in_past(self):
        return self.get_queryset().filter(Q(start__lt=timezone.now()) & (Q(finish__isnull=True) | Q(finish__lt=timezone.now())))

class Event(VersionedModel):
    name        = models.CharField(max_length=100)
    slug        = models.CharField(max_length=110, blank=True, null=True)
    start       = models.DateTimeField()
    finish      = models.DateTimeField(blank=True, null=True)
    location    = models.TextField(blank=True)
    latitude    = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude   = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    description = models.TextField(blank=True)
    category    = models.ForeignKey(Category, on_delete=models.SET_NULL, blank=True, null=True)
    image       = FilerImageField(null=True, blank=True, on_delete=models.SET_NULL, related_name='event_image')
    promote     = models.BooleanField(default=False)

    objects = EventManager()

    class Meta:
        ordering = ('-start',)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self.generate_slug()
        super(Event, self).save()

    def generate_slug(self):
        datestr = self.start.strftime('%Y%m%d')
        return f'{slugify(self.name)}-{datestr}'

    @property
    def in_future(self):
        if self.start >= timezone.now() or self.finish >= timezone.now():
            return True
        return False

    @property
    def in_past(self):
        return not self.in_future


class EventPluginModel(CMSPlugin):
    category    = models.ForeignKey(Category, on_delete=models.DO_NOTHING, blank=True, null=True)
    limit       = models.IntegerField(null=True)
    show_more   = models.BooleanField(default=False)

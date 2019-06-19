from datetime import datetime, timedelta

from django.db import models
from django.utils.text import slugify

from cms.models import CMSPlugin
from filer.fields.image import FilerImageField


class VersionedModel(models.Model):
    created = models.DateTimeField(blank=True, null=True)
    updated = models.DateTimeField(blank=True, null=True)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        now = datetime.now()
        if not self.created:
            self.created = now
        self.updated = now
        super(VersionedModel, self).save()


class Category(VersionedModel):
    name = models.CharField(max_length=50)

    class Meta:
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name


class Event(VersionedModel):
    name        = models.CharField(max_length=100)
    slug        = models.CharField(max_length=60, blank=True, null=True)
    start       = models.DateTimeField()
    finish      = models.DateTimeField(blank=True, null=True)
    location    = models.TextField(blank=True)
    latitude    = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude   = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    description = models.TextField(blank=True)
    category    = models.ForeignKey(Category, on_delete=models.DO_NOTHING, blank=True, null=True)
    image       = FilerImageField(null=True, blank=True, related_name='event_image')

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


class EventPluginModel(CMSPlugin):
    category    = models.ForeignKey(Category, on_delete=models.DO_NOTHING, blank=True, null=True)
    limit       = models.IntegerField(null=True)
    show_more   = models.BooleanField(default=False)

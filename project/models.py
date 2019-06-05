from django.db import models

from cms.models import CMSPlugin
from filer.fields.image import FilerImageField


class Category(models.Model):
    name = models.CharField(max_length=50)

    class Meta:
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name


class Event(models.Model):
    name = models.CharField(max_length=50)
    start = models.DateTimeField()
    finish = models.DateTimeField(blank=True, null=True)
    location = models.TextField(blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    description = models.TextField(blank=True)
    category = models.ForeignKey(Category, on_delete=models.DO_NOTHING, blank=True, null=True)
    image = FilerImageField(null=True, blank=True, related_name='event_image')

    def __str__(self):
        return self.name


class EventPluginModel(CMSPlugin):
    category = models.ForeignKey(Category, on_delete=models.DO_NOTHING, blank=True, null=True)
    limit = models.IntegerField(null=True)
    show_more = models.BooleanField(default=False)

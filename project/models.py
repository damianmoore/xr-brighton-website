from datetime import datetime, timedelta
import os

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
        ordering = ('name',)

    def __str__(self):
        return self.name

class Group(VersionedModel):
    image                   = FilerImageField(null=True, blank=True, on_delete=models.SET_NULL, related_name='group_image')
    name                    = models.CharField(max_length=100)
    slug                    = models.CharField(max_length=110, blank=True, null=True)
    short_description       = models.TextField(blank=False)
    video_url               = models.CharField(max_length=150, blank=True)
    long_description        = models.TextField(blank=True)
    highlighted_article     = models.ForeignKey("Article", on_delete=models.SET_NULL, blank=True, null=True)
    article_description     = models.TextField(blank=False)
    email_address           = models.CharField(max_length=150, blank=True)
    whatsapp_link           = models.CharField(max_length=150, blank=True)
    telegram_link           = models.CharField(max_length=150, blank=True)
    other_contact           = models.CharField(max_length=150, blank=True)
    facebook_link           = models.CharField(max_length=150, blank=True)
    instagram_handle        = models.CharField(max_length=150, blank=True)

    class Meta:
        verbose_name_plural = 'Groups'
        ordering = ('name',)

    def __str__(self):
        return self.name


class EventManager(models.Manager):
    def in_future(self):
        return self.get_queryset().filter(status='A').filter(Q(start__gte=timezone.now()) | Q(finish__gte=timezone.now()))

    def in_past(self):
        return self.get_queryset().filter(status='A').filter(Q(start__lt=timezone.now()) & (Q(finish__isnull=True) | Q(finish__lt=timezone.now())))
    
    def in_future_and_current_month(self):
        return self.get_queryset().filter(status='A').filter(Q(start__gte=timezone.now()) | Q(finish__gte=timezone.now()) | Q(start__month = timezone.now().month))


EVENT_STATUSES = (
    ('D', 'Draft'),     # Being worked on
    ('P', 'Pending'),   # Waiting to be reviewed by an admin
    ('A', 'Approved'),  # Approved by an admin and published on the site
)

class Event(VersionedModel):
    name            = models.CharField(max_length=100)
    slug            = models.CharField(max_length=110, blank=True, null=True)
    start           = models.DateTimeField()
    finish          = models.DateTimeField(blank=True, null=True)
    location        = models.TextField(blank=True)
    latitude        = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude       = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    description     = models.TextField(blank=True)
    category        = models.ForeignKey(Category, on_delete=models.SET_NULL, blank=True, null=True)
    hosting_group   = models.ForeignKey(Group, on_delete=models.SET_NULL, blank=True, null=True)
    image           = FilerImageField(null=True, blank=True, on_delete=models.SET_NULL, related_name='event_image')
    promote         = models.BooleanField(default=False)
    facebook_link   = models.URLField(blank=True, null=True, help_text='Link to Facebook event URL')
    eventbrite_link = models.URLField(blank=True, null=True, help_text='Link to Eventbrite event URL')
    other_link      = models.URLField(blank=True, null=True, help_text='Link to any other event page URL')
    online          = models.BooleanField(default=False)
    status          = models.CharField(max_length=1, choices=EVENT_STATUSES, default=EVENT_STATUSES[0][0])
    anon_user_token = models.CharField(max_length=64, blank=True, null=True, db_index=True)

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
        slug = f'{slugify(self.name)}-{datestr}'

        if self.id:
            count = Event.objects.filter(slug=slug).exclude(id=self.id).count()
        else:
            count = Event.objects.filter(slug=slug).count()

        if count > 0:
            slug += f'-{count+1}'

        return slug

    @property
    def in_future(self):
        if self.start >= timezone.now() or (self.finish and self.finish >= timezone.now()):
            return True
        return False

    @property
    def in_past(self):
        return not self.in_future


class EventPluginModel(CMSPlugin):
    category                = models.ForeignKey(Category, on_delete=models.DO_NOTHING, blank=True, null=True)
    limit                   = models.IntegerField(null=True)
    show_more               = models.BooleanField(default=False)
    show_category_filters   = models.BooleanField(default=True)
    prioritise_promoted     = models.BooleanField(default=False)


PRESS_ARTICLE_SOURCES = (
    ('I', 'Internal'),
    ('E', 'External'),
)


class Article(VersionedModel):
    event       = models.ForeignKey(Event, on_delete=models.SET_NULL, blank=True, null=True)
    name        = models.CharField(max_length=100, blank=True, null=True, help_text='Optional - event name will be used if blank')
    slug        = models.CharField(max_length=110, blank=True, null=True)
    date        = models.DateField()
    description = models.TextField(blank=True)
    image       = FilerImageField(null=True, blank=True, on_delete=models.SET_NULL, related_name='article_image')
    gallery     = models.BooleanField(default=True, help_text='Pull in all images that are in the same folder as the article image and display as a gallery')
    header      = models.BooleanField(default=True, help_text='Display article image throughout the site in the random header')

    class Meta:
        ordering = ('-date',)

    def __str__(self):
        return self.article_name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self.generate_slug()
        super(Article, self).save()

    @property
    def article_name(self):
        if not self.name and self.event:
            return self.event.name
        return self.name

    @property
    def num_photos(self):
        gallery_images = self.gallery_images
        if not gallery_images:
            return 0
        return gallery_images.count()

    def generate_slug(self):
        datestr = self.date.strftime('%Y%m%d')
        return f'{slugify(self.article_name)}-{datestr}'

    @property
    def gallery_images(self):
        if not self.image or not self.gallery:
            return []
        return self.image.folder.files.order_by('original_filename')


class ArticlePluginModel(CMSPlugin):
    limit       = models.IntegerField(null=True)
    show_more   = models.BooleanField(default=False)


class ArticleSource(VersionedModel):
    article     = models.ForeignKey(Article, related_name='sources')
    name        = models.CharField(max_length=100, blank=True, null=True, help_text='Name of newspaper or website')
    url         = models.URLField(blank=True, null=True, help_text='Link to news article online')

    def __str__(self):
        return self.name


class Arrestee(VersionedModel):
    name            = models.CharField(max_length=100)
    contact_details = models.CharField(max_length=100, blank=True, null=True)
    observer_name   = models.CharField(max_length=100)


class Human(VersionedModel):
    name = models.CharField(max_length=100)
    text = models.TextField()
    group = models.CharField(max_length=100)


class HumanImage(models.Model):
    image = FilerImageField(
        null=True, blank=True, on_delete=models.SET_NULL, related_name='human_image')
    landscape = models.BooleanField(default=False)
    human = models.ForeignKey(Human)

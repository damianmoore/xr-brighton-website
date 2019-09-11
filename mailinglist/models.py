from cms.models import CMSPlugin
from django.db import models
from django.utils import timezone
from django.forms import ValidationError


class Subscription(models.Model):
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(blank=True, db_index=True)

    def __str__(self):
        return '{}'.format(self.email)

    def save(self, *args, **kwargs):
        if not self.email:
            raise ValidationError('No email address')

        now = timezone.now()
        if not self.created_at:
            self.created_at = now
        self.updated_at = now

        super(Subscription, self).save()


class SubscriptionPluginModel(CMSPlugin):
    title = models.CharField(max_length=100, blank=True)

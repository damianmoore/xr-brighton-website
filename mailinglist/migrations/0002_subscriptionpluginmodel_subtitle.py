# -*- coding: utf-8 -*-
# Generated by Django 1.11.24 on 2019-09-12 17:42
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('mailinglist', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='subscriptionpluginmodel',
            name='subtitle',
            field=models.TextField(blank=True),
        ),
    ]

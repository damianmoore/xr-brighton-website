# -*- coding: utf-8 -*-
# Generated by Django 1.11.21 on 2019-06-08 08:31
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('project', '0004_event_image'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='event',
            options={'ordering': ('-start',)},
        ),
        migrations.AddField(
            model_name='category',
            name='created',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='category',
            name='updated',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='event',
            name='created',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='event',
            name='slug',
            field=models.CharField(blank=True, max_length=60, null=True),
        ),
        migrations.AddField(
            model_name='event',
            name='updated',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]

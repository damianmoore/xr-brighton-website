# -*- coding: utf-8 -*-
# Generated by Django 1.11.21 on 2019-07-07 13:39
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('project', '0013_articleimage'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='articleimage',
            name='article',
        ),
        migrations.RemoveField(
            model_name='articleimage',
            name='created_by',
        ),
        migrations.RemoveField(
            model_name='articleimage',
            name='image',
        ),
        migrations.RemoveField(
            model_name='articleimage',
            name='updated_by',
        ),
        migrations.AddField(
            model_name='article',
            name='gallery',
            field=models.BooleanField(default=True),
        ),
        migrations.DeleteModel(
            name='ArticleImage',
        ),
    ]

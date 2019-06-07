from django.contrib import admin

from .models import Category, Event


admin.site.site_header = 'XR Brighton Administration'


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name',)
    list_ordering = ('name',)


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('name', 'start', 'category')
    list_ordering = ('-start',)
    list_filter = ('start', 'category')

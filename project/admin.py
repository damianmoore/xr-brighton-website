from django.contrib import admin

from .models import Category, Event


admin.site.site_header = 'XR Brighton Administration'


class VersionedAdmin(admin.ModelAdmin):
    fieldsets = (
        ('Created/Updated', {
            'classes': ('collapse',),
            'fields': ('created', 'updated',)
        }),
    )
    readonly_fields = ['created', 'updated']


@admin.register(Category)
class CategoryAdmin(VersionedAdmin):
    list_display = ('name',)
    list_ordering = ('name',)

    fieldsets = (
        (None, {
            'fields': ('name',),
        }),
    ) + VersionedAdmin.fieldsets


@admin.register(Event)
class EventAdmin(VersionedAdmin):
    list_display = ('name', 'start', 'category')
    list_ordering = ('-start',)
    list_filter = ('start', 'category')
    exclude = ('slug',)

    fieldsets = (
        (None, {
            'fields': ('name', 'start', 'finish', 'location', 'latitude', 'longitude', 'description', 'category', 'image',),
        }),
    ) + VersionedAdmin.fieldsets

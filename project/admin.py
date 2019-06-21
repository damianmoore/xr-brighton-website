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


class EventFuturePastFilter(admin.SimpleListFilter):
    title = 'future/past'
    parameter_name = 'future_or_past'

    def lookups(self, request, model_admin):
        return [('future', 'Future'), ('past', 'Past')]

    def queryset(self, request, queryset):
        if self.value():
            if self.value() == 'future':
                event_ids = Event.objects.in_future().values_list('id', flat=True)
                return queryset.filter(id__in=event_ids)
            if self.value() == 'past':
                event_ids = Event.objects.in_past().values_list('id', flat=True)
                return queryset.filter(id__in=event_ids)
        return queryset.all()

@admin.register(Event)
class EventAdmin(VersionedAdmin):
    list_display = ('name', 'start', 'category', 'future_past')
    list_ordering = ('-start',)
    list_filter = (EventFuturePastFilter, 'category')
    search_fields = ('name', 'location', 'description', 'category__name')
    exclude = ('slug',)

    fieldsets = (
        (None, {
            'fields': ('name', 'start', 'finish', 'location', 'description', 'category', 'image', 'promote', 'latitude', 'longitude',),
        }),
    ) + VersionedAdmin.fieldsets

    def future_past(self, obj):
        if obj.in_future:
            return '<span style="color: #0a0">FUTURE</span>'
        return '<span style="color: #a00">PAST</span>'
    future_past.allow_tags = True
    future_past.short_description = 'Future/Past'

from django.contrib import admin

from .models import Category, Event, Article, ArticleSource


admin.site.site_header = 'XR Brighton Administration'


class VersionedAdmin(admin.ModelAdmin):
    fieldsets = (
        ('Created/Updated', {
            'classes': ('collapse',),
            'fields': ('created_at', 'created_by', 'updated_at', 'updated_by')
        }),
    )
    readonly_fields = ['created_at', 'created_by', 'updated_at', 'updated_by']

    def save_model(self, request, obj, form, change):
        obj.updated_by = request.user
        if not obj.id:
            obj.created_by = request.user
        super(VersionedAdmin, self).save_model(request, obj, form, change)


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
    list_display = ('name', 'date_short', 'category', 'promote', 'future_past')
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

    def date_short(self, obj):
        date_str = obj.start.strftime("%d %b %Y")
        if obj.finish and obj.finish.strftime("%d %b %Y") != obj.start.strftime("%d %b %Y"):
            date_str += ' – {}'.format(obj.finish.strftime("%d %b %Y"))
        return date_str
    date_short.short_description = 'Date'


class ArticleSourceInline(admin.TabularInline):
    model = ArticleSource
    exclude = ('created_at', 'created_by', 'updated_at', 'updated_by')


@admin.register(Article)
class ArticleAdmin(VersionedAdmin):
    list_display = ('name', 'event')
    list_ordering = ('-date')
    search_fields = ('name', 'event__name', 'source_name', 'source_url', 'description')
    raw_id_fields = ('event', )

    fieldsets = (
        (None, {
            'fields': ('event', 'name', 'slug', 'date', 'description', 'image'),
        }),
    ) + VersionedAdmin.fieldsets
    inlines = [
        ArticleSourceInline,
    ]

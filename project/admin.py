from django.contrib import admin

from .models import Category, Event, Article, ArticleSource, Arrestee, Human, HumanImage, Group


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

@admin.register(Group)
class GroupAdmin(VersionedAdmin):
    list_display = ('name',)
    list_ordering = ('name',)

    fieldsets = (
        (None, {
            'fields': ('image','name','short_description','video_url','long_description','highlighted_article','article_description', 'email_address','whatsapp_link','telegram_link','other_contact','facebook_link','instagram_handle'),
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
    list_display = ('name', 'date_short', 'category', 'promote', 'future_past', 'hosting_group')
    list_ordering = ('-start',)
    list_filter = (EventFuturePastFilter, 'category')
    search_fields = ('name', 'slug', 'location', 'description', 'category__name', 'hosting_group__name')
    exclude = ('slug',)

    fieldsets = (
        (None, {
            'fields': ('name', 'start', 'finish', 'description', 'facebook_link', 'eventbrite_link', 'other_link', 'category', 'hosting_group','image', 'location', 'promote', 'latitude', 'longitude',),
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
    list_display = ('article_name', 'date_short', 'event', 'num_photos')
    list_ordering = ('-date')
    search_fields = ('name', 'slug', 'event__name', 'sources__name', 'sources__url', 'description')
    raw_id_fields = ('event', )

    fieldsets = (
        (None, {
            'fields': ('event', 'name', 'slug', 'date', 'description', 'image', 'gallery'),
        }),
    ) + VersionedAdmin.fieldsets
    inlines = [
        ArticleSourceInline,
    ]

    def date_short(self, obj):
        return obj.date.strftime("%d %b %Y")
    date_short.short_description = 'Date'


@admin.register(Arrestee)
class ArresteeAdmin(VersionedAdmin):
    list_display = ('name', 'contact_details', 'observer_name', 'created_at')
    list_ordering = ('-created_at')
    list_filter = ('created_at', 'observer_name')
    search_fields = ('name', 'contact_details', 'observer_name')

    fieldsets = (
        (None, {
            'fields': ('name', 'contact_details', 'observer_name'),
        }),
    ) + VersionedAdmin.fieldsets


class HumanImageInline(admin.StackedInline):
    model = HumanImage
    max_num = 10
    extra = 0


@admin.register(Human)
class HumanAdmin(VersionedAdmin):
    list_display = ['name', 'created_at']
    list_ordering = ['-created_at']
    list_filter = ['created_at']
    search_fields = ['name']
    inlines = [HumanImageInline]

    fieldsets = (
        (None, {
            'fields': ['name', 'text', 'group'],
        }),
    ) + VersionedAdmin.fieldsets

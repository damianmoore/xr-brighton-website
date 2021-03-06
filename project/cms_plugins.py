from datetime import date, datetime
import calendar

from cms.models.pluginmodel import CMSPlugin
from cms.plugin_base import CMSPluginBase
from cms.plugin_pool import plugin_pool
from django.utils.translation import ugettext as _

from .models import EventPluginModel, Event, Category, ArticlePluginModel, Article, Group


@plugin_pool.register_plugin  # register the plugin
class EventPublisher(CMSPluginBase):
    model = EventPluginModel  # model where plugin data are saved
    module = _('Events')
    name = _('Event Plugin')  # name of the plugin in the interface
    render_template = 'cms_plugins/event_plugin.html'
    cache = False

    def render(self, context, instance, placeholder):
        selected_category = None
        events = Event.objects.in_future().order_by('start')

        if context['request'].GET.get('category'):
            selected_category = int(context['request'].GET['category'])
            events = events.filter(category_id=selected_category)

        if instance.prioritise_promoted:
            promoted_events = events.filter(promote=True)
            if instance.limit and len(promoted_events) < instance.limit:
                events = list(promoted_events) + list(events.exclude(id__in=[promoted_event.id for promoted_event in promoted_events])[:instance.limit-len(promoted_events)])

        if instance.limit:
            events = events[:instance.limit]

        context.update({
            'instance': instance,
            'events': events,
            'categories': Category.objects.all(),
            'selected_category': selected_category,
            'show_more': instance.show_more,
        })
        return context


@plugin_pool.register_plugin  # register the plugin
class ArticlePublisher(CMSPluginBase):
    model = ArticlePluginModel  # model where plugin data are saved
    module = _('Articles')
    name = _('Article Plugin')  # name of the plugin in the interface
    render_template = 'cms_plugins/article_plugin.html'
    cache = False

    def render(self, context, instance, placeholder):
        articles = Article.objects.order_by('-date')

        if instance.limit:
            articles = articles[:instance.limit]

        context.update({
            'instance': instance,
            'articles': articles,
            'show_more': instance.show_more,
        })
        return context


@plugin_pool.register_plugin
class Calendar(CMSPluginBase):
    model = CMSPlugin
    module = _('Events')
    name = _('Calendar Plugin')
    render_template = "cms_plugins/calendar.html"
    cache = False
    calendarItems = []

    def get_months_with_events(self, year):
        return set(map(lambda item: item.start.month, list(filter(lambda item: item.start.year == year, self.calendarItems))))

    def format_events(self):
        return list(map(lambda year: {'year': year, 'months': self.get_events_for_year(year)}, set(map(lambda item: item.start.year, self.calendarItems))))

    def get_events_for_year(self, year):
        return list(map(lambda month: {'month': calendar.month_name[month], 'days': self.get_events_for_month(month, year), 'spacerDays': range(0, calendar.monthrange(year, month)[0])}, self.get_months_with_events(year)))
   
    def get_events_for_month(self, month, year):
        return list(map(lambda day: {'day': day, 'events': self.get_events_for_day(day, month, year), 'hasPromoted' : self.day_has_promoted(day, month, year), 'inPast' : date(year, month, day) < date.today(), 'dayName' : datetime(year, month, day).strftime("%A")}, range(1, calendar.monthrange(year, month)[1]+1)))

    def get_events_for_day(self, day, month, year):
        return list(filter(lambda event: event.start.year == year and event.start.month == month and event.start.day == day, self.calendarItems))

    def day_has_promoted(self, day,month,year):
        return True in map( lambda event : event.promote, self.get_events_for_day(day, month, year))

    def render(self, context, instance, placeholder):
        self.calendarItems = list(Event.objects.in_future_and_current_month().order_by('start'))
        context.update({
            'instance': instance,
            'years': self.format_events()
        })
        return context

@plugin_pool.register_plugin  # register the plugin
class GroupPublisher(CMSPluginBase):
    model = CMSPlugin  # model where plugin data are saved
    module = _('Groups')
    name = _('Group Plugin')  # name of the plugin in the interface
    render_template = 'cms_plugins/group_plugin.html'
    cache = False

    def render(self, context, instance, placeholder):
        groups = Group.objects.order_by('name')
        context.update({
            'groups': groups,
        })
        return context
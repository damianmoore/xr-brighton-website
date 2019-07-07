from datetime import date

from cms.plugin_base import CMSPluginBase
from cms.plugin_pool import plugin_pool
from django.utils.translation import ugettext as _

from .models import EventPluginModel, Event, Category, ArticlePluginModel, Article


@plugin_pool.register_plugin  # register the plugin
class EventPublisher(CMSPluginBase):
    model = EventPluginModel  # model where plugin data are saved
    module = _('Events')
    name = _('Event Plugin')  # name of the plugin in the interface
    render_template = "cms_plugins/event_plugin.html"

    def render(self, context, instance, placeholder):
        selected_category = None
        events = Event.objects.in_future().order_by('start')

        if context['request'].GET.get('category'):
            selected_category = int(context['request'].GET['category'])
            events = events.filter(category_id=selected_category)

        context.update({
            'instance': instance,
            'events': events,
            'categories': Category.objects.all(),
            'selected_category': selected_category,
        })
        return context


@plugin_pool.register_plugin  # register the plugin
class ArticlePublisher(CMSPluginBase):
    model = ArticlePluginModel  # model where plugin data are saved
    module = _('Articles')
    name = _('Article Plugin')  # name of the plugin in the interface
    render_template = "cms_plugins/article_plugin.html"

    def render(self, context, instance, placeholder):
        context.update({
            'instance': instance,
            'articles': Article.objects.order_by('-date'),
        })
        return context
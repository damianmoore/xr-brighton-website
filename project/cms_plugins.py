from datetime import date

from cms.plugin_base import CMSPluginBase
from cms.plugin_pool import plugin_pool
from django.utils.translation import ugettext as _

from .models import EventPluginModel, Event


@plugin_pool.register_plugin  # register the plugin
class EventPublisher(CMSPluginBase):
    model = EventPluginModel  # model where plugin data are saved
    module = _('Events')
    name = _('Event Plugin')  # name of the plugin in the interface
    render_template = "cms_plugins/event_plugin.html"

    def render(self, context, instance, placeholder):
        context.update({
            'instance': instance,
            'events': Event.objects.in_future().order_by('start'),
        })
        return context
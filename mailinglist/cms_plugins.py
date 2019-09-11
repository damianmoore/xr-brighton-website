from datetime import date

from cms.plugin_base import CMSPluginBase
from cms.plugin_pool import plugin_pool
from django.utils.translation import ugettext as _

from .models import Subscription, SubscriptionPluginModel


@plugin_pool.register_plugin  # register the plugin
class MailinglistPublisher(CMSPluginBase):
    model = SubscriptionPluginModel  # model where plugin data are saved
    module = _('Mailinglist')
    name = _('Mailinglist Plugin')  # name of the plugin in the interface
    render_template = 'cms_plugins/mailinglist_plugin.html'
    cache = False

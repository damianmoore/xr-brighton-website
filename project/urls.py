from __future__ import absolute_import, print_function, unicode_literals

from django.conf import settings
from django.conf.urls import include, url
from django.conf.urls.i18n import i18n_patterns
from django.contrib import admin
from django.contrib.sitemaps.views import sitemap
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.views.generic.base import TemplateView
from django.views.static import serve

from .views import event_detail, article_detail, arrestee_details, humans_of_xr, group_detail, newsletter, newsletter_redirect
from .sitemaps import CMSSitemap


admin.autodiscover()

urlpatterns = [
    url(r'^sitemap\.xml$', sitemap, {'sitemaps': {'cmspages': CMSSitemap}}),
    url(r'^robots\.txt$', TemplateView.as_view(template_name='robots.txt', content_type='text/plain')),
    url(r'^admin/', admin.site.urls),  # NOQA
    url(r'^mailinglist/', include('mailinglist.urls')),
    url(r'^arrestee-details/confirmation', TemplateView.as_view(template_name='arrestee_details_confirmation.html')),
    url(r'^arrestee-details/', arrestee_details),
    url(r'^event/(?P<slug>[\w-]+)/$', event_detail),
    url(r'^news/(?P<slug>[\w-]+)/$', article_detail),
    url(r'^human/(\d+)/$', humans_of_xr),
    url(r'^humans-of-xr/', humans_of_xr),
    url(r'^group/(?P<slug>[\w-]+)/$', group_detail),
    url(r'^newsletter/(?P<slug>[\w-]+)/', newsletter),
    url(r'^newsletter/', newsletter_redirect),
    url(r'^', include('cms.urls')),
]

# This is only needed when using runserver.
if settings.DEBUG:
    urlpatterns = [
        url(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT, 'show_indexes': True}),
        ] + staticfiles_urlpatterns() + urlpatterns

from django.contrib import admin

from .models import Subscription


class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('email', 'first_name', 'last_name', 'created_at')
    list_filter = ('created_at',)


admin.site.register(Subscription, SubscriptionAdmin)

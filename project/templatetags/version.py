from django import template
import time
import os

register = template.Library()

@register.simple_tag
def version_date():
    return time.strftime('%Y%m%d', time.gmtime(os.path.getmtime('.git')))

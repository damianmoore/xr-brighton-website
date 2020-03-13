FROM python:3.7.3-stretch

RUN apt-get update && \
    apt-get install -y \
        build-essential \
        default-libmysqlclient-dev \
        mysql-client \
        nginx-light \
        python3-dev \
        supervisor \
        && \
        apt-get clean && \
            rm -rf /var/lib/apt/lists/* \
                   /tmp/* \
                   /var/tmp/*

WORKDIR /srv

COPY requirements.txt /srv/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY project /srv/project
COPY mailinglist /srv/mailinglist
COPY system /srv/system
COPY manage.py /srv/manage.py
COPY .git /srv/.git

ENV PYTHONPATH /srv

RUN mkdir /srv/media
RUN python manage.py collectstatic --noinput --link

CMD ./system/run.sh

EXPOSE 80

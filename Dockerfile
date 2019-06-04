FROM python:3.7.3-stretch

RUN apt-get update && \
    apt-get install -y \
        build-essential=12.3 \
        default-libmysqlclient-dev=1.0.2\
        nginx-light=1.10.3-1+deb9u2 \
        python3-dev=3.5.3-1 \
        supervisor=3.3.1-1+deb9u1 \
        && \
        apt-get clean && \
            rm -rf /var/lib/apt/lists/* \
                   /tmp/* \
                   /var/tmp/*

WORKDIR /srv

COPY index.html /srv/index.html
COPY static /srv/static
COPY system /srv/system

CMD ./system/run.sh

EXPOSE 80

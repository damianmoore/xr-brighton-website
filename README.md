# Brighton Extinction Rebellion Website

 [![](https://img.shields.io/github/commit-activity/y/damianmoore/xr-brighton-website.svg)](https://github.com/damianmoore/xr-brighton-website) [![](https://img.shields.io/github/issues-raw/damianmoore/xr-brighton-website.svg)](https://github.com/damianmoore/xr-brighton-website/issues) [![](https://img.shields.io/docker/cloud/build/damianmoore/xr-brighton-website.svg)](https://cloud.docker.com/repository/docker/damianmoore/xr-brighton-website)


This is the code repository for the Brighton Extinction Rebellion website. You can re-use this code if you are setting up a site for your local Extinction Rebellion group. All of our work is free to use non-commercially in the full spirit of DIY. Do not use the work for commercial purposes, however well meaning, without prior consent from the originators. The Extinction Symbol was designed prior to Extinction Rebellion. Using the symbol on commercial merchandise is strictly forbidden. For more information visit www.extinctionsymbol.info .

The site is based on the Django framework and Django CMS. Docker is used for easy development and deployment. If you have Docker Compose installed then you should be able to get started very quickly with the following commands.

    make build
    make start

You should now be able to access the site in your browser at http://localhost:8000/


## Creating an admin account

To make admin edits to your dev site you will need to create an account. While the containers are running via the previous command, in a new terminal run the following:

    make shell
    python manage.py createsuperuser

You should now be able to login as an admin at http://localhost:8000/admin/


## Resizing photos for uploading

To avoid filling up disk space on the server and making thumbnailing slow, please resize your photos on your local machine before uploading with the following:

    mogrify -resize 1920x1920 -quality 60 *.jpg

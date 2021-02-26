build:
	docker-compose build

start:
	docker-compose up

restart:
	docker-compose stop website && docker-compose start website

shell:
	docker-compose exec website bash

sync-media:
	rsync -avz --delete epix:/volumes/xrbrighton/media/ volumes/media/

sync-db:
	docker-compose up -d mysql; \
	ssh epix "docker exec mysql bash -c 'mysqldump -u root --password=\$$MYSQL_ROOT_PASSWORD xrbrighton'" > xrbrighton.sql; \
	docker-compose exec mysql bash -c 'mysql -u root --password=$$MYSQL_ROOT_PASSWORD -e "DROP DATABASE xrbrighton;"'; \
	docker-compose exec mysql bash -c 'mysql -u root --password=$$MYSQL_ROOT_PASSWORD -e "CREATE DATABASE xrbrighton CHARACTER SET utf8mb4_unicode_ci;"'; \
	docker cp xrbrighton.sql xr-brighton-mysql:/tmp/; \
	docker exec xr-brighton-mysql bash -c 'mysql -u root --password=$$MYSQL_ROOT_PASSWORD xrbrighton < /tmp/xrbrighton.sql'; \
	docker exec xr-brighton-mysql bash -c 'rm /tmp/xrbrighton.sql'; \
	docker-compose stop mysql

build:
	docker-compose build

start:
	docker-compose up

restart:
	docker-compose restart website

shell:
	docker-compose exec website bash

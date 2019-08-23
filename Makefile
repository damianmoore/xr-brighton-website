build:
	docker-compose build

start:
	docker-compose up

restart:
	docker-compose stop website && docker-compose start website

shell:
	docker-compose exec website bash

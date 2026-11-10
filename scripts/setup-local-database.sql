CREATE ROLE hospicare_migrator LOGIN;
CREATE ROLE hospicare_app LOGIN;

CREATE DATABASE "hospicare-web-test";

\connect hospicare-web
\ir grant-database-roles.sql

\connect hospicare-web-test
\ir grant-database-roles.sql

\password hospicare_migrator
\password hospicare_app

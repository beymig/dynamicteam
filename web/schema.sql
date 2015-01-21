drop table if exists tasks;
create table tasks (
  id integer primary key autoincrement,
  log text not null,
  fabric text not null,
  daystogo integer not null,
  units integer not null,
  length integer not null
);

CREATE TABLE orders(log VARCHAR(20) NOT NULL, create_at DATE, daytogo DATE, PRIMARY KEY(log));


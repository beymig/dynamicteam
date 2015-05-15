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


Create table redo( id INT NOT NULL AUTO_INCREMENT, log VARCHAR(10) NOT NULL, pieces TEXT NOT NULL, status VARCHAR(20) NOT NULL, create_by VARCHAR(20) NOT NULL, create_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (id));


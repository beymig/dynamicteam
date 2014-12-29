drop table if exists tasks;
create table tasks (
  id integer primary key autoincrement,
  log text not null,
  fabric text not null,
  daystogo integer not null,
  units integer not null,
  length integer not null
);

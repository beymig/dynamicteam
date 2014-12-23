import sqlite3
from flask import Flask, request, session, g, redirect, url_for, abort, render_template, flash
from contextlib import closing

DATABASE = 'flask.db'
app = Flask(__name__)
app.config.from_object(__name__)

def connect_db():
  return sqlite3.connect(app.config['DATABASE'])

def init_db():
  with closing(connect_db()) as db:
    with app.open_resource('schema.sql', mode='r') as f:
      db.cursor().executescript(f.read())

    db.commit()

@app.before_request
def before_request():
  g.db = connect_db()

@app.teardown_request
def teardown_request(exception):
  db = getattr(g, 'db', None)
  if db is not None:
    db.close()

'''@app.route('/')
def show_tasks():
  cur = g.db.execute('select log, fabric, daystogo, units, length from tasks order by daystogo desc')
  tasks = [dict(log=row[0], fabric=row[1], daystogo=row[2], units=row[3], length=row[4]) for row in cur.fetchall()]
  return render_template('task_view.html', tasks=tasks)'''

@app.route('/add', methods=['POST'])
def add_task():
  g.db.execute('insert into tasks (log, fabric, daystogo, units, length) values (?, ?, ?, ?, ?)',
      [request.form['log'], request.form['fabric'], int(request.form['daystogo']), int(request.form['units']), int(request.form['length'])])
  result = g.db.commit()
  flash(result)
  return redirect(url_for('show_tasks'))

@app.route('/')
@app.route('/printroom')
def show_tasks():
  cur = g.db.execute('select log, fabric, daystogo, units, length from tasks order by daystogo asc')
  tasks = [dict(log=row[0], fabric=row[1], daystogo=row[2], units=row[3], length=row[4]) for row in cur.fetchall()]
  return render_template('printroom_view.html', tasks=tasks)

@app.route('/add', methods=['GET'])
def hello(name=None):
  cur = g.db.execute('select log, fabric, daystogo, units, length from tasks order by daystogo asc')
  tasks = [dict(log=row[0], fabric=row[1], daystogo=row[2], units=row[3], length=row[4]) for row in cur.fetchall()]
  return render_template('task_view.html', tasks=tasks)


if __name__ == '__main__':
  app.debug = True
  app.run()

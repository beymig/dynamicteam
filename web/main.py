import os
from datetime import datetime, timedelta, date
import sqlite3
from flask import Flask, request, session, g, redirect, url_for, abort, render_template, flash
from flask.ext.sqlalchemy import SQLAlchemy
from contextlib import closing
import cfg

#DATABASE = 'flask.db'
app = Flask(__name__)
#app.config.from_object(__name__)
basedir = os.path.abspath(os.path.dirname(__file__))
#app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///'+os.path.join(basedir, "flask.db")
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://%s'%cfg.DBStr
db = SQLAlchemy(app)

class Orders(db.Model):
  log = db.Column(db.String(20), nullable=False, primary_key=True)
  create_at = db.Column(db.Date)
  daytogo = db.Column(db.Date)

class Blank(db.Model):
  id = db.Column(db.Integer, primary_key=True)
  log = db.Column(db.String(10), nullable=False)
  fabric = db.Column(db.String(20), nullable=False)
  name = db.Column(db.String(50), nullable=False)
  count = db.Column(db.Integer, nullable=False)
  status = db.Column(db.String(20))


class Task(db.Model):
  id = db.Column(db.Integer, primary_key=True)
  log = db.Column(db.String(10), nullable=False)
  fabric = db.Column(db.String(20))
  daystogo = db.Column(db.Date)
  units = db.Column(db.Integer)
  length = db.Column(db.Integer)
  printer = db.Column(db.String(20))
  status = db.Column(db.String(20))
  folderid = db.Column(db.String(50))
  create_at = db.Column(db.DateTime, default=db.func.now())
  modify_at = db.Column(db.DateTime)

  def __init__(self, log, fabric=None, daystogo=None, units=None, length=None, printer=None, status="new", folderid=None):
    self.log = log
    self.fabric = fabric
    self.daystogo = daystogo
    self.units = units
    self.length = length
    self.printer = printer
    self.status = status
    self.folderid = folderid


  def __repr__(self):
    return 'id:%d: %s|%s|%s|%d|%d|%s'%(self.id, self.log, self.fabric, self.daystogo, self.units, self.length, self.printer)

class Sheet(db.Model):
  id = db.Column(db.Integer, primary_key=True)
  src = db.Column(db.String(120), nullable=False)
  status = db.Column(db.String(20))
  printer = db.Column(db.String(20))
  task_id = db.Column(db.Integer, db.ForeignKey('task.id'))
  task = db.relationship("Task", backref=db.backref('sheets', lazy='dynamic'))

  def __init__(self, src, task, status="", printer=""):
    self.src = src
    self.status = status
    self.task = task
    self.printer = printer

  def __repr__(self):
    return "id:%d|%s|%s|%d"%(self.id, self.src, self.status, self.task_id)

'''def add_cors_headers(r):
  r.headers['Access-Control-Allow-Origin']="*"
  if request.method=='OPTIONS':
    r.headers['Access-Control-Allow-Methods']='DELETE, GET, POST, PUT'
    headers = request.headers.get('Access-Control-Request-Headers')
    if headers:
      r.headers['Access-Control-Allow-Headers']=headers
  return r'''


@app.route('/add', methods=['POST'])
def add_task():
  t = Task(request.form['log'], request.form['fabric'], datetime.now()+timedelta(days=int(request.form['daystogo'])), int(request.form['units']), int(request.form['length']))
  db.session.add(t)
  db.session.commit()
  return redirect(url_for('show_tasks'))

@app.route('/redo/report', methods=['POST'])
def redo_report():
  log = request.form["log"]
  files = request.form["files"]
  return render_template('redo_report.html', log=log, files=files.split(";"))

@app.route('/redo', methods=['GET'])
def redo_view():
  return render_template('redo.html')

@app.route('/blanklist/setstatus', methods=['POST'])
def set_blank_staus():
  blankid, status = int(request.form['blankid']), request.form['status']
  b = Blank.query.get(blankid)
  b.status = status
  db.session.commit()

  return redirect(url_for('blank_view'))

@app.route('/blanklist', methods=['GET'])
def blank_view():
  blanks_wait = sorted(Blank.query.filter_by(status="new").all(), key=lambda b:(b.log, b.fabric))
  blanks_done = sorted(Blank.query.filter_by(status="done").all(), key=lambda b:(b.log, b.fabric))

  log = fabric = ""
  for bs in (blanks_wait, blanks_done):
    for b in bs:
      b.log_show = b.log
      b.fabric_show = b.fabric
      if b.log == log:
        b.log_show = ""
        if fabric == b.fabric:
          b.fabric_show = ""
        else:
          fabric = b.fabric
      else:
        log = b.log
        fabric = b.fabric

  return render_template('blanklist.html', blanks_wait=blanks_wait, blanks_done=blanks_done)

@app.route('/sheetlist', methods=['GET'])
def show_sheet_tasks():
  tasks = Task.query.order_by(Task.log).filter(Task.fabric.startswith("SHEET"))
  return render_template('list_view.html', title="Sheets List", items=["%s %s"%(t.folderid, t.modify_at) for t in tasks], printbtn=True)

@app.route('/')
@app.route('/printroom', methods=['GET'])
def show_tasks():
  view_type = request.args.get("view", "")
  today = date.today()
  waiting = Task.query.order_by(Task.daystogo).filter(Task.status != "dispatched").count()
  waiting += Task.query.order_by(Task.daystogo).filter_by(status=None).count()
  task_counts = [waiting]
  for i in range(6):
    date_from = date.today()-timedelta(days=i)
    date_to = date.today()-timedelta(days=i-1)
    count = Task.query.filter_by(status="dispatched").filter(Task.modify_at.between(date_from, date_to)).count()
    task_counts.append(count)

  #tasks = Task.query.order_by(Task.daystogo).filter(Task.status.in_(("assigned", None)))
  if view_type=="":
    tasks = Task.query.order_by(Task.daystogo).filter(Task.status.in_(("assigned", "dispatching"))).all()
    tasks.extend(Task.query.order_by(Task.daystogo).filter_by(status=None).all())
  elif view_type[:3]=="log":
    tasks = Task.query.filter_by(log=view_type[4:]).all()
  else:
    day_before = int(view_type.split('-')[1])
    date_from = date.today()-timedelta(days=day_before)
    date_to = date.today()-timedelta(days=day_before-1)
    tasks = Task.query.filter_by(status="dispatched").filter(Task.modify_at.between(date_from, date_to)).all()

  for t in tasks:
    o = Orders.query.get(t.log)
    if o:
      t.create_at = o.create_at
      t.daystogo = o.daytogo

  return render_template('printroom_view.html', view=view_type, tasks=tasks, task_counts=task_counts)

@app.route('/add', methods=['GET'])
def hello(name=None):
  tasks = Task.query.order_by(Task.daystogo).all()
  return render_template('task_view.html', tasks=tasks)

@app.route('/sendjob', methods=['POST'])
def sendjob():
  taskid, printid = int(request.form['taskid']), request.form['printerid']
  t = Task.query.get(taskid)
  t.printer = printid
  t.modify_at = datetime.now()
  t.status = "assigned"
  db.session.commit()

  return redirect(url_for('show_tasks'))

@app.route('/deletejob', methods=['POST'])
def deletejob():
  taskid = int(request.form['taskid'])
  t = Task.query.get(taskid)
  db.session.delete(t)
  db.session.commit()

  return redirect(url_for('show_tasks'))

@app.route('/printroom/printsheets', methods=['POST'])
def printsheets():
  form = request.form
  printer = form['printerid']
  sheet_list = form['sheets']
  print("printer", printer)
  print("sheets", sheet_list)
  sheets=sheet_list.split(',')
  for sheetid in sheets:
    s = Sheet.query.get(sheetid)
    s.printer = printer
    s.status = "assigned"

  db.session.commit()
  #sheets = form['sheets']
  #print("sheets", sheets, "##".join(sheets))
  return render_template("echo.html", content="##".join(sheets))

if __name__ == '__main__':
  app.debug = True
  #app.after_request(add_cors_headers)
  app.run(host='0.0.0.0')

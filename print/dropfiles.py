import win32gui
import win32con
import pythoncom
import struct
import time
import sys
import glob
import os
import fabric_list
# tel rora 314

MAX_UNITS_PER_TAB = 15

class Window(object):
  def __init__(self, hwnd):
    if hwnd == 0:
      raise ValueError("Invalid HWND Value:%d."%hwnd)
    self.hwnd = hwnd

  def getChildHWnd(self, child_path):
    hwnd = self.hwnd
    for node in child_path:
      cname, wname = node
      hwnd = win32gui.FindWindowEx(hwnd, 0, cname, wname)
      if hwnd == 0:
        return hwnd
    return hwnd

  def getChild(self, cname, wname, index=0):
    cldWnd = win32gui.FindWindowEx(self.hwnd, 0, cname, wname)
    for i in xrange(index):
      cldWnd = win32gui.FindWindowEx(self.hwnd, cldWnd, cname, wname)

    return builders.get(cname, Window)(cldWnd) if cldWnd>0 else None

  def postMessage(self, message, wparam=0, lparam=0):
    return win32gui.PostMessage(self.hwnd, message, wparam, lparam)

  def sendMessage(self, message, wparam=0, lparam=0):
    return win32gui.SendMessage(self.hwnd, message, wparam, lparam)

class Button(Window):
  def __init__(self, hwnd):
    Window.__init__(self, hwnd)

  def click(self):
    win32gui.PostMessage(self.hwnd, win32con.BM_CLICK, 0, 0)

  def check(check):
    win32gui.postMessage(self.hwnd, win32con.BM_SETCHECK, win32con.BST_CHECKED if check else win32con.BST_UNCHECKED)

class ListBox(Window):
  def __init__(self, hwnd):
    Window.__init__(self, hwnd)

  def select():
    pass

class Edit(Window):
  def __init__(self, hwnd):
    Window.__init__(self, hwnd)

  def setValue():
    pass

  def getValue():
    pass

class SysTreeView(Window):
  def __init__(self, hwnd):
    Window.__init__(self, hwnd)

  def getItemByIndex(self, index):
    item = self.sendMessage(0x110a) 
    for i in xrange(index):
      item = self.sendMessage(0x110a, 6, item)
      if item == 0:
        print "index:%d not found!"%i
        return 0
    return item

  def select(self, index):
    item = self.getItemByIndex(index)
    #print "item hwnd %d"%item
    self.sendMessage(0x110b, 9, item)

class ComboBox(Window):

  def select(self, index):
    return self.sendMessage(win32con.CB_SETCURSEL, index)

builders = {
    "#32770":Window, #Dialog
    "ListBox":ListBox,
    "Button":Button,
    "Edit":Edit,
    "SysTreeView32":SysTreeView,
    "ComboBox":ComboBox,
    }

class PosterPrint(Window):
  def __init__(self, hwnd):
    Window.__init__(self, hwnd)
    self.statusbar = self.getChild("Afx:StatusBar:400000:8:10003:10", None)

    self.fabric_index = None
  
  def newTask(self, folder, size=""):
    print "Import task created, folder:\n  %s"%folder
    fabric = getFabricFromFolder(os.path.basename(folder))
    fab_size = fabric_list.fabric[fabric][1]
    if fab_size <= 54:
      sidx = 0
    elif fab_size <= 56:
      sidx = 1
    elif fab_size <= 58:
      sidx = 2
    elif fab_size <= 60:
      sidx = 3
    elif fab_size <= 64:
      sidx = 4
    elif fab_size <= 64:
      sidx = 5
    else:
      raise "fabric error %s->%s"%(os.path.basename(folder), fabric)

    self.fabric_index = sidx
    print "\nFabric decided, fabric[%s] Index:%d"%(fabric, sidx)

    if size:
      self.importSizeFromFolder(folder, size)
    
    else:
      if len(getFilesFromFolder(folder, "*.pdf")) < MAX_UNITS_PER_TAB:
        self.importFolder(folder)
      else:
        for size in size_order:
          self.importSizeFromFolder(folder, size)

  def waitFinish(self):
    while True:
      time.sleep(0.5)
      status_len = self.statusbar.sendMessage(win32con.WM_GETTEXTLENGTH)
      if status_len == 5:
        time.sleep(0.5)
        status_len = self.statusbar.sendMessage(win32con.WM_GETTEXTLENGTH)
        if status_len == 5:
          break

  def dropFilesToWindow(self, files):
    file_name_buffer = '\0'.join(files)+'\0\0'
    fmt="lllll%ss"%len(file_name_buffer)
    dropfiles=struct.pack(fmt, 20, 0, 0, 0, 0, file_name_buffer)
    stg = pythoncom.STGMEDIUM()
    stg.set(pythoncom.TYMED_HGLOBAL, dropfiles)

    self.postMessage(win32con.WM_DROPFILES, stg.data_handle)
    #print "sleep for %d sec"%len(files)*2
    self.waitFinish()
    #time.sleep(len(files)*2)


  def newTab(self):
    self.sendMessage(win32con.WM_COMMAND, 0xE100)
    time.sleep(1.5)

    while True:
      pd = self.getChild("Afx:ControlBar:400000:8:10003:10", "Properties")
      if pd:
        #print "Got Properties Pannel:%x"%pd.hwnd
        #getPropertiesLeftTree
        ptree = pd.getChild("SysTreeView32", "")
        if ptree:
          break
      time.sleep(0.5)
    ptree.select(1)

    while True:
      dlg_md_size = pd.getChild("#32770", "", 1)
      if not dlg_md_size:
        time.sleep(0.5)
        continue
      #print "Got media size Dialog:%x"%dlg_md_size.hwnd
      cmb_size = dlg_md_size.getChild("ComboBox", None)
      #print "Got media size ComboBox:%x"%cmb_size.hwnd
      if cmb_size:
        break
      time.sleep(0.5)
    cmb_size.select(self.fabric_index)
    btnapply = pd.getChild("Button", "Apply")
    btnapply.click()
    self.space_available = MAX_UNITS_PER_TAB

  def waitCtrl(self):
    pass

  def importFiles(self, files):
    while files:
      if self.space_available == 0:
        print "\nNo space, Create new Tab"
        self.newTab()

      import_count = min(self.space_available, len(files))
      import_files = files[:import_count]
      print "  Import %d Files"%import_count
      for f in import_files:
        print "    %s"%os.path.basename(f)
      self.dropFilesToWindow(import_files)
      self.space_available -= import_count
      files = files[import_count:]

  def importFilesPartly(self, files):
    if len(files)==0:
      return

    #pp.postMessage(win32con.WM_COMMAND, 0xE100)
    for part in part_order:
      ifile = []
      for f in files:
        if part in f:
          ifile.append(f)

      if ifile:
        print "  Import %s: %d Files"%(part, len(ifile))
        self.importFiles(ifile)

      files = [f for f in files if not f in ifile]
    if len(files):
      print "  Import Other: %d Files"%len(files)
      for f in files:
        print "    %s"%os.path.basename(f)
      self.importFiles(files)


  def importFolder(self, folder):
    pass

  def importSizeFromFolder(self, folder, size):
    filelist = getFilesFromFolder(folder, "%s_*.pdf"%size)
    filelist.extend(getFilesFromFolder(folder, "_%s_*.pdf"%size))
    if len(filelist) == 0:
      return

    print "\nCreate new Tab for Size[%s]"%size
    self.newTab()
    self.importFilesPartly(filelist)

def getPostPrint():
  hwnd = win32gui.FindWindow("PpUi14AppWindow", None)
  return PosterPrint(hwnd) if hwnd>0 else None

def getFilesFromFolder(folder, pattern):
  return glob.glob(os.path.join(folder, pattern))

def getFabricFromFolder(folder):
  fab = folder.split('_')[1]
  if "FLAT" in fab:
    fab = fab[4:]
  return fab

size_order = ("AXXXXLT", "AXXXLT","AXXLT", "AXLT", "ALT", "AMT", "AST", "AXXXXL", "AXXXL", "AXXL", "AXL", "AL", "AM", "AS", "AXS", "AXXS", "YXXL", "YXL", "YL", "YM", "YS")
part_order = ("FRONT", "BACK", "LEG", "SLEEVE", "BUCKLE")

if __name__ == "__main__":
  print "Init ...."
  pp = getPostPrint()

  folder = sys.argv[1]
  size = sys.argv[2] if len(sys.argv)>2 else None
  pp.newTask(folder, size)

print "\nTask Done!"
  #pp.postMessage(win32con.WM_COMMAND, 0xE107)

"""pp.postMessage(win32con.WM_COMMAND, 0xE100)
axl_files = getFilesFromFolder(sys.argv[1], "AXL_*.pdf")
pp.dropFilesToWindow(axl_files)

time.sleep(len(axl_files))
pp.postMessage(win32con.WM_COMMAND, 0xE100)
al_files = getFilesFromFolder(sys.argv[1], "AL_*.pdf")
pp.dropFilesToWindow(al_files)
pp.postMessage(win32con.WM_COMMAND, 0xE107)"""

"""notepad = find_window("notepad", None)
if len(sys.argv) > 1:
  notepad.dropFilesToWindow([sys.argv[1]])
else:
  notepad.dropFilesToWindow(["d:\c.txt"])

notepad.postMessage(win32con.WM_COMMAND, 6, 0)
time.sleep(5)

printdialog = find_window("#32770", "Print")
#cancel_path = (("Button", "Cancel"),)
#cancel_path = (("Button", "&Print"),)
btnCancel = printdialog.getChild("Button", "Cancel")
btnCancel.click()
#btnCancel.postMessage(win32con.BM_CLICK, 0, 0)
"""

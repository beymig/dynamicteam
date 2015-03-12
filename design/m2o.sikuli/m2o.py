while 1:
    wait("1425402051251.png", FOREVER)
    if exists("1425402071876.png"):#or exists():
        dlgBox = getLastMatch()
        if dlgBox.exists("1425404262376.png") or dlgBox.exists("1425404278299.png"):
            btnOK = dlgBox.find("1425402420566.png")
            click(btnOK)

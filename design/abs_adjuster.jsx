function ArtboardsAdjuster(doc){
  function getOutline(actionName){
    var items = app.activeDocument.selection;
    for(var i = 0;i < items.length;i++){
      items[i].selected = false;
    }

    app.doScript (actionName, "Default Actions"); //"select outlines"
    items = app.activeDocument.selection;
    for(var i = 0;i < items.length;i++){
      items[i].selected = false;
    }
    return items;
  }

  function fitAll(pi){
    if (pi.typename == "GroupItem"){
      for ( var i = 0; i<pi.pageItems.length; i++){
        fitAll(pi.pageItems[i]);
      }
    }
    else{
      pi.selected = true;
      app.activeDocument.artboards.setActiveArtboardIndex (getArtboard (pi));
      app.doScript ("fit select", "Default Actions");
      pi.selected = false;
    }
  }

  function getArtboard(pi){
    var pir = pi.controlBounds;
    var picp = [(pir[0]+pir[2])/2, (pir[1]+pir[3])/2];
    
    var abs = app.activeDocument.artboards;
    for (var i=0; i<abs.length; i++){
      var abr = abs[i].artboardRect;
      if (picp[0]>abr[0] && picp[0]<abr[2]&&picp[1]<abr[1] && picp[1]>abr[3]){
        return i;
      }
    }
  }

  this.run = function(){
    var swcolor = 0;
    try {
      swcolor = doc.swatches.getByName ("NIKE LIGHT BLUE");
    }
    catch(e) {
    }

    var items;
    if (swcolor){
      items = getOutline("select outlines");
    }else{
      items = getOutline("select outlines1");
    }

    for (var i=0; i<items.length; i++){
      fitAll(items[i]);
    }
  }
}


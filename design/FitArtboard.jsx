﻿
function initOutline(){
  var items = app.activeDocument.selection;
  for(var i = 0;i < items.length;i++){
    items[i].selected = false;
  }

  app.doScript ("select outlines", "Default Actions");
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

var items = initOutline ();
for (var i=0; i<items.length; i++){
  fitAll(items[i]);
}
/*for (var j=0; j<items.length; j++){
    items[j].selected = true;
    app.doScript ("fit select", "Default Actions");
    items[j].selected = false;
    }*/
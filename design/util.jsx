﻿#include "m2o_cfg.jsx"

var Util = {
}

Util.getOriginalPdfFolder = function(log){
  function getLogFolder(sFolder, log){
    $.writeln(sFolder, log);
    var f = Folder(sFolder);
    var path = []
    path.push(log.substr(0, 3));
    path.push(log);
    //path.push(log+"_*");
    var subf = f;
    for ( var i = 0; i<path.length; i++){
      var tmp = subf.getFiles(path[i]);
      var subfs = tmp.filter(function(f){return f instanceof Folder;});
      if(subfs.length){
        subf = subfs[0];
      }else{
        subf = null;
        return [];
        }
      }
    return subf.getFiles(log+"_*").filter(function(f){return f instanceof Folder;});   
  }

  var searchFolders = ORIGINAL_PDF_FOLDER.split(",");
  var logFolders = [];
  for (var i=0; i<searchFolders.length; i++){
    logFolders = logFolders.concat(getLogFolder(searchFolders[i], log));
  }
  if(logFolders.length==1){
    return logFolders[0];
  }else if(logFolders.length==0){
    Window.alert("No folder for log:'"+log+"'find!");
  }else{
    Window.alert("Multipule folder for log:'"+log+"'find!");
  }
  return "";
};

Util.exportArtboard = function(fPath, doc, index){
  var options = new PDFSaveOptions();
  options.compatibility = PDFCompatibility.ACROBAT5;
  options.generateThumbnails = true;
  options.preserveEditability = false;
  options.artboardRange = (index+1).toString();

  var overwrite = true;
  var destFile = new File(fPath);
  if ( destFile.exists ) {
    overwrite = Window.confirm(destFile + " exists. Overwrite?");
  }
          
  if ( overwrite ){
    doc.saveAs(destFile, options);
    return destFile;
  }       
};

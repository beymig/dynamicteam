
#include "util.jsx"


var GenerateLabels = (function (){
  var LabelTemplate = function(aiFile){
    this.load = function(aiFile){
      // open ai file
      this.doc = app.open(File(aiFile));
      var textFrames = app.activeDocument.textFrames;
      var tf = null;
      // store textframe
      for (var i=0; i<textFrames.length; i++){
        tf = textFrames[i];
        switch(tf.contents){
          case "FABRIC:  00000":
            this.tfFabric = tf;
            break;
          case "QTY: 0":
            this.tfQty = tf;
            break;
          case "FABRIC:  0 OF 0":
            this.tfFabSeq = tf;
            break;
          case "SIZE: 00":
            this.tfSize = tf;
            break;
          case "LOG # 000000":
            this.tfLog = tf;
            break;
        }
      }
    };
    this.unload = function(){
      // close document without saving
      this.doc.close(SaveOptions.DONOTSAVECHANGES);
    };
    this.generateLabel = function(fName, labelInfo){
      // replace information
      this.tfLog.contents = "LOG # " + labelInfo["log"];
      this.tfQty.contents = "QTY: " + labelInfo["qty"];
      this.tfFabric.contents = "FABRIC:  " + labelInfo["fabric"];
      this.tfSize.contents = "SIZE: " + labelInfo["size"];
      this.tfFabSeq.contents = "FABRIC:  " + labelInfo["sequence"];
      // change color
      var sizeColor = this.doc.swatches.getByName(this.colorTable[labelInfo["size"]]).color;
      var tfs = [this.tfLog, this.tfQty, this.tfFabric, this.tfSize, this.tfFabSeq];
      for(var i=0; i<tfs.length; i++){
        var chars = tfs[i].textRange.characters;
        for(var j=0; j<chars.length; j++) {
          chars[j].characterAttributes.fillColor = sizeColor;
        }
      }
      // export label
      Util.exportArtboard(fName, this.doc, 0);
    };
    this.load(aiFile);
  }

  LabelTemplate.prototype.colorTable = {
    "YS":"DYNAMIC SPOT JET BLACK",
    "YM":"DYNAMIC SPOT GREY",
    "YL":"DYNAMIC SPOT NAVY",
    "YXL":"DYNAMIC SPOT TEAL",
    "AXS":"DYNAMIC SPOT RED",
    "AS":"DYNAMIC SPOT ORANGE",
    "AM":"DYNAMIC SPOT KELLY",
    "AL":"DYNAMIC SPOT ROYAL",
    "AXL":"DYNAMIC ATHLETIC PURPLE",
    "AXXL":"DYNAMIC ATHLETIC CARDINAL",
    "AXXXL":"DYNAMIC SPOT VEGAS",
    "AXXXXL":"DYNAMIC SPOT VEGAS",
    "AST":"DYNAMIC SPOT ORANGE",
    "AMT":"DYNAMIC SPOT KELLY",
    "ALT":"DYNAMIC SPOT ROYAL",
    "AXLT":"DYNAMIC ATHLETIC PURPLE",
    "AXXLT":"DYNAMIC ATHLETIC CARDINAL",
    "AXXXLT":"DYNAMIC SPOT VEGAS",
    "AXXXXLT":"DYNAMIC SPOT VEGAS"
  };


  /*var logNumber = Window.prompt("Enter log number then press Enter or click OK.", "", "Log Number");
  if (logNumber == undefined){
    return;
  }*/

  function GenerateLabels(logNumber){
    var origin = Util.getOriginalPdfFolder(logNumber);
    if (!origin)
      return;

    var labelTemplate = new LabelTemplate(LABEL_TEMPLATE_FILE);
    var infoFile = new File(origin+"/exportinfo.json");
    if ( infoFile.exists ) {
      infoFile.open("r");
      exportInfo = JSON.parse(infoFile.read());
      infoFile.close();
    }

    var fabricCount = exportInfo.fabricInfo.length;
    for (var i=0; i<fabricCount; i++){
      var size;
      for (size in exportInfo.sizeInfo){
        if (size == "keys")
          continue;
        labelTemplate.generateLabel(origin+"/"+["", size, exportInfo.fabricInfo[i], logNumber, "LABELS"].join("_")+".pdf", {
          "log":logNumber,
          "size":size,
          "qty":exportInfo.sizeInfo[size],
          "fabric":exportInfo.fabricInfo[i],
          "sequence":[i+1, fabricCount].join(" OF ")
        });
      }
    }
    labelTemplate.unload();
  }

  return GenerateLabels;
})();

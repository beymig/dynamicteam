// JavaScript Document
//Set up vairaibles
#include "m2o_cfg.jsx"

Array.prototype.map = function(f){
  var arry = [];
  for ( var i=0; i<this.length; i++){
    arry.push(f(this[i]));
  }
  return arry;
}

Array.prototype.filter = function(f){
  var arry = [];
  for ( var i=0; i<this.length; i++){
    if(f(this[i])) arry.push(this[i]);
  }
  return arry;
}

Array.prototype.reduce = function(f, initValue){
  var result = initValue;
  for ( var i=0; i<this.length; i++){
    result = f(this[i], result);
  }
  return result;
}

Array.prototype.indexOf = function(v){
  for ( var i=0; i<this.length; i++){
    if (this[i]==v){
      return i;
    }
  }
  return -1;
}

Array.prototype.locate = function(comp, f){
  for ( var i = 0; i<this.length; i++){
    if (f(comp, this[i]))
      return i;
  }
  return -1;
}

Array.prototype.groupBy = function(keygen){
  var result = {}
  for ( var i = 0; i<this.length; i++){
    var key = keygen(this[i]);
    if (key in result){
      result[key].push(this[i]);
    }else{
      result[key] = [this[i]];
    }
  }
  return result;
}

Object.prototype.keys = function(){
  var keys = [];
  for ( key in this){
    if (key != "keys"){
      keys[keys.length] = key;
    }
  }
  return keys;
}

// all fabric number -= 2
function Rect(ltwh){
  this.l = ltwh[0];
  this.t = ltwh[1];
  this.r = ltwh[0]+ltwh[2];
  this.b = ltwh[1]-ltwh[3];

  this.w = ltwh[2];
  this.h = ltwh[3];

  this.get_copy_at = function(point){
    return new Rect([point[0], point[1], this.w, this.h]);
  };
  this.get_expand_rect = function(dsize){
    return new Rect([this.l-dsize, this.t+dsize, this.w+2*dsize, this.h+2*dsize]);
  }

  this.get_ltrb = function(){
    return [this.l, this.t, this.r, this.b];
  };

  this.get_ltwh = function(){
    return [this.l, this.t, this.w, this.h];
  };

  this.is_overlap = function(rh){
    var lh = this;
    return !(lh.l>=rh.r || lh.r<=rh.l || lh.t<=rh.b || lh.b>=rh.t);
  }
}

function RectPiece(pageitem){
  var pi = pageitem;

  this.get_rect = function(){
    return new Rect([
        pi.controlBounds[0],
        pi.controlBounds[1],
        pi.controlBounds[2] - pi.controlBounds[0],
        pi.controlBounds[1] - pi.controlBounds[3]]);
  }

  this.move_to = function(point){
    pi.translate(point[0]-pi.controlBounds[0], point[1]-pi.controlBounds[1])
  };

  this.show = function(show){
    pi.hidden = !show;
  };
  
  this.remove = function(){
    pi.remove();
  }

  this.flip = function(){
    var m  = app.getScaleMatrix(-100,100);
    pi.transform(m);
  }

  this.pageitem = function(){
    return pi;
  }
}

var PrintBoard = function(artboard){
  $.writeln(artboard.artboardRect);
  this.width = artboard.artboardRect[2];
  this.height = artboard.artboardRect[3];
  this.lowest = 0;
  this.insert_points = [];
  
  this.insert_points.push([DOT_SIZE, -DOT_SIZE-TITLE_SIZE]);
  this.pieces = [];
  this.dots = [];

  this.import_pieces = function(pieces){
    for(var i=0; i<pieces.length; ){
      if (this.insert(pieces[i])){
        pieces.splice (i, 1);
      }
      else{
        i++;
      }
    }
  };

  this.export_pdf = function(filename){
    $.write("export file:"+filename);
    var doc = app.activeDocument;
    var saveName = new File(filename);
    var saveOpts = new PDFSaveOptions();
    saveOpts.compatibility = PDFCompatibility.ACROBAT5;
    saveOpts.generateThumbnails = true;
    saveOpts.preserveEditability = false;
    saveOpts.artboardRange = "1";
    doc.saveAs(saveName, saveOpts);
    $.writeln("... done!");
  };

  this.remove_all = function(){
    for(var i=0; i<this.pieces.length; i++)
      this.pieces[i].remove();
    for(var i=0; i<this.dots.length; i++)
      this.dots[i].remove();
  };

  this.insert = function(piece)
  {
    //var piece = new RectPiece(pageitem);
    var rect = piece.get_rect();
    ex_rect = rect.get_expand_rect(DOT_SIZE);
    for(var i=0; i<this.insert_points.length; i++)
    {
      var tr = ex_rect.get_copy_at(this.insert_points[i]);
      if (this.test(tr))
      {
        var dst = rect.get_copy_at(this.insert_points[i])
        this.insert_points.splice (i, 1);
        this.place_piece(dst, piece);
        piece.show(true);
        return true;
      }
    }
    return false;
  };

  this.test = function(tr)
  {
    //var tr = rect.get_copy_at(point);
    if (tr.r>this.width)
      return false;
    if (tr.b<this.height)
      return false;

    for(var i=0; i<this.pieces.length; i++)
    {
      if (tr.is_overlap(this.pieces[i].get_rect()))
        return false;
    }
    return true;
  };

  this.place_piece = function(rect, piece)
  {
    var point = [rect.l, rect.t];
    piece.move_to(point);
    this.place_dot_around(rect);
    this.pieces.push(piece);
    this.insert_points.push([rect.r+DOT_SIZE, rect.t]);
    this.insert_points.push([rect.l, rect.b-DOT_SIZE]);//piece.y-piece.height]);
    this.insert_points.sort(function(a, b)
      {
        return -(a[1]-b[1])|| (a[0] - b[0]);
      });
  };

  this.place_dot_at = function(point){
    var dot = import_piece(app.activeDocument, DOT_FILE);
    //var piece = new RectPiece(dot);

    dot.move_to(point);
    this.dots.push(dot);
    var bottom = dot.get_rect().b;
    if (bottom < this.lowest)
      this.lowest = bottom;
  };

  this.place_dot_around = function(rect){
    var position;
    // left
    var high = Math.floor(rect.t/DOT_SIZE);
    var low = Math.ceil(rect.b/DOT_SIZE);
    position = [rect.l-DOT_SIZE+5, DOT_SIZE*(high-Math.floor((high-low)/3))];
    this.place_dot_at(position);
    // top
    var left = Math.ceil(rect.l/DOT_SIZE);
    var right = Math.floor(rect.r/DOT_SIZE);
    position = [DOT_SIZE*(left+Math.floor((right-left)/3)), rect.t+DOT_SIZE-5];
    this.place_dot_at(position);
    // right
    position = [rect.r+5, DOT_SIZE*(low+Math.floor((high-low)/3))];
    this.place_dot_at(position);
    // bottom
    position = [DOT_SIZE*(right-Math.floor((right-left)/3)), rect.b-5];
    this.place_dot_at(position);
  };
}

function import_piece(doc, filename){
  var pi = doc.placedItems.add();
  pi.file = File(filename);
  return new RectPiece(pi);
};

function deleteThruCut(){
  var items = app.activeDocument.selection;
  for(var i = 0;i < items.length;i++){
    items[i].selected = false;
  }

  //selectFirstByColor("Thru-Cut");
  //app.doScript ("delete thru cut", "Default Actions");
  app.doScript ("rm thru cut", "Default Actions");
}


var Task = function(source){
  var _this = this;

  this.execute = function(){
    // detect task type
    if (source instanceof Folder){
      var files = source.getFiles(/\.(ai|eps|pdf)$/i);
      var attrs = source.displayName.split("_");

      this.log = attrs[0];

      this.size_groups = group_files(files);
      // [
      //   ('foldername', [('basename', files), ...])
      //   ...
      // ]
      if ( attrs[1]=="S" || attrs[1]=="L"){
        // if sheet
        // split folder by Nothing; split sheet by body size > number; arrange by piece size
        var sheetGroup = files.map(function(f){
          var attr = f.displayName.split(".")[0].split("_");
          if ( attr[0]=="" ){
            attr = attr.slice(1);
          }
          return [attr[0], attr[attr.length-1], f]; //[size, number]
        }).filter(function(f){
          return !isNaN(f[1]);
        }).groupBy(function(item){ return [item[0], item[1]].join('_'); });


        this.unit_count = attrs[2];
        this.filesArrangeStruct = {}
        this.filesArrangeStruct["Sheet"+attrs[1]]= sheetGroup.keys().sort(function(l, r){
          var lf = sheetGroup[l];
          var rf = sheetGroup[r];
          if (lf[0]!=rf[0]){
            return size_order.indexOf(rf[0]) - size_order.indexOf(lf[0]);
          }else{
            return parseInt(lf[1])-parseInt(rf[1]);
          }
        }).map(function(item){return [item, sheetGroup[item]];});
      }
      else{
        // if roll
        // split folder by fabric; split sheet by body size; sort by piece size
        this.unit_count = attrs[1];
        var fabric_groups = files.map(function(f){
          var attr = f.displayName.split("_");
          if ( attr[0]=="" ){
            attr = attr.slice(1);
          }
          var size = attr[0];
          var fabric = attr[1]=="FLAT"?attr[2]:attr[1];
          fabric = fabric.replace("FLAT", "").replace(/^\s+|\s+$/g, '');
          return [size, fabric, f]; //[size, number]
        }).groupBy(function(item){
          return item[1];
        });
        for ( var key in fabric_groups){
          $.writeln(key);
        }
        for ( var key in fabric_groups){
          if (key=="keys")
            continue;
          var size_groups = fabric_groups[key].groupBy(function(item){return item[0];});
          fabric_groups[key] = size_groups.keys().sort(function(l, r){return size_order.indexOf(r[0][0]) - size_order.indexOf(l[0][0])}).map(function(size){
            return [size, size_groups[size]];
          });
        }
        this.filesArrangeStruct = fabric_groups;
      }
    }
    else{
      // redo
      // split folder by nothing; split sheet by Nothing; arrange sort by body size > piece size
      source.open('r');
      var info = source.read();
      source.close();

      info = info.split(";");
      folderName = info.shift();
      var attrs = folderName.split("_");

      files = [];
      //for ( var i=0; i<info.length; i++)
      //  files[i] = File(info[i]);
      files = info.map(function(fname){ return new File(fname);});

      this.log = attrs[0];
      this.unit_count = attrs[1];
      var fabric_groups = files.map(function(f){
        var attr = f.displayName.split("_");
        if ( attr[0]=="" ){
          attr = attr.slice(1);
        }
        var size = attr[0];
        var fabric = attr[1]=="FLAT"?attr[2]:attr[1];
        fabric = fabric.replace("FLAT", "").replace(/^\s+|\s+$/g, '');
        return [size, fabric, f]; //[size, number]
      }).groupBy(function(item){
        return item[1];
      });
      for ( var key in fabric_groups){
        if (key=="keys")
          continue;
        var size_groups = fabric_groups[key].groupBy(function(item){return item[0];});
        fabric_groups[key] = [["mix", size_groups.keys().sort(function(l, r){return size_order.indexOf(r[0][0]) - size_order.indexOf(l[0][0])}).map(function(key){
          return size_groups[key];
        })]];
      }
      this.filesArrangeStruct = fabric_groups;


      /*this.filesArrayStruct = files.map(function(f){
        var attr = f.displayName.split("_");
        if ( attr[0]=="" ){
          attr = attr.slice(1);
        }
        var size = attr[0];
        var fabric = attr[1]=="FLAT"?attr[2]:attr[1];
        fabric = fabric.replace("FLAT", "").replace(/^\s+|\s+$/g, '');
        return [size, fabric, f]; //[size, number]
      }).dictBy([1], [2]) */
    }
  };

  var group_files = function(files){
    //var re = new RegExp(".*\\.(ai|eps|pdf)$", "i");
    //var files = folder.getFiles(function(f){return f.displayName.match(re);});///\.(ai|eps|pdf)$/i);
    //var files = folder.getFiles(/\.(ai|eps|pdf)$/i);
    var size_groups = {};
    for ( var i = 0; i < files.length; i++){
      var attr = files[i].displayName.split("_");
      var size;
      var fabric;
      if ( attr[0]=="" ){
        attr = attr.slice(1);
      }
      size = attr[0];
      fabric = attr[1]=="FLAT"?attr[2]:attr[1];
      fabric = fabric.replace("FLAT", "");
      fabric = fabric.replace(/^\s+|\s+$/g, '');

      if ( ! (size in size_groups) ){
        size_groups[size] = {};
      }

      var size_group = size_groups[size];
      if ( ! (fabric in size_group) ){
        size_group[fabric] = [files[i]];
      } else{
        size_group[fabric].push(files[i]);
      }
    }
    return size_groups;
  };

  var init = function(source){
    var files;
    var folderName;
    if (source instanceof Folder){
      //_this.folder = source;
      folderName = source.displayName;
      files = source.getFiles(/\.(ai|eps|pdf)$/i);
    }
    else{
      source.open('r');
      var info = source.read();
      info = info.split(";");
      folderName = info.shift();
      files = [];
      for ( var i=0; i<info.length; i++)
        files[i] = File(info[i]);
      //files = info.map(function(fname){ return new File(fname);});
      source.close();
    }

    var folder_fields = folderName.split("_");
    _this.log = folder_fields[0];
    _this.unit_count = folder_fields[1];

    _this.size_groups = group_files(files);
  };

  this.combinePieces = function(ab, folder, filebase, pieces){
    // export
    var size_seq = 0;
    var total_len = 0;
    while(pieces.length > 0){
      var filename = [filebase, size_seq++].join('_') +".pdf";

      resize_artboard(ab, 0, 120);
      var pb = new PrintBoard(ab);
      //var timestamp = (new Date()).getTime();
      CUTCODE_TEXTFRAME.contents = filename;
      redraw();
      pb.import_pieces(pieces);
      var height = (new UnitValue(-pb.lowest, "px")).as ('in');
      resize_artboard(ab, 0, height);
      total_len += Math.ceil(height);


      var cut_file = CUT_OUTPUT_FOLDER+"\\" + filename;
      var cut_file_mid = CUT_OUTPUT_FOLDER_MID+"\\" + filename;
      var print_file = folder + "\\" + filename;

      pb.export_pdf(cut_file_mid);
      var pf = File(cut_file_mid);
      pf.copy(cut_file);

      pb.remove_all();
      CUTCODE_TEXTFRAME.contents = "  ";
      
      //
      var cutpiece = import_piece(app.activeDocument, cut_file_mid);
      cutpiece.move_to([0,0]);
      cutpiece.flip();
      cutpiece.pageitem().embed();
      
      //getRidOfCutLine("Thru-Cut");
      deleteThruCut();
      pb.export_pdf(print_file);

      //app.activeDocument.pageItems.removeAll();
      items = app.activeDocument.pageItems;
      for ( i = 0; i < items.length ; i++ )
      {
        if (items[i] != CUTCODE_TEXTFRAME){
          if (!items[i].hidden)
            items[i].remove();
        }
      }
    }
    return total_len;
  };

  this.importByFabric = function(fabric){
    var fabric_pieces = [];
    for (var idx=0; idx<size_order.length; idx++){
      var size = size_order[idx];
      if (size in this.size_groups){
        if (fabric in this.size_groups[size]){
          var files  = this.size_groups[size][fabric];
          fabric_pieces = fabric_pieces.concat(this.importAndOrderBySize(files));
        }
      }
    }
    return fabric_pieces;
  };

  this.importAndOrderBySize = function(files){
    var pieces = import_all(files);
    pieces.sort(function(a, b)
        {
          var ar = a.get_rect();
          var br = b.get_rect();
          return -(((ar.w*ar.h)-(br.w*br.h))||(ar.h-br.h));
        });
    return pieces;
  };

  this.export_all_new = function(){
    var global_seq = 0;
    var fabrics = this.filesArrangeStruct.keys();
    var timeStamp = (new Date()).valueOf().toString().substr(5, 5);
    var sub_folders = {};
    for (var fi = 0; fi<fabrics.length; fi++){
      var fabric = fabrics[fi];
      var folder_id = [this.log, fabric, this.unit_count].join('_');
      var output_folder = new Folder(OUTPUT_FOLDER + "\\" + [COMBINING_PREFIX, folder_id].join('_'));
      if ( ! output_folder.exists ){
        output_folder.create();
      }
      sub_folders[folder_id]=0;

      var fabric_width = FABRIC_LIST[fabric][1];
      var ab = app.activeDocument.artboards[0];
      $.writeln("fabric: "+fabric + "--> " + fabric_width);
      resize_artboard(ab, fabric_width-2, 0);
      var fabric_group = this.filesArrangeStruct[fabric];
      for ( var i = 0; i < fabric_group.length; i++){
        // file id = fabric_group[i][0]
        var files = fabric_group[i][1];
        var pieces = [];
        if (files[0][0] instanceof Array){
          for (var j=0; j<files.length; j++){
            pieces = pieces.concat(this.importAndOrderBySize(files[j].map(function(item){ return item[2];})));
          }
        } else{
          pieces = this.importAndOrderBySize(files.map(function(item){ return item[2];}));
        }
        sub_folders[folder_id]+=this.combinePieces(ab, output_folder, [this.log, fabric, fabric_group[i][0]].join('_'), pieces);
      }
    }
    var subfolderIds = sub_folders.keys();
    var folder_count = subfolderIds.length;
    var timeStamp = (new Date()).valueOf().toString().substr(5, 5);
    for (var i=0; i<folder_count; i++) {
      folder_id = subfolderIds[i];
      //var total_length = (new UnitValue(sub_folders[folder_id], "px")).as ('in');
      var sub_folder = new Folder(OUTPUT_FOLDER + "\\" + [COMBINING_PREFIX, folder_id].join('_'));
      var ok = sub_folder.rename(OUTPUT_FOLDER + "\\" + [COMBINED_PREFIX, folder_id, sub_folders[folder_id].toString()+"in", (i-1).toString()+"-"+folder_count.toString(), timeStamp].join('_'));
      if(!ok)
        $.writeln("Rename failed: "+sub_folder);
      else
        $.writeln("Rename to: "+sub_folder);
    }
  };

  this.export_all = function(){
    var global_seq = 0;
    var sub_folders = {};
    var done_fabric = {};
    var redoTask = this.log.indexOf("redo") != -1;
    for ( var size in this.size_groups){
      var size_group = this.size_groups[size];
      for ( var fabric in size_group ){
        var fabric_width = FABRIC_LIST[fabric][1];
        var ab = app.activeDocument.artboards[0];
        $.writeln("fabric: "+fabric + "--> " + fabric_width);
        resize_artboard(ab, fabric_width-2, 0);

        // Get all files matching the pattern
        var pieces;
        if (!redoTask){
          var files = size_group[fabric];
          pieces = this.importAndOrderBySize(files);
        } else{
          if (fabric in done_fabric){
            continue;
          }
          pieces = this.importByFabric(fabric);
          done_fabric[fabric] = 1;
        }

        // prepare folder
        var folder_id = [this.log, fabric, this.unit_count].join('_');
        var output_folder = new Folder(OUTPUT_FOLDER + "\\" + [COMBINING_PREFIX, folder_id].join('_'));
        if ( ! output_folder.exists ){
          output_folder.create();
          sub_folders[folder_id]=0;
        }
        $.writeln("export to: "+output_folder);
        
        if(!(folder_id in sub_folders))
          sub_folders[folder_id]=0;

        sub_folders[folder_id]+=this.combinePieces(ab, output_folder, [this.log, fabric, size].join('_'), pieces);
      }
    }
    var i = 0;
    var folder_count = 0;
    for( id in sub_folders)
      folder_count++;

    var timeStamp = (new Date()).valueOf().toString().substr(5, 5);
    for (var folder_id in sub_folders) {
      i++;
      //var total_length = (new UnitValue(sub_folders[folder_id], "px")).as ('in');
      var sub_folder = new Folder(OUTPUT_FOLDER + "\\" + [COMBINING_PREFIX, folder_id].join('_'));
      var ok = sub_folder.rename(OUTPUT_FOLDER + "\\" + [COMBINED_PREFIX, folder_id, sub_folders[folder_id].toString()+"in", i.toString()+"-"+folder_count.toString(), timeStamp].join('_'));
      if(!ok)
        $.writeln("Rename failed: "+sub_folder);
      else
        $.writeln("Rename to: "+sub_folder);
    }
  };

  //init(source);
  this.execute();
}


function get_fabric_size(folder){
  var fabric_code = function(folder){
    var fabric_code = folder.displayName.split("_")[1];
    if (fabric_code.search("FLAT")==0)
      fabric_code = fabric_code.slice(4);
    return fabric_code;
  }(folder);

  if (fabric_code in FABRIC_LIST){
    var size = FABRIC_LIST[fabric_code][1];
    return size;
  }
}

function import_all(files){
  var pieces = [];
  var doc = app.activeDocument;
  for (var i = 0; i < files.length; i++) {
    $.write("importing file:"+files[i]);
    var piece = import_piece(doc, files[i]);
    piece.show(false);
    pieces.push(piece);
    $.writeln("... done!");
  }
  return pieces;
}

function resize_artboard(ab, width, height){
  width = (width && (new UnitValue(width, "in")).as ('px'))||ab.artboardRect[2];
  height = (height && (new UnitValue(-height, "in")).as ('px'))||ab.artboardRect[3];
  ab.artboardRect = [0, 0, width, height];
};

function createTitleText(){
  // Point Text
  var pointTextRef = app.activeDocument.textFrames.add();
  pointTextRef.contents = "";
  pointTextRef.top = -TITLE_SIZE;
  pointTextRef.left = 10;

  // resize text
  //
  var docRef = app.activeDocument;
  var charStyle;
  try{
    charStyle = docRef.characterStyles.getByName("BigRed");
  }catch(e) {
  }
  if (!charStyle){
    charStyle = docRef.characterStyles.add("BigRed");
    // set character attributes
    var charAttr = charStyle.characterAttributes;
    charAttr.size = TITLE_SIZE;
    charAttr.tracking = -TITLE_SIZE;
    charAttr.capitalization = FontCapsOption.ALLCAPS;
    var redColor = new RGBColor();
    redColor.red = 255;
    redColor.green = 0;
    redColor.blue = 0;
    charAttr.fillColor = redColor;
  }
  // apply to each textFrame in the document
  // TODO: replace with pointTextRef
  charStyle.applyTo(docRef.textFrames[0].textRange);

  return pointTextRef;
}

function main(){
  // Select the source folder.
  var source = Folder.selectDialog('Select the folder with Illustrator files that you want to mere into one', '~');

  if(!source)
    source = File.openDialog('Select the folder with Illustrator files that you want to mere into one', '*.redo');

  if(!source)
    return;

  CUTCODE_TEXTFRAME = createTitleText();

  var task = new Task(source);
  task.export_all_new();
  CUTCODE_TEXTFRAME.remove();
  if (source instanceof File){
    source.rename(source.name.replace(".redo", ".done"));
  }
}

main();


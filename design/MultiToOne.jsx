// JavaScript Document
//Set up vairaibles
#include "m2o_cfg.jsx"

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
  
  this.insert_points.push([DOT_SIZE, -DOT_SIZE-20]);
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

function getRidOfCutLine(colorName)
{
  var doc, items, i = 0, n = 0, item, swcolor, selectionArray = [];
  doc = app.activeDocument;
  try
  {
      swcolor = doc.swatches.getByName ( colorName );
  }
  catch(e)
  {
      return;
  }

  var color = swcolor.color.spot.color ;

  items = doc.pageItems;
  for ( i = 0; i < items.length ; i++ )
  {
    item = items[i];
    if ( item.strokeColor && item.strokeColor.typename == swcolor.color.typename){
      if(item.strokeColor.spot.color.cyan == color.cyan
          && item.strokeColor.spot.color.magenta == color.magenta
          && item.strokeColor.spot.color.yellow == color.yellow
          && item.strokeColor.spot.color.black == color.black ){
            item.remove();
            $.writeln("remove cutline: ",i);
          }
    }
  }
}

var Task = function(folder){
  var _this = this;

  var group_files = function(folder){
    //var re = new RegExp(".*\\.(ai|eps|pdf)$", "i");
    //var files = folder.getFiles(function(f){return f.displayName.match(re);});///\.(ai|eps|pdf)$/i);
    var files = folder.getFiles(/\.(ai|eps|pdf)$/i);
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
      fabric = fabric.replace(/^\s+|\s+$/gm,'');

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

  var init = function(folder){
    _this.folder = folder;
    var folder_fields = folder.displayName.split("_");
    _this.log = folder_fields[0];
    _this.unit_count = folder_fields[1];

    _this.size_groups = group_files(folder);
  };

  this.export_all = function(){
    var global_seq = 0;
    var sub_folders = {};
    for ( var size in this.size_groups){
      var size_group = this.size_groups[size];
      for ( var fabric in size_group ){
        var fabric_width = FABRIC_LIST[fabric][1];
        var ab = app.activeDocument.artboards[0];
        $.writeln("fabric: "+fabric + "--> " + fabric_width);
        //resize_artboard(ab, fabric_width-2, 120);

        // Get all files matching the pattern
        var files = size_group[fabric];

        var pieces = import_all(files);
        pieces.sort(function(a, b)
            {
              var ar = a.get_rect();
              var br = b.get_rect();
              return -(((ar.w*ar.h)-(br.w*br.h))||(ar.h-br.h));
            });

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
        //
        // export
        var size_seq = 0;
        while(pieces.length > 0){
          var filename = [this.log, fabric, size, size_seq++].join('_') +".pdf";

          resize_artboard(ab, fabric_width-2, 120);
          var pb = new PrintBoard(ab);
          //var timestamp = (new Date()).getTime();
          CUTCODE_TEXTFRAME.contents = filename;//[this.log, fabric, size, "cut", global_seq++].join("_");
          redraw();
          pb.import_pieces(pieces);
          ab.artboardRect = [0, 0, (new UnitValue(fabric_width-2, "in")).as ('px'), pb.lowest];
          sub_folders[folder_id] += Math.ceil((new UnitValue(-pb.lowest, "px")).as ('in'));


          var cut_file = CUT_OUTPUT_FOLDER+"\\" + filename;//[this.log, "cut", global_seq, timestamp].join("_")+".pdf";
          var cut_file_mid = CUT_OUTPUT_FOLDER_MID+"\\" + filename;
          var print_file = output_folder + "\\" + filename;//[this.log, fabric, size, size_seq++, "cut", global_seq++].join('_') +".pdf";

          pb.export_pdf(cut_file_mid);
          var pf = File(cut_file_mid);
          pf.copy(cut_file);

          pb.remove_all();
          CUTCODE_TEXTFRAME.contents = "";
          
          //
          var cutpiece = import_piece(app.activeDocument, cut_file_mid);
          cutpiece.move_to([0,0]);
          cutpiece.flip();
          cutpiece.pageitem().embed();
          
          getRidOfCutLine("Thru-Cut");
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

          //resize_artboard(ab, fabric_width-2, 120);
        }
      }
    }
    var i = 0;
    var folder_count = 0;
    for( id in sub_folders)
      folder_count++;

    for (var folder_id in sub_folders) {
      i++;
      //var total_length = (new UnitValue(sub_folders[folder_id], "px")).as ('in');
      var sub_folder = new Folder(OUTPUT_FOLDER + "\\" + [COMBINING_PREFIX, folder_id].join('_'));
      var ok = sub_folder.rename(OUTPUT_FOLDER + "\\" + [COMBINED_PREFIX, folder_id, sub_folders[folder_id].toString()+"in", i.toString()+"-"+folder_count.toString()].join('_'));
      if(!ok)
        $.writeln("Rename failed: "+sub_folder);
      else
        $.writeln("Rename to: "+sub_folder);
    }
  };

  init(folder);
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
  ab.artboardRect = [0, 0, (new UnitValue(width, "in")).as ('px'), (new UnitValue(-height, "in")).as('px')];
};

function main(){
  // Select the source folder.
  var sourceFolder = Folder.selectDialog('Select the folder with Illustrator files that you want to mere into one', '~');

  if(!sourceFolder)
    return;

  // Point Text
  var pointTextRef = app.activeDocument.textFrames.add();
  pointTextRef.contents = "";
  pointTextRef.top = -20;
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
    charAttr.size = 20;
    charAttr.tracking = -30;
    charAttr.capitalization = FontCapsOption.ALLCAPS;
    var redColor = new RGBColor();
    redColor.red = 255;
    redColor.green = 0;
    redColor.blue = 0;
    charAttr.fillColor = redColor;
  }
  // apply to each textFrame in the document
  charStyle.applyTo(docRef.textFrames[0].textRange);


  CUTCODE_TEXTFRAME = pointTextRef;

  var task = new Task(sourceFolder);
  task.export_all();
  CUTCODE_TEXTFRAME.remove();
}

main();


// JavaScript Document
//Set up vairaibles

// all fabric number -= 2
var fabric = {
  "29089":["BASKETBALL", 60, 80],
  "28979":["BASKETBALL", 60, 80],
  "20365":["BASKETBALL", 60, 90],
  "29192":["BASKETBALL", 58, 90],
  "9851":["BASKETBALL", 62, 60],
  "9087":["BASKETBALL", 54, 60],
  "20324":["TRACK", 62, 80],
  "9052":["TRACK", 60, 60],
  "29084":["TRACK", 62, 60],
  "340880":["RACER KILT", 60, 50],
  "9017":["WRESTLING", 60, 90],
  "20337":["VOLLYBALL", 58, 60],
  "20316":["VOLLYBALL", 58, 60],
  "20439":["VOLLYBALL", 58, 60],
  "29121":["SOCCER", 62, 80],
  "28878":["SOCCER TRIM", 62, 70],
  "29209":["TRIM", 60, 50],
  "29127":["LACROSSE", 60, 90],
  "29287":["LACROSSE", 54, 70],
  "29176":["LACROSSE", 54, 70],
  "1649":["DYNA-DRY", 60, 60],
  "2031":["DYNA-DRY", 60, 60],
  "AEROFIBER":["DYNAMIC", 62, 90],
  "DRY-TEC":["DYNAMIC", 60, 90],
  "DAZZLE":["DYNAMIC", 60, 90],
  "5235":["FLEX-DRY", 63, 90],
  "RICE-MESH":["DYNAMIC", 61, 90],
  "STRECH-TEC":["DYNAMIC", 64, 90],
  "791-PANTS":["HEAVY POLYESTER", 64, 90],
  "298-JERSEY":["HEAVY POLYESTER", 60, 90],
  "5377 9.5 oz":["HEAVY WEIGHT", 63, 90],
  "AIR-MESH":["DYNAMIC", 60, 80],
  "HEAVY DAZZLE":["DYNAMIC", 60, 80],
  "POLY-FLEX":["DYNAMIC", 64, 90],
  "20365":["DYNAMIC", 61, 90],
  "1997":["NIKE", 54, 80],
  "1887":["NIKE", 55, 80],
  "5106":["NIKE", 62, 80],
};

var size_order = ["AXXXXLT", "AXXXLT","AXXLT", "AXLT", "ALT", "AMT", "AST", "AXXXXL", "AXXXL", "AXXL", "AXL", "AL", "AM", "AS", "AXS", "AXXS", "YXXL", "YXL", "YL", "YM", "YS"];

var dot_size = 30;

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
}

var PrintBoard = function(artboard){
  $.writeln(artboard.artboardRect);
  this.width = artboard.artboardRect[2];
  this.height = artboard.artboardRect[3];
  this.insert_points = [];
  this.insert_points.push([dot_size, -dot_size]);
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
    var doc = app.activeDocument;
    var saveName = new File(filename);
    var saveOpts = new PDFSaveOptions();
    saveOpts.compatibility = PDFCompatibility.ACROBAT5;
    saveOpts.generateThumbnails = true;
    saveOpts.preserveEditability = false;
    saveOpts.artboardRange = "1";
    doc.saveAs(saveName, saveOpts);
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
    ex_rect = rect.get_expand_rect(dot_size);
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
    this.insert_points.push([rect.r+dot_size, rect.t]);
    this.insert_points.push([rect.l, rect.b-dot_size]);//piece.y-piece.height]);
    this.insert_points.sort(function(a, b)
      {
        return -(a[1]-b[1])|| (a[0] - b[0]);
      });
  };

  this.place_dot_at = function(point){
    var dot = import_piece(app.activeDocument, "d:\\workspace\\dynamicteam\\dot.pdf");
    //var piece = new RectPiece(dot);

    dot.move_to(point);
    this.dots.push(dot);
  };

  this.place_dot_around = function(rect){
    var position;
    // left
    var high = Math.floor(rect.t/dot_size);
    var low = Math.ceil(rect.b/dot_size);
    position = [rect.l-dot_size+5, dot_size*(high-Math.floor((high-low)/3))];
    this.place_dot_at(position);
    // top
    var left = Math.ceil(rect.l/dot_size);
    var right = Math.floor(rect.r/dot_size);
    position = [dot_size*(left+Math.floor((right-left)/3)), rect.t+dot_size-5];
    this.place_dot_at(position);
    // right
    position = [rect.r+5, dot_size*(low+Math.floor((high-low)/3))];
    this.place_dot_at(position);
    // bottom
    position = [dot_size*(right-Math.floor((right-left)/3)), rect.b-5];
    this.place_dot_at(position);
  };
}

function import_piece(doc, filename){
  var pi = doc.placedItems.add();
  pi.file = File(filename);
  return new RectPiece(pi);
};


function get_fabric_size(folder){
  var fabric_code = function(folder){
    var fabric_code = folder.displayName.split("_")[1];
    if (fabric_code.search("FLAT")==0)
      fabric_code = fabric_code.slice(4);
    return fabric_code;
  }(folder);

  if (fabric_code in fabric){
    var item = fabric[fabric_code];
    var size = fabric[fabric_code][1];
    return size;
  }
}

function import_all(files){
  var pieces = [];
  var doc = app.activeDocument;
  for (var i = 0; i < files.length; i++) {
    var piece = import_piece(doc, files[i]);
    piece.show(false);
    pieces.push(piece);
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
  // If a valid folder is selected
  var fabric_size = get_fabric_size(sourceFolder);
  if (!fabric_size)
    return "Fabric Error!";


  var ab = app.activeDocument.artboards[0];
  $.writeln("fabric: "+fabric_size);
  resize_artboard(ab, fabric_size-2, 120);

  for (var size in size_order) {
    // Get all files matching the pattern
    var re = new RegExp("^(_|)"+size_order[size]+".*\\.(ai|eps|pdf)$", "i");
    var files = sourceFolder.getFiles(function(f){return f.displayName.match(re);});///\.(ai|eps|pdf)$/i);

    var pieces = import_all(files);
    pieces.sort(function(a, b)
        {
          var ar = a.get_rect();
          var br = b.get_rect();
          return -(((ar.w*ar.h)-(br.w*br.h))||(ar.h-br.h));
        });

    while(pieces.length > 0){
      var pb = new PrintBoard(ab);
      pb.import_pieces(pieces);

      pb.export_pdf(sourceFolder+"\\"+pieces.length+"_"+size_order[size]+'_files_left.pdf');
      pb.remove_all();
    }
  }
}

main();


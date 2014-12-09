// JavaScript Document
//Set up vairaibles


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

function new_artboard_next(artboard){
  var rect = artboard.artboardRect;
  rect[0] += rect[2]+100;
  return artboard.parent.add(rect);
}

function import_piece(doc, filename){
  var pi = doc.placedItems.add();
  pi.file = File(filename);
  return new RectPiece(pi);
};

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

function main(){
  // Select the source folder.
  var sourceFolder = Folder.selectDialog('Select the folder with Illustrator files that you want to mere into one', '~');

  // If a valid folder is selected
  if (sourceFolder != null) {
    // Get all files matching the pattern
    var files = sourceFolder.getFiles(/\.(ai|eps|pdf)$/i);

    var pieces = import_all(files);
    while(pieces.length > 0){
      var pb = new PrintBoard(app.activeDocument.artboards[0]);
      pb.import_pieces(pieces);

      pb.export_pdf(sourceFolder+"_"+pieces.length+'_files_left.pdf');
      pb.remove_all();
    }

    /*if (files.length > 0) {
      // Get the destination to save the files
      var pb = new PrintBoard(app.activeDocument.artboards[0]);
      var doc = app.activeDocument;
      for (i = 0; i < files.length; i++) {
        var piece = import_piece(doc, files[i]);
        pb.insert(piece);
        //break;
      }
    }
    else {
      alert('No matching files found');
    }*/
  }
}

main();


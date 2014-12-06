// JavaScript Document
//Set up vairaibles

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

  this.get_ltrb = function(){
    return [this.l, this.t, this.r, this.b];
  };

  this.get_ltwh = function(){
    return [this.l, this.t, this.w, this.h];
  };

  this.is_overlap = function(rh){
    var lh = this;
    if (
        ((lh.l-rh.l)*(lh.l-rh.r)>=0)
        &&((lh.r-rh.l)*(lh.r-rh.r)>=0)
        &&((lh.l-rh.l)*(lh.r-rh.r)!=0))
        return false;
    if (
        ((lh.t-rh.t)*(lh.t-rh.b)>=0)
        &&((lh.b-rh.t)*(lh.b-rh.b)>=0)
        &&((lh.t-rh.t)*(lh.b-rh.b))!=0)
        return false;
     return true;
  }
}

function RectPiece(pageitem){
  var pi = pageitem;

  this.get_rect = function(){
    return new Rect([pi.controlBounds[0], pi.controlBounds[1], pi.width, pi.height]);
  }

  this.move_to = function(point){
    pi.translate(point[0]-pi.controlBounds[0], point[1]-pi.controlBounds[1])
  };
}

var PrintBoard = function(artboard){
  $.writeln(artboard.artboardRect);
  this.width = artboard.artboardRect[2];
  this.insert_points = [];
  this.insert_points.push([1, 1]);
  this.pieces = [];

  this.insert = function(pageitem)
  {
    var piece = new RectPiece(pageitem);
    var rect = piece.get_rect();
    for(var i=0; i<this.insert_points.length; i++)
    {
      var tr = rect.get_copy_at(this.insert_points[i]);
      if (this.test(tr))
      {
        this.insert_points.splice (i, 1);
        this.place_piece(tr, piece);
        break;
      }
    }
  };

  this.test = function(tr)
  {
    //var tr = rect.get_copy_at(point);
    if (tr.r>this.width)
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
    this.pieces.push(piece);
    this.insert_points.push([rect.r, rect.t]);
    this.insert_points.push([rect.l, rect.b]);//piece.y-piece.height]);
    this.insert_points.sort(function(a, b)
      {
        return -(a[1]-b[1])|| (a[0] - b[0]);
      });
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
  return pi;
};

// Select the source folder.
sourceFolder = Folder.selectDialog('Select the folder with Illustrator files that you want to mere into one', '~');

// If a valid folder is selected
if (sourceFolder != null) {
  //files = new Array();
  // Get all files matching the pattern
  files = sourceFolder.getFiles(/\.(ai|eps|pdf)$/i);

  if (files.length > 0) {
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
  }
}

/*
var newRect = function(x, y, width, height) {
    var l = 0;
    var t = 1;
    var r = 2;
    var b = 3;
 
    var rect = [];
 
    rect[l] = x;
    rect[t] = -y;
    rect[r] = width + x;
    rect[b] = -(height - rect[t]);
 
    return rect;
};

var ab = app.activeDocument.artboards[0];
var r = ab.artboardRect;
var r1= newRect(r[0] +r[2]+100, r[1], r[2], -r[3]);
//
var nab = app.activeDocument.artboards.add(r1);*/


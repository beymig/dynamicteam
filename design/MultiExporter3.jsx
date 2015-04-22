
// MultiExporter.js
// Version 0.1
// Version 0.2 Adds PNG and EPS exports
// Version 0.3 Adds support for exporting at different resolutions
//
// Exports Illustrator artboards and/or layers as individual PNG or PDF files
// 
// Copyright 2011 Matthew Ericson
// Comments or suggestions to mericson@ericson.net

#include "util.jsx"

var docRef = app.activeDocument;

var nyt_png_exporter = {
  
  export_info_lyr:   null,
  
  qty:		  null,
  nph: null, // number place holder
  nreq: null, // number required

  prefix:         null,
  suffix:         null,
  base_path:      null,
  transparency:   true,
  
  format:         "PDF",
  
  dlg:            null,
  prefs_xml:      null,
  
  num_to_export:  0,
  
  num_layers:     0,
  num_layers_to_export: 0, 
  
  num_artboards:  0,
  num_artboards_to_export: 0,

  exportInfo: {
    fabricInfo:[],
    sizeInfo:{},
    blankInfo:{},
  },

  init: function() {
    // figure out if there is stuff to process
    this.num_layers = docRef.layers.length;
    this.num_artboards = docRef.artboards.length;
    
    this.num_layers_to_export = this.get_num_layers_to_export();
    this.num_artboards_to_export = this.get_num_artboards_to_export();
    
    var parse_success = this.load_prefs();    
    
    if (parse_success) {
        this.show_dialog();
    }
  },
    
  load_prefs: function() {
    var parse_success = false;
    
    // find existing layers or add new one
    try
    {
      this.export_info_lyr = docRef.layers.getByName( 'nyt_exporter_info' );
    } catch ( e ) {
      this.export_info_lyr = docRef.layers.add();
      this.export_info_lyr.name = 'nyt_exporter_info';
      
      var nyt_exporter_info_xml = this.export_info_lyr.textFrames.add();

      var saved_data = new XML( '<nyt_prefs></nyt_prefs>' );
      saved_data.appendChild( new XML('<nyt_size></nyt_size>') );
      saved_data.appendChild( new XML('<nyt_log_num></nyt_log_num>') );
      saved_data.appendChild( new XML('<nyt_num_placeholder></nyt_num_placeholder>') );
      saved_data.appendChild( new XML('<nyt_num_required></nyt_num_required>') );
      
      nyt_exporter_info_xml.contents = saved_data.toXMLString();    
      
      this.export_info_lyr.printable = false;
      this.export_info_lyr.visible = false;
    }
    
    // get xml out of the 1 text item on that layer and parse it
    if ( this.export_info_lyr.textFrames.length != 1 ) {
      Window.alert( 'Please delete the nyt_exporter_info layer and try again.' );
    } else {
      try {
        this.prefs_xml          = new XML( this.export_info_lyr.textFrames[0].contents );
        this.qty			= 1;
        this.nph = this.prefs_xml.nyt_num_placeholder;
        this.nreq = this.prefs_xml.nyt_num_reqired;
        this.prefix             = this.prefs_xml.nyt_size;
        this.suffix             = docRef.name.split('_')[0];
        this.base_path          = app.activeDocument.fullName.path; //this.prefs_xml.nyt_base_path;

        parse_success = true;
      } catch ( e ) {
        Window.alert( 'Please delete the this.export_info_lyr layer and try again.' );
      }
    }
    return parse_success;
  },

  generate_info_file: function(){
    var infoFile = new File(this.base_path+"/exportinfo.json");
    infoFile.open("w");
    infoFile.write(JSON.stringify(this.exportInfo, null, 2));
    infoFile.close();
  },

  load_generate_info: function(){
    var infoFile = new File(this.base_path+"/exportinfo.json");
    if ( infoFile.exists ) {
      infoFile.open("r");
      this.exportInfo = JSON.parse(infoFile.read());
    }
  },

  // dialog display
  show_dialog: function() {
    // Export dialog
    this.dlg = new Window('dialog', 'Export Artboards'); 
    
    // PANEL to hold options
    var msgPnl = this.dlg.add('panel', undefined, 'Export Artboards and/or Layers'); 

    // EXPORT TYPE ROW
    
    var typeGrp = msgPnl.add('group', undefined, '')
    typeGrp.oreintation = 'row';
    typeGrp.alignment = [ScriptUI.Alignment.LEFT, ScriptUI.Alignment.TOP]
    
    //typeGrp.add('statictext', undefined, '').size = [ 80,20 ];
    var qtySt = typeGrp.add('statictext', undefined, 'Quantity:'); 
    qtySt.size = [ 50,20 ];  
    var qtyEt = typeGrp.add('edittext', undefined, this.qty); 
    qtyEt.size = [ 30,20 ];


    var typeGrp = msgPnl.add('group', undefined, '')
    typeGrp.oreintation = 'row';
    typeGrp.alignment = [ScriptUI.Alignment.LEFT, ScriptUI.Alignment.TOP]

    var nphSt = typeGrp.add('statictext', undefined, 'Number PlaceHolder:'); 
    qtySt.size = [ 50,20 ];     
    var nphEt = typeGrp.add('edittext', undefined, this.nph); 
    nphEt.size = [ 50,20 ];
    var nreqSt = typeGrp.add('statictext', undefined, 'Number Required:'); 
    qtySt.size = [ 50,20 ];     
    var nreqEt = typeGrp.add('edittext', undefined, this.nreq); 
    nreqEt.size = [ 300,20 ];

    /*var suffixGrp = msgPnl.add('group', undefined, '')
    suffixGrp.oreintation = 'row';
    suffixGrp.alignment = [ScriptUI.Alignment.LEFT, ScriptUI.Alignment.TOP]

    var suffixSt = suffixGrp.add('statictext', undefined, 'LOG#:'); 
    suffixSt.size = [100,20]

    var suffixEt = suffixGrp.add('edittext', undefined, this.suffix); 
    suffixEt.size = [ 300,20 ];*/

    // DIR GROUP
    var dirGrp = msgPnl.add( 'group', undefined, '') 
    dirGrp.orientation = 'row'
    dirGrp.alignment = [ScriptUI.Alignment.LEFT, ScriptUI.Alignment.TOP]
    
    var dirSt = dirGrp.add('statictext', undefined, 'Output directory:'); 
    dirSt.size = [ 100,20 ];

    var dirEt = dirGrp.add('edittext', undefined, this.base_path); 
    dirEt.size = [ 300,20 ];

    var chooseBtn = dirGrp.add('button', undefined, 'Choose ...' );
    chooseBtn.onClick = function() { dirEt.text = Folder.selectDialog(); }

    // TRANSPARENCY AND FORMAT ROW
    var transPnl = msgPnl.add('group', undefined, ''); 
    transPnl.orientation = 'row'
    transPnl.alignment = [ScriptUI.Alignment.LEFT, ScriptUI.Alignment.TOP]
    
    var progBar = msgPnl.add( 'progressbar', undefined, 0, 100 );
    progBar.size = [400,10]

    var progLabel = msgPnl.add('statictext', undefined, '...' ); 
    progLabel.size = [ 400,20 ];

    var btnPnl = this.dlg.add('group', undefined, ''); 
    btnPnl.orientation = 'row'

    btnPnl.cancelBtn = btnPnl.add('button', undefined, 'Cancel', {name:'cancel'});
    btnPnl.cancelBtn.onClick = function() { nyt_png_exporter.dlg.close() };

    // OK button
    btnPnl.okBtn = btnPnl.add('button', undefined, 'Export', {name:'ok'});
    btnPnl.okBtn.onClick = function() { 
      nyt_png_exporter.prefix       = app.activeDocument.activeDataSet.name.split("_")[0];
      //nyt_png_exporter.suffix       = suffixEt.text; 
      nyt_png_exporter.base_path    = dirEt.text;   
        
      var qty = isNaN(parseInt(qtyEt.text))?1:parseInt(qtyEt.text );
      this.nph = nphEt.text;
      this.nreq = nreqEt.text;

      nyt_png_exporter.load_generate_info();

      if(this.nph)
      {
        var ph = this.nph;
        var nums = this.nreq.split(',');
        var re = new RegExp('^'+ph+'$', 'g');
        for( var i = 0; i < nums.length; i++)
        {
          nyt_png_exporter.replace_number(re, nums[i]);
          nyt_png_exporter.run_export(qty, nums[i]);
          ph = nums[i];
          re = new RegExp('^'+ph+'$', 'g');
        }
        nyt_png_exporter.replace_number(re, this.nph);
      }
      else
      {
        nyt_png_exporter.run_export(qty, '');
      }
      nyt_png_exporter.generate_info_file();
    };
    
    nyt_png_exporter.update_export_desc( progLabel );
    
    this.dlg.progLabel = progLabel;
    this.dlg.progBar = progBar;
    
    this.dlg.show();
  },

    
  update_export_desc: function ( progLabel ) {
    progLabel.text = 'Will export ' + this.num_artboards_to_export + ' of ' + this.num_artboards + ' artboards';
    this.num_to_export = this.num_artboards_to_export;
  },

  
  // run_export function. does the dirty work
  run_export: function(qty, num) {
    var num_exported = 0;
    var options;

    //} else if ( this.format == 'PDF' ) {
    options = new PDFSaveOptions();
    options.compatibility = PDFCompatibility.ACROBAT5;
    options.generateThumbnails = true;
    options.preserveEditability = false;
          
    var starting_artboard = 0;
    var num_artboards =  docRef.artboards.length;
    
    var sizeInfo = this.exportInfo.sizeInfo;
    if (this.prefix in sizeInfo)
      sizeInfo[this.prefix] += qty;
    else
      sizeInfo[this.prefix] = qty;

    for (var i = starting_artboard; i < num_artboards; i++ ) {
      var artboardName = docRef.artboards[i].name;
      starting_artboard = docRef.artboards.setActiveArtboardIndex(i);

      // Process this artbarod if we're exporting only a single one (layers mode) or if it doesn't have generic name or minus
      if (!( artboardName.match(  /^artboard/i ) || artboardName.match( /^\-/ ) )) {
        var fileid = this.prefix +"_" + artboardName + this.suffix;
        if (num)
          fileid+= "_"+num;

        var bIndex = artboardName.indexOf(" blank");
        if (bIndex != -1){
          var blankid = [this.prefix, artboardName.substr(0, bIndex)].join("_");
          var blankInfo = this.exportInfo.blankInfo;
          if (blankid in blankInfo){
            blankInfo[blankid] += qty;
          }
          else{
            blankInfo[blankid] = qty;
          }
          continue;
        }
      
        var fabric = artboardName.split("_")[0];
        if (fabric == "FLAT"){
          fabric = artboardName.split("_")[1];
        }

        var fabricInfo = this.exportInfo.fabricInfo;
        if (!~fabricInfo.indexOf(fabric))
          fabricInfo.push(fabric);

        // if exporting artboard by artboard, export layers as is
        //if ( this.export_code == 'artboards' ) {
        var base_filename = this.base_path + "/" + fileid;
        var qty_delim = num?' ':'_';

        //} else if ( this.format.match( /^PDF/ )) {
        var first_file_name = base_filename + '.pdf';
        if (qty > 1)
          first_file_name = base_filename + qty_delim+'1.pdf';
        var destFile = new File(first_file_name);
        var overwrite = true;
        options.artboardRange = (i+1).toString();
        if ( destFile.exists ) {
          overwrite = Window.confirm(first_file_name + " exists. Overwrite?");
        }
                
        if ( overwrite ){
          docRef.saveAs( destFile, options );
          for(var x=2; x<=qty; x++)
            destFile.copy(base_filename + qty_delim + x +'.pdf')
        }       
        // export layers as individual files
      }
    }   
    
    this.prefs_xml.nyt_base_path    = this.base_path;
    this.prefs_xml.nyt_size       = this.prefix;
    this.prefs_xml.nyt_log_num       = this.suffix;
    this.prefs_xml.nyt_num_placeholder       = this.nph;
    this.prefs_xml.nyt_num_required       = this.nreq;
      
    this.export_info_lyr.textFrames[0].contents = this.prefs_xml.toXMLString();
    this.dlg.close();

  //end run_export
  },
  
  get_num_layers_to_export: function() {

    var num_to_export = 0;
    var num_layers = docRef.layers.length;

    for(var i=0; i<num_layers; ++i) {
    
      var layer = docRef.layers[i];      
      var lyr_name = layer.name;
      
      // any layers that start with + are always turned on
      if ( lyr_name.match( /^\+/ ) ) {
    
      } else if ( lyr_name.match( /nyt_exporter_info/ ) || lyr_name.match( /^Layer /) || lyr_name.match( /^\-/ ) ){
    
      } else {
        num_to_export++;
      }
    }

    return num_to_export;
  },
  
  get_num_artboards_to_export: function() {
    var num_artboards = docRef.artboards.length;
    var num_to_export = 0;
    
    for (var i = 0; i < num_artboards; i++ ) {
      
      var artboardName = docRef.artboards[i].name;
      if ( ! ( artboardName.match(  /^artboard/i ) || artboardName.match( /^\-/ ) )){
          num_to_export++;
      }
    } 
    return num_to_export;
  },

  replace_number: function(search, replace_str) {
    var text_frames = docRef.textFrames;  
    //var search_string = '/^22$/g'; // g for global search, remove i to make a case sensitive search  
    //var replace_string = "55";  
    if (text_frames.length > 0)  
    {  
      for (var i = 0 ; i < text_frames.length; i++)  
      {  
        var this_text_frame = text_frames[i];  
        //$.writeln(this_text_frame.name+": "+this_text_frame.contents+"%%")
        var new_string = this_text_frame.contents.replace(search, replace_str);  
           
        if (new_string != this_text_frame.contents)  
        {  
          this_text_frame.contents = new_string;  
        }  
      }  
    }  
  }

};

nyt_png_exporter.init();




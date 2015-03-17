package main

import (
	"code.google.com/p/gofpdf"
	"database/sql"
	"encoding/json"
	"fmt"
	_ "github.com/go-sql-driver/mysql"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type Configuration struct {
	NewTaskFolder     string
	WaitToPrintFolder string
	DoneFolder        string
	HotFolder         string
	DBStr             string
	OriginalPDFFolder string
	RedoFolder        string
}

type RollInfo struct {
	Log     string
	Fabric  string
	Printer string
	//Width         int
	Height     int
	DaysToGo   time.Time
	Units      int
	NumOfTotal int
	Total      int
}

type ExportInfo struct {
	SizeInfo  map[string]string
	BlankInfo map[string]int
}

func loadJsonFromFile(file string, v interface{}) error {
	f, _ := os.Open(file)
	defer f.Close()
	decoder := json.NewDecoder(f)
	if err := decoder.Decode(v); err != nil {
		return err
	}
	return nil
}

func load_config(file string) Configuration {
	f, _ := os.Open(file)
	decoder := json.NewDecoder(f)
	var cfg Configuration
	err := decoder.Decode(&cfg)
	if err != nil {
		fmt.Println("error:", err)
	}
	return cfg
}

func load_printers(file string) map[string]string {
	var printers map[string]string
	f, _ := os.Open(file)
	decoder := json.NewDecoder(f)
	err := decoder.Decode(&printers)
	if err != nil {
		fmt.Println("error:", err)
	}
	return printers
}

func getBlankFabric(blankName string) string {
	attrs := strings.Split(blankName, "_")
	if attrs[1] == "FLAT" {
		return attrs[2]
	}
	return attrs[1]
}

func fileEndWith(fname string, s string) bool {
	f, err := os.Open(fname)
	if err != nil {
		return false
	}
	defer f.Close()

	var buflen int64 = int64(len(s) + 2)
	stat, err := os.Stat(fname)
	if err != nil || stat.Size() < buflen {
		return false
	}
	buf := make([]byte, buflen)
	_, err = f.ReadAt(buf, stat.Size()-buflen)

	return strings.Contains(string(buf), s)
}

func scanForNewTask(cfg Configuration, cerr chan error) {
	//cfg := load_config("cfg.json")
	src, dst := cfg.NewTaskFolder, cfg.WaitToPrintFolder
	con, err := sql.Open("mysql", cfg.DBStr)
	if err != nil {
		cerr <- err
		return
	}
	defer con.Close()

	fmt.Printf("scanner start.\n  src:\t%s.\n  dst:\t%s.\n", src, dst)
	for {
		task_folders, err := filepath.Glob(src + "\\combined_*in_*")
		if err != nil {
			cerr <- err
			continue
		}

		for _, fpath := range task_folders {
			//folderpath := filepath.Dir(fname)
			foldername := filepath.Base(fpath)
			folderid := strings.TrimPrefix(foldername, "combined_")
			fmt.Println("New task discovered: " + folderid)

			attrs := strings.Split(folderid, "_")
			log, fabric := attrs[0], attrs[1]
			units, _ := strconv.Atoi(attrs[2])
			length, _ := strconv.Atoi(strings.TrimSuffix(attrs[3], "in"))

			// insert data into database
			_, err = con.Exec("insert into task (log, fabric, units, daystogo, length, folderid) values(?, ?, ?, ?, ?, ?)", log, fabric, units, time.Now().AddDate(0, 0, 10), length, folderid)
			if err != nil {
				cerr <- err
				continue
			}

			dstpath := path.Join(dst, folderid) //foldername) //
			err = os.Rename(fpath, dstpath)
			if err != nil {
				fmt.Println(err)
				fmt.Printf("Move folder failed.\n  From:\t%s.\n  To:\t%s.\n", fpath, dstpath)
				cerr <- err
				continue
			}

			fmt.Println(folderid, "wait to print")
		}
		time.Sleep(2 * time.Second)
	}
}

func copyFile(dst, src string) (err error) {
	in, err := os.Open(src)
	if err != nil {
		return
	}
	defer in.Close()
	out, err := os.Create(dst)
	if err != nil {
		return
	}
	defer func() {
		cerr := out.Close()
		if err == nil {
			err = cerr
		}
	}()
	if _, err = io.Copy(out, in); err != nil {
		return
	}
	err = out.Sync()
	return
}

type Sheet struct {
	ID      int
	TaskID  int
	FileSrc string
	Printer string
}

func getAssignedSheets(con *sql.DB, printer string) (sheets []Sheet, err error) {
	rows, err := con.Query("SELECT id, task_id, src, printer from sheet WHERE status='assigned' and printer=? order by id", printer)
	if err != nil {
		fmt.Println("db query in getAssignedSheets: ", err)
		return
	}
	defer rows.Close()

	firstTask := -1
	sheets = []Sheet{}
	for rows.Next() {
		var sheetid, taskid int
		var src, printer string
		if err = rows.Scan(&sheetid, &taskid, &src, &printer); err != nil {
			fmt.Println("Sheet scan error in getAssignedSheets: ", err)
			return
		}

		if firstTask == -1 {
			firstTask = taskid
		}

		if taskid == firstTask {
			sheets = append(sheets, Sheet{sheetid, taskid, src, printer})
		} else {
			break
		}
	}
	return
}

func dispatchReprintSheets(con *sql.DB, printer string, cfg Configuration, printers map[string]string) error {
	doneRoot := cfg.DoneFolder
	hotfolder := cfg.HotFolder

	rows, err := con.Query("SELECT id, task_id, src, printer from sheet WHERE status='assigned' and printer=?", printer)
	if err != nil {
		fmt.Println("Dispatch error:", err)
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var sheetid, taskid int
		var src, printer string
		if err = rows.Scan(&sheetid, &taskid, &src, &printer); err != nil {
			fmt.Println("Sheet scan error", err)
			return err
		}

		if _, err := con.Exec("update sheet set status='dispatching' where id=?", sheetid); err != nil {
			fmt.Println("update sheet dispatching error", err)
			return err
		}

		taskrows, err := con.Query("SELECT folderid from task WHERE id=?", taskid)
		taskrows.Next()
		var folderid string
		if err = taskrows.Scan(&folderid); err != nil {
			fmt.Println("Sheet scan task error", err)
			return err
		}
		defer taskrows.Close()

		printerFolder := path.Join(hotfolder, printers[printer])
		srcFolder := path.Join(doneRoot, folderid)
		srcpath := path.Join(srcFolder, src)
		dstpath := path.Join(printerFolder, src)
		if err = copyFile(dstpath, srcpath); err != nil {
			fmt.Println("Sheet copy error", err)
			return err
		}
		if _, err := con.Exec("update sheet set status='dispatched' where id=?", sheetid); err != nil {
			fmt.Println("update sheet error", err)
			return err
		}
		fmt.Println(sheetid, taskid, src, printer)
	}
	return nil
}

func dispatchPrintJob(printer string, cfg Configuration, printers map[string]string, cerr chan error) {
	newTaskRoot := cfg.WaitToPrintFolder
	doneRoot := cfg.DoneFolder
	hotfolder := cfg.HotFolder
	//printers := load_printers("printers.json")
	printerFolder := path.Join(hotfolder, printers[printer])
	sheetJob := strings.HasPrefix(printer, "NZ")
	searchFolders := strings.Split(cfg.OriginalPDFFolder, ",")

	con, err := sql.Open("mysql", cfg.DBStr+"?parseTime=true")
	if err != nil {
		cerr <- err
		return
	}
	defer con.Close()

	for {
		time.Sleep(1 * time.Second)

		if files, err := filepath.Glob(path.Join(printerFolder, "*.pdf")); err != nil || len(files) > 0 {
			continue
		}
		// query from db
		rows, err := con.Query("SELECT id, log, fabric, daystogo, units, length, folderid, printer from task WHERE status='assigned' and printer=?", printer)
		if err != nil {
			fmt.Println("Dispatch error:", err)
			continue
		}

	NextRow:
		for rows.Next() {
			var id, units, length int
			var folderid, printer, log, fabric string
			var daystogo time.Time
			if err = rows.Scan(&id, &log, &fabric, &daystogo, &units, &length, &folderid, &printer); err != nil || printers[printer] == "" {
				fmt.Println("Dispatch get value err:", err, printer, "not exist")
				continue
			}

			if c, err := con.Exec("update task set status='dispatching' where id=?", id); err != nil {
				fmt.Println(c, err)
				continue
			}

			fmt.Println("dispatching", id, folderid, printer)
			// copy files to hotfolder
			//printerFolder := path.Join(hotfolder, printers[printer])
			taskFolder := path.Join(newTaskRoot, folderid)
			doneFolder := path.Join(doneRoot, folderid)
			pdfFiles, err := ioutil.ReadDir(taskFolder)

			var exportInfo ExportInfo
			exportFolder := getPathByLog(searchFolders, log)
			exportInfoFile := path.Join(exportFolder, "exportinfo.json")
			fmt.Println("exportInfoFile", exportInfoFile)
			if _, err := os.Stat(exportInfoFile); err == nil {
				loadJsonFromFile(exportInfoFile, &exportInfo)

				for blank, count := range exportInfo.BlankInfo {
					blankFabric := getBlankFabric(blank)
					//if blankFabric == fabric {
					// insert blank info to db
					_, err = con.Exec("insert into blank (log, fabric, name, count, status) values(?, ?, ?, ?,?)", log, blankFabric, blank, count, "new")
					if err != nil {
						fmt.Println(err)
						//		}
					}
				}
				err = os.Rename(exportInfoFile, exportInfoFile+".done")
				if err != nil {
					fmt.Println(err)
					fmt.Printf("Move folder failed:\t%s", exportInfoFile)
				}
			}

			if !sheetJob {
				// insert cut-sheet
				cutSheet := path.Join(taskFolder, fmt.Sprintf("CUT PAPER HERE_%s_%s_task%d_report.pdf", log, fabric, id))
				firstSheet := path.Join(taskFolder, fmt.Sprintf("NEW ROLL START HERE_%s_%s_task%d_report.pdf", log, fabric, id))
				rollInfo := RollInfo{
					Log:      log,
					Fabric:   fmt.Sprintf("%s(%s)", fabric, strings.Split(folderid, "_")[4]),
					Printer:  printer,
					Height:   length,
					DaysToGo: daystogo,
					Units:    units,
				}
				if err = generateRollReport(rollInfo, cutSheet, "CUT PAPER HERE!"); err != nil {
					fmt.Println(err)
					continue NextRow
				}
				cutSheetFile, err := os.Stat(cutSheet)
				if err != nil {
					fmt.Println(err)
					continue NextRow
				}

				pdfFiles = append(pdfFiles, cutSheetFile)

				if err = generateRollReport(rollInfo, firstSheet, "START NEW ROLL!!"); err != nil {
					fmt.Println(err)
					continue NextRow
				}
				firstSheetFile, err := os.Stat(firstSheet)
				if err != nil {
					fmt.Println(err)
					continue NextRow
				}

				pdfFiles = append([]os.FileInfo{firstSheetFile}, pdfFiles...)
			}

			for index, pdfFile := range pdfFiles {
				fname := pdfFile.Name()

				if !strings.HasSuffix(fname, ".pdf") {
					continue
				}

				fmt.Println(fname)
				srcpath := path.Join(taskFolder, fname)
				dstpath := path.Join(printerFolder, fname)
				if err = copyFile(dstpath, srcpath); err != nil {
					fmt.Println("Dispatch job failed. ", err, "copy file failed")
					continue NextRow
				}
				_, err = con.Exec("insert into sheet (task_id, src, status, printer) values(?, ?, ?,?)", id, fname, "dispatched", printer)
				if err != nil {
					fmt.Println(err)
					cerr <- err
					continue NextRow
				}

				// wait for empty folder
				if index == 0 && !sheetJob {
					for {
						if files, err := filepath.Glob(path.Join(printerFolder, "*.pdf")); err != nil || len(files) > 0 {
							time.Sleep(1 * time.Second)
							continue
						} else {
							break
						}
					}
				}
			}

			err = os.Rename(taskFolder, doneFolder)
			if err != nil {
				fmt.Println(err)
				fmt.Printf("Move folder failed.\n  From:\t%s.\n  To:\t%s.\n", taskFolder, doneFolder)
				cerr <- err
				continue
			}

			if c, err := con.Exec("update task set status='dispatched' where id=?", id); err != nil {
				fmt.Println(c, err)
			}
		}
		// if has job
		rows.Close()

		if err = dispatchReprintSheets(con, printer, cfg, printers); err != nil {
			fmt.Println("dispatchReprintSheets error:", err)
		}
	}
}

func generateRollReport(rollInfo RollInfo, fpath string, prompt string) (err error) {
	var initType gofpdf.InitType
	var size gofpdf.SizeType
	size.Wd = 30
	size.Ht = 5
	initType.OrientationStr = "P"
	initType.UnitStr = "in"
	initType.Size = size

	pdf := gofpdf.NewCustom(&initType)
	pdf.AddPageFormat("P", size)

	pdf.SetFont("Arial", "B", 36)
	pdf.Cell(1, 0, fmt.Sprintf("Printer: %s", rollInfo.Printer))
	pdf.SetXY(0, 1)
	pdf.Cell(1, 0, "")
	pdf.Cell(4, 0, fmt.Sprintf("LOG: %s", rollInfo.Log))
	pdf.Cell(5, 0, fmt.Sprintf("FABRIC: %s", rollInfo.Fabric))
	pdf.Cell(3, 0, fmt.Sprintf("Uints: %d", rollInfo.Units))
	pdf.Cell(6, 0, fmt.Sprintf("ROLL LENGTH: %d.IN", rollInfo.Height))
	pdf.Cell(6, 0, fmt.Sprintf("DaysToGo: %s", rollInfo.DaysToGo.Format("02/Jan/2006")))
	pdf.SetFont("Arial", "B", 126)
	pdf.SetXY(8, 3)
	pdf.Cell(30, 0, prompt) //"CUT PAPER HERE!")
	if err = pdf.OutputFileAndClose(fpath); err != nil {
		fmt.Println(err)
	}
	return
}

func getPathByLog(searchFolders []string, log string) string {
	for _, folder := range searchFolders {
		fpaths, err := filepath.Glob(filepath.Join(folder, log[0:3], log, log+"_*"))
		if err != nil {
			fmt.Println("search file ", err)
			continue
		}
		for _, fpath := range fpaths {
			finfo, _ := os.Stat(fpath)
			if finfo.IsDir() {
				return fpath
			}
		}
	}
	return ""
}

func getFileListByLog(searchFolders []string, log string) (fileList []string) {
	fmt.Println("log:", log)
	fmt.Println("log0-3:", log[:3])

	for _, folder := range searchFolders {
		files, err := filepath.Glob(filepath.Join(folder, log[0:3], log, log+"_*", "*.pdf"))
		if err != nil {
			fmt.Println("search file ", err)
			continue
		}

		if len(files) > 0 {
			for _, f := range files {
				fileList = append(fileList, f)
			}
			break
		}
	}
	return
}

func fileListService(cfg Configuration) {
	searchFolders := strings.Split(cfg.OriginalPDFFolder, ",")
	http.HandleFunc("/filelist", func(w http.ResponseWriter, r *http.Request) {
		r.ParseForm()
		log := r.Form.Get("log")
		pathList := getFileListByLog(searchFolders, log)
		fileList := []string{}
		for _, p := range pathList {
			fileList = append(fileList, filepath.Base(p))
		}

		js, _ := json.Marshal(fileList)
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")
		w.Write(js)
		//fmt.Fprintf(w, "%s", js)
	})

	http.HandleFunc("/newredo", func(w http.ResponseWriter, r *http.Request) {
		r.ParseForm()
		log := r.PostForm.Get("log")
		files := r.PostForm.Get("files")
		fmt.Println("log:", log)
		//fmt.Printf("files:%#v", files)
		// TODO: Remove path information from redo file. This part of job should be done by jsx
		logPath := getPathByLog(searchFolders, log)
		fname := strings.Replace(filepath.Base(logPath), log, log+"redo", 1)
		redoFile, err := os.OpenFile(filepath.Join(cfg.RedoFolder, fname+time.Now().Format("_06Jan02-150405.redo")), os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0777)
		if err != nil {
			fmt.Println(err)
		}
		redoInfo := fname
		for _, fid := range strings.Split(files, ";") {
			redoInfo += ";" + filepath.Join(logPath, fid+".pdf")
		}
		//redoInfo = strings.Replace(redoInfo, ";", ";"+logPath, -1)
		//fmt.Fprint(redoFile)
		fmt.Fprint(redoFile, redoInfo)

		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")
		js, _ := json.Marshal(files)
		w.Write(js)
	})

	log.Fatal(http.ListenAndServe(":8080", nil))
}

func main() {
	cfg := load_config("cfg.json")
	go fileListService(cfg)
	cscan := make(chan error, 20)
	cdisp := make(chan error, 20)
	go scanForNewTask(cfg, cscan) //

	printers := load_printers("printers.json")
	for printer, _ := range printers {
		go dispatchPrintJob(printer, cfg, printers, cdisp)
	}

	<-cscan
	<-cdisp
}

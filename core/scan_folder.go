package main

import (
	"code.google.com/p/gofpdf"
	"database/sql"
	"encoding/json"
	"fmt"
	_ "github.com/go-sql-driver/mysql"
	"io"
	"io/ioutil"
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

/*func copyOneByOne(con *sql.DB, srcFolder string, sheets []Sheet, dstFolder string) (err error) {
	for _, sheet := range sheets {
		if _, err = con.Exec("update sheet set status='dispatching' where id=?", sheet.ID); err != nil {
			fmt.Println("update sheet dispatching error", sheet.ID, sheet.FileSrc, err)
			return
		}

		srcpath := path.Join(srcFolder, sheet.FileSrc)
		dstpath := path.Join(dstFolder, sheet.FileSrc)
		if err = copyFile(dstpath, srcpath); err != nil {
			fmt.Println("Sheet copy error", sheet.FileSrc, err)
			return
		}

		for {
			time.Sleep(1 * time.Second)
			if _, err = os.Stat(dstpath); os.IsNotExist(err) {
				if _, err = con.Exec("update sheet set status='dispatched' where id=?", sheet.ID); err != nil {
					fmt.Println("update sheet dispatched error", sheet.FileSrc, err)
					return
				}
				break
			}
		}
	}
	return
}*/

/*
func dispatchSheets(printer string, cfg Configuration, printers map[string]string) (err error) {
	con, err := sql.Open("mysql", cfg.DBStr+"?parseTime=true")
	if err != nil {
		return
	}
	defer con.Close()

	for {
		// query sheets
		sheets, err := getAssignedSheets(con, printer)
		if err != nil {
		}

		var srcFolder string

		if len(sheets) > 0 {
			taskid := sheets[0].TaskID
			taskrows, err := con.Query("SELECT folderid, status from task WHERE id=?", sheets[0].TaskID)
			if err != nil {
			}

			taskrows.Next()
			var folderid, status string
			if err = taskrows.Scan(&folderid, &status); err != nil {
				fmt.Println("Sheet scan task error", err)
				taskrows.Close()
				return err
			}
			taskrows.Close()

			srcFolder = path.Join(cfg.DoneFolder, folderid)
			switch status {
			case "dispatched":
			case "assigned":
				if _, err := con.Exec("update task set status='dispatching' where id=?", taskid); err != nil {
					fmt.Println("update task error", err)
					return err
				}
			default:
				fmt.Println("May be error Here")
				continue
			}
		}

		// print in queue
		if err = copyOneByOne(con, srcFolder, sheets, path.Join(cfg.HotFolder, printers[printer])); err != nil {
			// record the error somewhere
		}
		time.Sleep(1 * time.Second)
	}
}*/

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
				if index == 0 {
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

func main() {
	cscan := make(chan error, 20)
	cdisp := make(chan error, 20)
	cfg := load_config("cfg.json")
	go scanForNewTask(cfg, cscan) //
	//go dispatchPrintJob(cfg, cdisp)

	//*
	printers := load_printers("printers.json")
	for printer, _ := range printers {
		go dispatchPrintJob(printer, cfg, printers, cdisp)
		//go dispatchSheets(printer, cfg, printers)
	} //*/

	<-cscan
	<-cdisp
	//generateRollReport(RollInfo{}, "d:\\roll_report.pdf")
	//fmt.Println("scanForNewTask() returned %v", err)
}

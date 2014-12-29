package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	_ "github.com/go-sql-driver/mysql"
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

func scanForNewTask(src string, dst string) error {
	con, err := sql.Open("mysql", "root:@/dynamicteam")
	if err != nil {
		return err
	}
	defer con.Close()

	fmt.Printf("scanner start.\n  src:\t%s.\n  dst:\t%s.\n", src, dst)
	for {
		taskInfos, err := filepath.Glob(src + "\\*\\task.info")
		if err != nil {
			return err
		}

		var doneFiles []string
		for _, fname := range taskInfos {
			// if tail f == done
			if fileEndWith(fname, "@end") {
				doneFiles = append(doneFiles, fname)
			}
		}

		// sleep for 2 secs then do task
		//fmt.Println("Sleepping...")
		time.Sleep(2 * time.Second)
		for _, fname := range doneFiles {
			folderpath := filepath.Dir(fname)
			foldername := filepath.Base(folderpath)
			dstpath := path.Join(dst, foldername)
			fmt.Println("New task discovered: " + foldername)
			err = os.Rename(folderpath, dstpath)
			if err != nil {
				fmt.Println(err)
				fmt.Printf("Move folder failed.\n  From:\t%s.\n  To:\t%s.\n", folderpath, dstpath)
				continue
			}

			attrs := strings.Split(foldername, "_")
			log, fabric := attrs[0], attrs[1]
			units, _ := strconv.Atoi(attrs[2])
			// get info from task.info
			// insert data into database
			_, err = con.Exec("insert into task (log, fabric, units) values(?, ?, ?)", log, fabric, units)
			if err != nil {
				return err
			}
			fmt.Println(fmt.Sprint("Task %s wait to print", foldername))
		}
	}
}

func main() {
	cfg := load_config("cfg.json")
	err := scanForNewTask(cfg.NewTaskFolder, cfg.WaitToPrintFolder)
	fmt.Println("scanForNewTask() returned %v", err)
}

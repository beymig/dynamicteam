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
		task_folders, err := filepath.Glob(src + "\\combined_*in")
		if err != nil {
			return err
		}

		/*var doneFiles []string
		for _, fname := range taskInfos {
			// if tail f == done
			if fileEndWith(fname, "@end") {
				doneFiles = append(doneFiles, fname)
			}
		}*/

		// sleep for 2 secs then do task
		//fmt.Println("Sleepping...")
		//time.Sleep(2 * time.Second)
		for _, fpath := range task_folders {
			//folderpath := filepath.Dir(fname)
			foldername := filepath.Base(fpath)
			fmt.Println("New task discovered: " + foldername)

			//var log, fabric string
			//var units, length int

			/*if c, err := fmt.Sscanf(foldername, "combined_%s_%s_%d_%din", &log, &fabric, &units, &length); err != nil || c < 4 {
				fmt.Println(err)
				fmt.Printf("\n", foldername, log, fabric, units, length)
				continue
			}*/
			attrs := strings.Split(foldername, "_")
			log, fabric := attrs[1], attrs[2]
			units, _ := strconv.Atoi(attrs[3])
			length, _ := strconv.Atoi(strings.TrimSuffix(attrs[4], "in"))
			// get info from task.info
			// insert data into database
			_, err = con.Exec("insert into task (log, fabric, units, length) values(?, ?, ?, ?)", log, fabric, units, length)
			if err != nil {
				return err
			}

			dstpath := path.Join(dst, foldername) //strings.Replace(foldername, "combined", "task", 1))
			err = os.Rename(fpath, dstpath)
			if err != nil {
				fmt.Println(err)
				fmt.Printf("Move folder failed.\n  From:\t%s.\n  To:\t%s.\n", fpath, dstpath)
				continue
			}

			fmt.Println(foldername, "wait to print")
		}
		time.Sleep(2 * time.Second)
	}
}

func main() {
	cfg := load_config("cfg.json")
	err := scanForNewTask(cfg.NewTaskFolder, cfg.WaitToPrintFolder)
	fmt.Println("scanForNewTask() returned %v", err)
}

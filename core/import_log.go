package main

import (
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	_ "github.com/go-sql-driver/mysql"
	"github.com/tealeg/xlsx"
	"os"
	"strconv"
	"strings"
	//"time"
)

func main() {
	var importFile string
	flag.StringVar(&importFile, "f", "", "import file")
	var dateOffset int
	flag.IntVar(&dateOffset, "d", 0, "Date offset")

	flag.Parse()
	fmt.Println(importFile, dateOffset)

	var data [][][]string

	data, err := xlsx.FileToSlice(importFile)
	if err != nil {
		fmt.Println(err)
		return
	}

	f, err := os.Open("cfg.json")
	if err != nil {
		fmt.Println(err)
		return
	}
	defer f.Close()

	var cfg map[string]string
	decoder := json.NewDecoder(f)
	if err := decoder.Decode(&cfg); err != nil {
		fmt.Println(err)
		return
	}

	dbstring := cfg["DBStr"]
	con, err := sql.Open("mysql", dbstring)
	if err != nil {
		fmt.Println(con, err)
		return
	}
	defer con.Close()

	//fmt.Printf("%#v, %#v", err, data)
	for _, row := range data[0] {
		log := row[0]
		if _, err = strconv.ParseInt(log, 19, 32); err != nil {
			fmt.Println(err)
			continue
		}

		createTime, err := strconv.ParseFloat(row[1], 64)
		dayLeft, err := strconv.ParseFloat(row[11], 64)
		fmt.Println(createTime, row[11], dayLeft)

		//dayToGo := time.Date(1925, time.February, int(createTime+dayLeft)-dateOffset, 0, 0, 0, 0, time.Local)
		create_at := xlsx.TimeFromExcelTime(createTime, false)
		dayToGo := create_at.AddDate(0, 0, int(dayLeft)-dateOffset)

		fmt.Println(log, createTime, dayToGo)

		if _, err = con.Exec("insert into orders(log, create_at, daytogo) values(?, ?, ?)", log, create_at, dayToGo); err != nil {
			fmt.Println("Error:", err)
			if strings.HasPrefix(err.Error(), "Error 1062:") {
				continue
			} else {
				break
			}
		}
	}
}

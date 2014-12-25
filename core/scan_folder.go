package main

import (
  "encoding/json"
  "path/filepath"
  "os"
  "fmt"
)

type Configuration struct{
  monitor_folder string
}

func visit(path string, f os.FileInfo, err error) error {
  fmt.Printf("Visited: %s\n", path)
  return nil
} 


func main() {
  file, _ := os.Open("cfg.json")
  decoder := json.NewDecoder(file)
  cfg := Configuration{}
  err := decoder.Decode(&cfg)
  if err != nil{
    fmt.Println("error:", err)
  }
  root := cfg.monitor_folder
  fmt.Println("folder:", root)
  err = filepath.Walk(root, visit)
  fmt.Printf("filepath.Walk() returned %v\n", err)
}

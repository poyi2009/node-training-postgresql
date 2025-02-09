require("dotenv").config()
const http = require("http")
const AppDataSource = require("./db")
const { write } = require("fs")

function isDefined(value){
  return value !== undefined
}
function isValidString(value){
  return typeof value ==="string" && value.trim().length > 0 && value !== ""
}
function isValidNumber(value){
  return typeof value ==="number" && value > 0 && value % 1 === 0
}

const requestListener = async (req, res) => {
  const headers = {
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Length, X-Requested-With',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'PATCH, POST, GET,OPTIONS,DELETE',
    'Content-Type': 'application/json'
  }
  let body = "";
  req.on("data", (chunk) => {
    body += chunk
  })
//取得所有購買方案
  if (req.url === "/api/credit-package" && req.method === "GET") {
    try{
      const packages = await AppDataSource.getRepository("CreditPackage").find({
        select:["id", "name", "credit_amount", "price"]
      });
      res.writeHead(200, headers);
      res.write(JSON.stringify({
        "status":"success",
        "data":packages
      }));
      res.end();
    }catch(error){
      res.writeHead(500, headers);
      res.write(JSON.stringify({
        "status":"error",
        "data":"伺服器錯誤"
      }));
      res.end();
    }
  //新增購買方案
  } else if (req.url === "/api/credit-package" && req.method === "POST") {
    req.on("end", async() =>{
      try{
        const data = JSON.parse(body);
        //確認資料格式
        if(isDefined(data.name) && isValidString(data.name)
          && isDefined(data.credit_amount) && isValidNumber(data.credit_amount)
          && isDefined(data.price)&& isValidNumber(data.price)){
            //確認資料表裡是否有重複name
            const existPackage = await AppDataSource.getRepository("CreditPackage").find({
              where:{
                name: data.name
              }
            })
            if(existPackage.length === 0){ //資料表沒有重複資料
              const newPackage = await AppDataSource.getRepository("CreditPackage").create({
                name:data.name,
                credit_amount:data.credit_amount,
                price:data.price
              });
              const result = await AppDataSource.getRepository("CreditPackage").save(newPackage);
              res.writeHead(200, headers);
              res.write(JSON.stringify({
                "status":"success",
                "data":result
              }));
              res.end();
            }else{
              res.writeHead(409, headers);
              res.write(JSON.stringify({
                "status":"failed",
                "message":"資料重複"
              }));
              res.end();
            }
          }else{
            res.writeHead(400, headers);
            res.write(JSON.stringify({
              "status":"failed",
              "message":"欄位未填寫正確"
            }));
            res.end();
          }
      }catch(error){
        res.writeHead(500, headers);
        res.write(JSON.stringify({
          "status":"error",
          "message":"伺服器錯誤"
        }));
        res.end();
      }
    })
  //刪除購買方案
  } else if (req.url.startsWith("/api/credit-package/") && req.method === "DELETE") {
    try{
      const packageId = req.url.split("/").pop();
      if(isDefined(packageId) && isValidString(packageId)){
        const existId = await AppDataSource.getRepository("CreditPackage").find({
          where:{
            id:packageId
          }
        })
        if(existId.length > 0){ //資料表有該id資料
          await AppDataSource.getRepository("CreditPackage").delete(packageId);
          res.writeHead(200, headers);
          res.write(JSON.stringify({
            "status":"success"
          }));
          res.end();
        }else{
          res.writeHead(400, headers);
          res.write(JSON.stringify({
            "status":"failed",
            "message":"找不到此購買方案"
          }));
          res.end();
        }
      }else{
        res.writeHead(400, headers);
        res.write(JSON.stringify({
          "status":"failed",
          "message":"ID錯誤"
        }));
        res.end();
      }
    }catch(error){
      res.writeHead(500, headers);
      res.write(JSON.stringify({
        "status":"error",
        "message":"伺服器錯誤"
      }));
      res.end();
    }
  //取得教練專長列表
  } else if (req.url == "/api/coaches/skill" && req.method == "GET"){
    try{
      const skills = await AppDataSource.getRepository("Skill").find({
        select:["id", "name"]
      });
      res.writeHead(200, headers);
      res.write(JSON.stringify({
        "status":"success",
        "data":skills
      }));
      res.end();
    }catch(error){
      res.writeHead(500, headers);
      res.write(JSON.stringify({
        "status":"error",
        "message":"伺服器錯誤"
      }));
      res.end();
    }
  //新增教練專長
  } else if(req.url == "/api/coaches/skill" && req.method == "POST"){
    req.on("end", async() =>{
      try{
        const data = JSON.parse(body);
        if(isDefined(data.name) && isValidString(data.name)){
          const existSkill = await AppDataSource.getRepository("Skill").find({
            where:{name:data.name}
          });
          if(existSkill.length === 0){ //資料庫無重複專長
            const newSkill = await AppDataSource.getRepository("Skill").create({
              name:data.name
            });
            const result = await AppDataSource.getRepository("Skill").save(newSkill);
            res.writeHead(200, headers);
            res.write(JSON.stringify({
              "status":"success",
              "data":result
            }));
            res.end();
          }else{
            res.writeHead(409, headers);
            res.write(JSON.stringify({
              "status":"failed",
              "message":"資料重複"
            }));
            res.end();
          }
        }else{
          res.writeHead(400, headers);
          res.write(JSON.stringify({
            "status":"failed",
            "message":"欄位未填寫正確"
          }));
          res.end();
        }
      }catch(error){
        res.writeHead(500, headers);
        res.write(JSON.stringify({
          "status":"error",
          "message":"伺服器錯誤"
        }));
        res.end();
      }
    })
  //刪除教練專長
  } else if (req.url.startsWith("/api/coaches/skill/") && req.method === "DELETE"){
    try{
      const skillId = req.url.split("/").pop();
      if(isDefined(skillId) && isValidString(skillId)){
        const existId = await AppDataSource.getRepository("Skill").find({
          where:{
            id:skillId
          }
        });
        if(existId.length > 0){
          await AppDataSource.getRepository("Skill").delete(skillId);
          res.writeHead(200, headers);
          res.write(JSON.stringify({
            "status":"success"
          }));
          res.end();
        }else{
          res.writeHead(400, headers);
          res.write(JSON.stringify({
            "status":"failed",
            "message":"ID錯誤"
          }));
          res.end();
        }
      }else{
        res.writeHead(400, headers);
        res.write(JSON.stringify({
          "status":"failed",
          "message":"ID錯誤"
        }));
        res.end();
      }
    }catch(error){
      res.writeHead(500, headers);
      res.write(JSON.stringify({
        "status":"error",
        "message":"伺服器錯誤"
      }));
      res.end();
    }
  } else if (req.method === "OPTIONS") {
    res.writeHead(200, headers);
    res.end();
  } else {
    res.writeHead(404, headers)
    res.write(JSON.stringify({
      status: "failed",
      message: "無此網站路由",
    }))
    res.end()
  }
}

const server = http.createServer(requestListener)

async function startServer() {
  await AppDataSource.initialize()
  console.log("資料庫連接成功")
  server.listen(process.env.PORT)
  console.log(`伺服器啟動成功, port: ${process.env.PORT}`)
  return server;
}

module.exports = startServer();

require("dotenv").config()
const http = require("http")
const AppDataSource = require("./db")
const { write } = require("fs")
const { errorHandle } = require('./errHandle')

function isUndefined(value){
  return value === undefined
}
function isNotValidSting(value){
  return typeof value !== "string" || value.trim().length === 0 || value === ""
}
function isNotValidInteger(value){
  return typeof value !=="number" || value < 0 || value % 1 > 0
}

const requestListener = async (req, res) => {
  const headers = {
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Content-Length, X-Requested-With",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "PATCH, POST, GET,OPTIONS,DELETE",
    "Content-Type": "application/json"
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
      errorHandle(res, 500, 'error', '伺服器錯誤')
    }
  //新增購買方案
  } else if (req.url === "/api/credit-package" && req.method === "POST") {
    req.on("end", async() =>{
      try{
        const data = JSON.parse(body);
        //確認資料格式
        if(isUndefined(data.name) || isNotValidSting(data.name)
        || isUndefined(data.credit_amount) || isNotValidInteger(data.credit_amount)
        || isUndefined(data.price) || isNotValidInteger(data.price)){
            errorHandle(res, 400, 'failed', '欄位未填寫正確');
            return
          }
        //確認否有重複name
        const packageRepo = AppDataSource.getRepository("CreditPackage");
        const existPackage = await packageRepo.find({
          where:{
            name: data.name
          }
        })
        //有重複name
        if(existPackage.length > 0){ 
          errorHandle(res, 409, 'failed', '資料重複')
          return
        }
        const newPackage = packageRepo.create({
          name:data.name,
          credit_amount:data.credit_amount,
          price:data.price
        });
        const result = await packageRepo.save(newPackage);
        res.writeHead(200, headers);
        res.write(JSON.stringify({
          "status":"success",
          "data":result
        }));
        res.end();
      }catch(error){
        errorHandle(res, 500, 'error', '伺服器錯誤')
      }
    })
  //刪除購買方案
  } else if (req.url.startsWith("/api/credit-package/") && req.method === "DELETE") {
    try{
      const packageId = req.url.split("/").pop();
      if(isUndefined(packageId) || isNotValidSting(packageId)){
        errorHandle(res, 400, 'failed', 'ID錯誤')
        return
        }
        //確認是否有此package
        const packageRepo = AppDataSource.getRepository("CreditPackage");
        const existId = await packageRepo.find({
          where:{
            id:packageId
          }
        });
        if(existId.length === 0){
          errorHandle(res, 400, 'failed', '找不到此購買方案')
          return
        }
        //刪除
        await packageRepo.delete(packageId);
        res.writeHead(200, headers);
        res.write(JSON.stringify({
          "status":"success"
        }));
        res.end();
    }catch(error){
      errorHandle(res, 500, 'error', '伺服器錯誤')
    }
  //取得教練專長列表
  } else if (req.url === "/api/coaches/skill" && req.method === "GET"){
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
      errorHandle(res, 500, 'error', '伺服器錯誤')
    }
  //新增教練專長
  } else if(req.url == "/api/coaches/skill" && req.method == "POST"){
    req.on("end", async() =>{
      try{
        const data = JSON.parse(body);
        if(isUndefined(data.name) || isNotValidSting(data.name)){
          errorHandle(res, 400, 'failed', '欄位未填寫正確')
          return
        }
        const skillRepo = AppDataSource.getRepository("Skill");
        const existSkill = await skillRepo.find({
          where:{
            name:data.name
          }
        });
        if(existSkill.length > 0){
          errorHandle(res, 409, 'failed', '資料重複')
          return
        }
        const newSkill = skillRepo.create({
          name:data.name
        });
        const result = await skillRepo.save(newSkill);
        res.writeHead(200, headers);
        res.write(JSON.stringify({
          "status":"success",
          "data":result
        }));
        res.end();
      }catch(error){
        errorHandle(res, 500, 'error', '伺服器錯誤')
      }
    })
  //刪除教練專長
  } else if (req.url.startsWith("/api/coaches/skill/") && req.method === "DELETE"){
    try{
      const skillId = req.url.split("/").pop();
      if(isUndefined(skillId) || isNotValidSting(skillId)){
        errorHandle(res, 400, 'failed', 'ID錯誤')
        return
      }
      const skillRepo = AppDataSource.getRepository("Skill");
      const existId = await skillRepo.find({
        where:{
          id:skillId
        }
      });
      if(existId.length === 0){
        errorHandle(res, 400, 'failed', 'ID錯誤')
        return
      }
      await skillRepo.delete(skillId);
      res.writeHead(200, headers);
      res.write(JSON.stringify({
        "status":"success"
      }));
      res.end();
    }catch(error){
      errorHandle(res, 500, 'error', '伺服器錯誤')
    }
  } else if (req.method === "OPTIONS") {
    res.writeHead(200, headers);
    res.end();
  } else {
    errorHandle(res, 404, 'failed', '無此網站路由')
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

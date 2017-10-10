

const exp=require('express')
const bodyParser=require('body-parser')
const multer=require('multer')
const cookie=require('cookie-parser')
const fs =require('fs')

const app=exp()

app.use(bodyParser.urlencoded({extended:true}))

//解析cookie对象
app.use(cookie())
//express请求处理管线
//每次请求的多个回调函数构成一个请求处理管线
//管线中每一个请求都可以得到该请求的数据

function isLogin(req,res,next){
	if(req.cookies.username){
		next()
	}else{
		//跳转页面，将页面重定向
		res.redirect('login.html')
	}
}
app.get('/answer.html',isLogin,(req,res,next)=>{
	next()
})

app.get('/ask.html',isLogin,(req,res,next)=>{
	next()
})




//注册
app.post('/user/register',(req,res)=>{
	var username=req.body.uesrname
	var file = `user/${username}.txt`
		function add(){
			fs.exists(file,(exists)=>{
				if(exists){
					res.status(200).json({
						code:'error',
						msg:'文件已经存在'
					})
				}else{
					req.body.ip=req.ip
					req.body.time =Date.now()
					fs.appendFile(file,JSON.stringify(req.body),(error)=>{
						if(!error){
							res.status(200).json({
								code:'success',
								msg:'注册成功'
							})
						}
					})
				}
			})
		}
	fs.exists('user',(exists)=>{
		if(exists){
			//写入
			add()
		}else{
			fs.mkdir('user',(error)=>{
				if(error){
					res.status(200).json({
						code:0,
						msg:'用户文件创建失败'
					})
				}else{
					//写入
					add()
				}
			})
		}
	})
})
//登录
app.post('/user/login',(req,res)=>{

	//根据用户名找文件
	var filename = `user/${req.body.username}.txt`;
	console.log(req.body.username);
	fs.exists(filename,(exists)=>{
		if(exists){
			fs.readFile(filename,(error,data)=>{
				if(!error){
					var user = JSON.parse(data);
					if(user.password == req.body.password){
						//将用户名存入cookie
						var expries = new Date();
						expries.setMonth(expries.getMonth()+1);
						res.cookie('username',req.body.username,{expries});
						res.status(200).json({
							code:1,
							msg:'登录成功'
						})
					}else{
						res.status(200).json({
							code:2,
							msg:'密码错误'
						})
					}
				}else{
					res.status(200).json({
						code:3,
						msg:'文件读取失败'
					})
				}
			})
		}else{
			res.status(200).json({
				code:4,
				msg:'用户不存在'
			})
		}
	})
})

//提问
app.post('/user/ask',(req,res)=>{
	
	//xss攻击阻止  从内容发起的
	var content =req.body.content
	content = content.replace(/</g,'&lt;')
	content = content.replace(/</g,'&gt;')
	
	
	if(req.cookies.username){
		//将获取到的问题存入到question文件夹中
		
		//封装一个写入的函数
		function writeFile(){
			//文件的名字
			var data =Date.now()
			var filename = `question/${data}.txt`
            req.body.username=req.cookies.username
            req.body.time=data
            req.body.ip=req.ip
            fs.writeFile(filename,JSON.stringify(req.body),(error)=>{
            	if(error){
            		res.status(200).json({
            			code:2,
            			msg:'提问失败'
            		})
            	}else{
            		res.status(200).json({
            			code:1,
            			msg:'提问成功'
            		})
            	}
            })
		}
		fs.exists('question',(exists)=>{
			if(exists){
				writeFile()
			}else{
				fs.mkdir('question',(error)=>{
					if(!error){
						writeFile()
					}
				})
			}
		})
	}else{
		res.status(200).json({
			code:0,
			msg:'登录异常,请重新登录'
		})
	}
})

app.get('/user/out',(req,res)=>{
	res.clearCookie('username')
	res.status(200).json({
		code:1,
		msg:'退出登录'
	})
})

//图片上传
var photo = multer.diskStorage({
	destination:'www/upload',
	filename:function(req,file,callback){
		var fileName = file.originalname.split('.');
		console.log(fileName)
		callback(null,req.cookies.username+'.'+fileName[fileName.length-1]);
	}
})
//创建multer对象
var upload = multer({storage:photo});

app.post('/user/upload',upload.single('file'),(req,res)=>{
	res.status(200).json({
		code:'success',
		message:'图片上传成功'
	})
})


app.get('/user/all',(req,res)=>{
       fs.readdir('question',(error,files)=>{
       	if(!error){
       		//反序
       		files = files.reverse()
       		//创建一个数组，将每个读取到文件内容转为一个对象存到这个数组中
       		var questions =[]
//          for(var i =0;i<files.length;i++){
//          	var file=files[i]
//          	var filename='question/'+file;
//          	//readFile是异步的读取文件  不会影响for循环，for循环完了，文件还没读完
                 //readFileSync没有回调函数
//           var data=fs.readFileSync(filename)
//           var obj =JSON.parse(data)
//           questions.push(obj)
//           
//          } 
            
              
            //第二种  使用递归的方式
             var i=0
			function readFile(){
				if(i<files.length){
					var file=files[i];
					var filename='question/'+file;
					fs.readFile(filename,(err,data)=>{
						if(!err){
							var obj =JSON.parse(data)
							questions.push(obj);
							i++;
							readFile();
						}
					})
				}else{
					  res.status(200).json(questions)
				}
			}
			
			readFile()
       	}
       })
})

//回复
app.post('/user/answer',(req,res)=>{
	//取出question
	var question =req.cookies.question
	
	//xss攻击阻止  从内容发起的
	var content =req.body.content
	content = content.replace(/</g,'&lt;')
	content = content.replace(/</g,'&gt;')
	
	
	//根据question找到要找到的是哪个问题
	var filename = 'question/'+question+'.txt'
	//读取内容
	fs.readFile(filename,(err,data)=>{
		if(!err){
			var obj =JSON.parse(data)
			if(!obj.answer){
				obj.answer=[]
			}
			//将内容写入
                req.body.ip=req.ip
                req.body.time=Date.now()
                req.body.username=req.cookies.username
			obj.answer.push(req.body)
		}
		//修改后要重新写入
		fs.writeFile(filename,JSON.stringify(obj),(error)=>{
			if(!error){
				res.status(200).json({
					code:1,
					msg:'回答成功'
				})
			}else{
				res.status(200).json({
					code:2,
					msg:'回答失败'
				})
			}
		})
	})
})
app.use(exp.static('www'))
app.listen(3000,()=>{
	console.log('服务器开启')
})

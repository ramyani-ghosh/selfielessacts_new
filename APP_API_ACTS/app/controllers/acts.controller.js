const schemas = require('../models/acts.model.js');
const isBase64 = require('is-base64');
const date = require('date-and-time');
const Act = schemas.Act;
const Category = schemas.Category;
var http = require('http');

function isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

// List all categories or insert category
exports.commonCat = (req, res) => {
    if(req.method=='GET'){
        categoryList = Category.find({})
        .then(data=>{
            var newjson = {};
            var count = 0;
            for(var item in data){
                newjson[data[item].categoryName] = data[item].count;
                count ++ ;
            }
            if(count){
                res.status(200).send(newjson);
            }
            else{
                res.status(204).send(newjson);
            }
        }).catch(err=>{
        });
    }
    else if(req.method == 'POST'){
        if(req.body.length != 1) {
            return res.status(400).send({
                message: "Act content can not be empty"
            });
        }
        const cat = new Category({
            categoryName : req.body[0],
            count : 0,
        });
        cat.save().then(data => {
            res.status(201).send({
                //Act Created Successfully!
            });
        }).catch(err => {
            res.status(400).send({
                // message: "ActId provided is not unique!"
            });
        });
    }
    else{
        res.status(405).send();
    }
};

exports.removeCat = (req,res) => {
	if(req.method =='DELETE'){
		if(!req.body) {
            return res.status(400).send({
                message: "Empty JSON"
            });
        }
		var categ = req.params.categoryName;
		Category.findOneAndDelete({categoryName:categ},function(err,callback){
            if(callback){
				Act.deleteMany({category:categ},function(err,callback){
					res.status(200).send({});
				});
			}
            else
                res.status(400).send({
                    message:"DB ERROR"
                });
        });
	}
	else{
		res.status(405).send({});
	}
};

// List acts for a given category
exports.listCat = (req,res) => {
    if(req.method == 'GET'){
        if(!req.params.categoryName){
            res.status(400).send({
                // message: "Category Name missing!"
            });
        }
        if(isEmpty(req.query)){
            Category.find({categoryName:req.params.categoryName}).then(data => {
                if(data.length){
                    if(data[0].count > 100){
                        res.status(413).send({});
                    }
                    else if(data[0].count == 0){
                        res.status(204).send({});
                    }
                    else{
                        Act.find({category:req.params.categoryName}).sort({_id:-1}).then(acts => {
                            res.status(200).send(acts);
                        }).catch(err => {
                            res.status(500).send({
                                message: err.message || "Some error occurred while retrieving notes."
                            });
                        });
                    }
                }
                else{
                    res.status(204).send({});
                }
            });
        }
        else{
            Category.find({categoryName:req.params.categoryName}).then(data =>{
                if(data.length){
                    if(req.query.start.length == 0 || req.query.end.length == 0){
                        res.status(400).send({
                            // message:"Missing Query Values!"
                        });
                    }
                    else if(req.query.start < 1 && req.query.end > data[0].count){
                        res.status(400).send({
                            // message:"Invalid Params";
                        })
                    }
                    else if((req.query.end - req.query.start + 1) > 100){
                        res.status(413).send({});
                    }
                    else{
                       Act.find({category:req.params.categoryName}).sort({_id:-1}).skip(parseInt(req.query.start)).limit(parseInt(req.query.end)).then(actsInRange => {
                        if(actsInRange.length == 0){
                            res.status(204).send({
                                // message: "No content!";
                            })
                        }
                        res.status(200).send(actsInRange);
                       });
                    }
                }
            });
        }
    }
    else{
        res.status(405).send();
    }
};

// List Number of acts for a given category
exports.listCatCount = (req,res) => {
    if(req.method == 'GET'){
        Category.find({categoryName:req.params.categoryName}).then(data => {
            console.log(data);
            if(data.length){
                res.status(200).send([data[0].count]);
            }
            else{
                res.status(204).send();
            }
        });
    }
    else{
        res.status(405).send();
    }
};

//Upvote an Act
exports.upvoteAct = (req,res) => {
    if(req.method == 'POST'){
        if(!req.body) {
            return res.status(400).send({
                message: "Category Name can not be empty"
            });
        }
        Act.find({actId:req.body[0]}).then(data => {
            if(data.length == 0)
                res.status(400).send({
                    message:"No actid match"
                });
        })
        Act.update({actId:req.body[0]},{$inc:{upVotes:1}}).then(response => res.status(200).send(response)).catch(err => {
            res.status(500).send({
                message: err.message || "Some error occurred while retrieving notes."
            });
        });
    }
    else{
        res.status(405).send();
    }
};

//Remove an Act
exports.removeAct = (req,res) => {
    if(req.method == 'DELETE'){
        if(!req.body) {
            return res.status(400).send({
                message: "Category Name can not be empty"
            });
        }
        var categoryName = "";
        Act.find({actId:req.params.actId}).then(data => {
            categoryName = data[0]['category'];
            Act.findOneAndDelete({actId:req.params.actId},function(err,callback){
            if(callback){
                Category.updateOne({categoryName:categoryName},{$inc:{count:-1}}).then(response => {});
                res.status(200).send({});
            }
            else{
                res.status(400).send({});
            }
            });
        });



    }
    else{
        res.status(405).send();
    }
};
// Upload a new act
// url needs to be done
exports.uploadAct = (req,res) => {
    //Error Handling - 400
    if(req.method == 'POST'){
        if(!req.body) {
            return res.status(400).send({
                message: "Act content can not be empty"
            });
        }
        // Create a new Act
        const act = new Act({
            actId: req.body.actId,
            category:req.body.category,
            caption:req.body.caption,
            timestamp:req.body.timestamp,
            imgB64:req.body.imgB64,
            username: req.body.username,
            upVotes:0
        });
        const success = {};
        // Save Act in the database
        console.log(act.category);

        // User.find({username:act.username}).then(data => {
        //     if(data.length == 0){
        //         res.status(400).send({
        //             message: "username doesn't exist"
        //         });
        //     }
        // });

        var options = {
          hostname: '34.195.158.203',
          port: 80,
          path: '/api/v1/authenticate/'+act.username,
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          }
        };

        var statusCode;

        var req = http.request(options, function(res) {
          console.log('Status: ' + res.statusCode);
          statusCode = res.statusCode;
          console.log('Headers: ' + JSON.stringify(res.headers));
          res.setEncoding('utf8');
          res.on('data', function (body) {
            console.log('Body: ' + body);
          });
        });

        if(statusCode==400){
            res.status(400).send({
                    message: "username doesn't exist"
                });
        }
        if(!isBase64(act.imgB64)){
            res.status(400).send({
                message: "invalid b64 string"
            });
        }

        if(!date.isValid(act.timestamp,'DD-MM-YYYY:ss-mm-hh')){
            res.status(400).send({
                message: "invalid timestamp"
            });
        }

        act.save().then(data => {
            Category.updateOne({categoryName:act.category},{$inc:{count:1}}).then(response => {
            if(response['n'] == 0){
                res.status(400).send({
                    message: "category doesn't exist"
                });
            }
            });
            res.status(201).send({
                //Act Created Successfully!
            });
        }).catch(err => {
            res.status(400).send({
                message: "ActId provided is not unique!"
            });
            res.status(405).send({
                // message: "Bad Request!"
            });
            res.status(500).send({
                message: err.message || "Some error occurred while creating the Act."
            });
        });
    }
    else{
        res.status(405).send();
    }
};


// Retrieve and return all notes from the database.
exports.findAll = (req, res) => {
    Act.find()
    .then(acts => {
        res.send(acts);
    }).catch(err => {
        res.status(500).send({
            message: err.message || "Some error occurred while retrieving notes."
        });
    });
};

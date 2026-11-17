const mongoose = require('mongoose')

async function connectToDB() {

    try{
        await mongoose.connect(process.env.MONGO_URI)

        console.log("Connect to DB")
    }
    catch(err){
        console.log("something went wrong", err)
    }
    
}

module.exports = connectToDB
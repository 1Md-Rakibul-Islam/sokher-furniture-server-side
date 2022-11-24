const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const { query } = require('express');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();

// middleware
app.use(cors());
app.use(express.json());

// require('crypto').randomBytes(64).toString('hex)'



async function run() {

    try{

    }

    finally{

    }
    
}
run().catch(console.log())


app.get('/', async(req, res) => {
    res.send('Server server is running');
})

app.listen(port, () => {
    console.log(`Server runnin on: ${port}`);
})
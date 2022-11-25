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

// Mongodb database setup
const dbUri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.gksews0.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(dbUri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


//verify JWT
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader){
        return res.status(401).send('Unauthorized access');
    }

    const token = authHeader.split(' ')[1];
        jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded){
            if(err){
                return res.status(403).send({message: 'forbidden access'})
            }
            req.decoded = decoded;
            next();
        })
}


async function run() {

    try{
        // db all collections
        const usersCollection = client.db('SokherFurniture').collection('users');

        app.get('/jwt', async(req, res) => {
            const email = req.query.email;
            const query = {email: email};
            const user = await usersCollection.findOne(query);

            if(user){
                const token = jwt.sign({email}, process.env.ACCESS_TOKEN, {expiresIn: '10h'})
                return res.send({accessToken: token})
            }
            res.status(403).send({accessToken: ''});
        })

        // all user data insert on databse
        app.post('/users', async(req, res) => {
            const user = req.body;
            console.log(user);
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })
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
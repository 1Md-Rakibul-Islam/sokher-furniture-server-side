const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const { query } = require('express');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;
const app = express();

// middleware
app.use(cors());
app.use(express.json());



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
        const productsCategoriesCollection = client.db('SokherFurniture').collection('productsCategories');
        const productsCollection = client.db('SokherFurniture').collection('products');
        const productsBookingsCollection = client.db('SokherFurniture').collection('bookings');
        const reportedProductCollection = client.db('SokherFurniture').collection('reportedProduct');
        const paymentsCollection = client.db('SokherFurniture').collection('payments');

        // payment method
        app.post('/create-payment-intent', async(req, res) => {
            const booking = req.body;
            const price = booking.reselPrice;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: "usd",
                amount: amount,
                "payment_method_types": [
                    "card"
                ],
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
              })
        })

        app.post('/payments', async(req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            
            const id = payment.bookingId;
            const filter = { _id: ObjectId(id)};
            const updatedDoc = {
                $set: {
                    paid: true,
                    transationId: payment.transationId
                }
            }
            const updateResult = await productsBookingsCollection.updateOne(filter, updatedDoc);

            const productId = payment.productId;
            const filterProduct = { _id: ObjectId(productId)};
            const updatedProductDoc = {
                $set: {
                    status: 'sold',
                }
            }
            const updateProductResult = await productsCollection.updateOne(filterProduct, updatedProductDoc);

            res.send(result);
        })

        // pyment end
                

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
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        //delete a user api

        app.delete('/users/:_id', async(req, res) => {
            const id = req.params._id;
            console.log(id);
            const filter = { _id: ObjectId(id) }
            const result = await usersCollection.deleteOne(filter);
            res.send(result);
        })

        // buyer role email send to client side
        app.get('/users/buyer/:email', async(req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({isBuyer: user?.role === 'buyer'});
        })
        // seller role email send to client side
        app.get('/users/seller/:email', async(req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({isSeller: user?.role === 'seller'});
        })

        // user role email send to client side
        app.get('/users/admin/:email', async(req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({isAdmin: user?.role === 'admin'});
        })

        // all categories data load from db and send to client side
        app.get('/productsCategories', async(req, res)=> {
            const query = {};
            const categories = await productsCategoriesCollection.find(query).toArray();
            res.send(categories);
        });

        // category base product load from db and send client site
        app.get('/categories/:categoriyName', async(req, res)=> {
            const category = req.params.categoriyName;
            const filter = { category, status: 'available' };
            const categories = await productsCollection.find(filter).toArray();
            res.send(categories);
        });

        //-------sellers role ------//

        // seller based buyers get api
        app.get('/seller/buyers', async(req, res) => {
            const email = req.query.email;
            const filter = { sellerEmail: email };
            const buyers = await productsBookingsCollection.find(filter).toArray();
            res.send(buyers);
        })

        // seller base product load from db and send client site
        app.get('/seller/products', async(req, res)=> {
            const jwt= req.headers.authorization;
            // console.log(jwt);
            const email = req.query.email;
            const filter = { sellerEmail : email };
            const sellerProducts = await productsCollection.find(filter).toArray();
            res.send(sellerProducts);
        });

        app.post('/products', async(req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result);
        })

        //get all product and send client side
        app.get('/products', async(req, res) => {
            const query = { };
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        })

        //verify seler
        app.put('/sellers/verify/:_id', async(req, res) => {
            const id = req.params._id;
            const filter = { _id: ObjectId(id)};
            const options = {upsert: true};
            const updatedDoc = {
                $set: {
                    verified: true
                }            
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })

        // all verified sellers
        app.get('/verified/sellers', async(req, res) => {
            const filter = { verified: true };
            const verifiedSellers = await usersCollection.find(filter).toArray();
            res.send(verifiedSellers)
        })
        // id based verified selers
        app.get('/verified/sellers/:_id', async(req, res) => {
            const filter = { verified: true };
            const verifiedSeller = await usersCollection.findOne(filter);
            res.send({isVerifiedSeller: verifiedSeller?.verified === true})
        })

        //advetising update
        app.put('/seller/advertising/product/:_id', async(req, res) => {
            const id = req.params._id;
            const filter = { _id: ObjectId(id) };
            const options = {upsert: true};
            const updatedDoc = {
                $set: {
                    advertising: true
                }
            }
            const result = await productsCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })

        // get adverisign all product advertising
        app.get('/advertising/products', async(req, res) => {
            const filter = { advertising: true };
            const advertisedProducts = await productsCollection.find(filter).toArray();
            res.send(advertisedProducts)
        })

        app.get('/advertising/products/:_id', async(req, res) => {
            const id = req.params._id;
            console.log(id);
            const filter = { _id: ObjectId(id) };
            const advertisedProduct = await productsCollection.find(filter).toArray();
            res.send(advertisedProduct)
        })

        //id based single product and send client side
        app.get('/products/:_id', async(req, res) => {
            const id = req.params._id;
            const filter = { _id: ObjectId(id)};
            const product = await productsCollection.findOne(filter);
            res.send(product);
        });

        // delete id based product
        app.delete('/products/:_id', async(req, res) => {
            const id = req.params._id;
            const filter = { _id: ObjectId(id)};
            const product = await productsCollection.deleteOne(filter);
            res.send(product);
        });


        //---------buyer role--------//

        // product booking post api
        app.post('/bookings', async(req, res) => {
            const booking = req.body;
            const bookingProduct = await productsBookingsCollection.insertOne(booking);
            res.send(bookingProduct);
        })

        // all bookings load
        app.get('/bookings', async(req, res) => {
            const query = { };
            const bookingProducts = await productsBookingsCollection.find(query).toArray();
            res.send(bookingProducts);
        })

        // isBooked true or false
        app.get('/bookings/:_id', async(req, res) => {
            const id = req.params._id;
            const filter = { productId: id};
            const bookedProduct = await productsBookingsCollection.findOne(filter);
            res.send({isBooking: id === bookedProduct?.productId});
        })

        // pay for booked product
        app.get('/dashboard/bookings/pay/:_id', async(req, res) => {
            const id = req.params._id;
            const filter = { _id: ObjectId(id) };
            const bookedProduct = await productsBookingsCollection.findOne(filter);
            res.send(bookedProduct);
        })
        
        // my orders get api
        app.get('/user/orders', async(req, res) => {
            const email = req.query.email;
            const filter = { buyerEmail: email};
            const orders = await productsBookingsCollection.find(filter).toArray();
            res.send(orders);
        })



        //report product post api
        app.post('/product/report', async(req, res) => {
            const reportedProduct = req.body;
            const reporting = await reportedProductCollection.insertOne(reportedProduct);
            res.send(reporting);
        })

        //report product get api
        app.get('/product/report', async(req, res) => {
            const query = { };
            const reportedProducts = await reportedProductCollection.find(query).toArray();
            res.send(reportedProducts);
        })

        //report product get api
        app.delete('/product/report/:reportId', async(req, res) => {
            const id = req.params.reportId;
            const filter = { _id: ObjectId(id)}
            const reportedProducts = await reportedProductCollection.deleteOne(filter);
            res.send(reportedProducts);
        })

        // ----------admin role --------//
        
        // all seller send to client side
        app.get('/sellers', async(req, res) => {
            const filter = { role: 'seller' };
            const sellers = await usersCollection.find(filter).toArray();
            res.send(sellers);
        });

        // all users send
        app.get('/users', async(req, res) => {
            const filter = { };
            const allUsers = await usersCollection.find(filter).toArray();
            res.send(allUsers);
        });




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
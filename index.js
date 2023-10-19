const express = require('express')
const app = express()
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;

    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    // bearer token
    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }

        req.decoded = decoded;
        next();
    })
}

// MongoDB connection 
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.v73g3gy.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const usersCollection = client.db('english_hunter').collection('users');
        const coursesCollection = client.db('english_hunter').collection('courses');
        const classRoomCollection = client.db('english_hunter').collection('class_room');
        const enrolledStudentsCollection = client.db('english_hunter').collection('enrolled_students');

        // jwt
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '2h' })
            res.send({ token })
        })

        // get single user
        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result)
        })

        // get single user
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await usersCollection.findOne(query);
            if (result === null) {
                return res.send({ status: 404 })
            }
            res.send(result)
        })

        // get all users
        app.post('/users', async (req, res) => {
            const user = req.body;
            const email = user.email;
            const query = { email: email };
            const isExist = await usersCollection.findOne(query);
            if (isExist) {
                return res.send({ message: 'user already exists' })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result)
        })

        // get all courses
        app.get('/courses', async (req, res) => {
            const result = await coursesCollection.find().toArray();
            res.send(result)
        })

        // get single course
        app.get('/courses/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await coursesCollection.findOne(query);
            res.send(result)
        })

        // post course
        app.post('/courses', async (req, res) => {
            const newData = req.body;
            const result = await coursesCollection.insertOne(newData);
            res.send(result)
        })

        // get all classroom
        app.get('/classRoom', verifyJWT, async (req, res) => {
            const result = await classRoomCollection.find().toArray();
            res.send(result)
        })

        // get my enroll classes
        app.get('/enrolledStudents/:email', async (req, res) => {
            const email = req.params.email;
            const query = { studentEmail: email };
            const enrollments = await enrolledStudentsCollection.find(query).toArray();
            if (enrollments.length === 0) {
                return res.send({ message: 'No enrollments found for the student.', status: 404 })
            }
            const batchCodes = enrollments.map(enrollment => enrollment.batchCode);
            const result = await classRoomCollection.find({ batchCode: { $in: batchCodes } }).toArray();
            res.send(result)
        })

        // get enrolled students
        app.get('/enrolledStudents', async (req, res) => {
            const result = await enrolledStudentsCollection.find().toArray();
            res.send(result)
        })

        // post enrolled student
        app.post('/enrolledStudents', async (req, res) => {
            const newData = req.body;
            const email = newData.studentEmail
            const query = { studentEmail: email };
            const isExist = await enrolledStudentsCollection.findOne(query);
            if (isExist) {
                return res.send({ message: 'already enroll', status: 403 })
            }
            const result = await enrolledStudentsCollection.insertOne(newData);
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('English Hunter is running')
})
run().catch(console.dir);

app.listen(port, () => {
    console.log(`English Hunter Server is running ${port}`);
});
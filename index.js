const cors = require('cors');
const express = require('express');
const { MongoClient, ServerApiVersion, FindCursor, ObjectId } = require('mongodb');
require('dotenv').config()
const jwt = require('jsonwebtoken');
const { query } = require('express');


const app = express()
const port = process.env.PORT || 5000

// middlewere
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('doctors portal server is running successfully')

})

// mongodb connection 




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jle6tre.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function varifyToken(req, res, next) {

    const authHeaders = req.headers.authorization
    if (!authHeaders) {
        return res.status(401).send('unauthorized access')
    }
    const token = authHeaders.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next()
    })
}

async function run() {
    try {
        const appoinCollection = client.db('doctorsPortal').collection('appointmentOptions')

        const bookingsCollection = client.db('doctorsPortal').collection('bookings')

        const usersCollection = client.db('doctorsPortal').collection('users')

        const doctorsCollection = client.db('doctorsPortal').collection('doctors')

        app.get('/appointmentOptions', async (req, res) => {
            const query = {}
            const date = req.query.date

            const options = await appoinCollection.find(query).toArray()
            // booking part 
            const bookingQuery = { appointmentDate: date }
            const alreadyBooked = await bookingsCollection.find(bookingQuery).toArray()

            options.forEach(option => {
                const optionBooked = alreadyBooked.filter(booked => booked.serviceName === option.name)
                const bookedSlots = optionBooked.map(book => book.bookingDate)
                const remainningSlots = option.slots.filter(slot => !bookedSlots.includes(slot))
                option.slots = remainningSlots
            })

            res.send(options)
        })



        app.post('/bookings', async (req, res) => {
            const booking = req.body

            const query = {
                appointmentDate: booking.appointmentDate,
                email: booking.email,
                serviceName: booking.serviceName
            }
            const alreadyBooked = await bookingsCollection.find(query).toArray()
            if (alreadyBooked.length) {
                const message = `you already have a Booking on ${booking.appointmentDate}`
                return res.send({ acknowledged: false, message })
            }
            const result = await bookingsCollection.insertOne(booking)
            res.send(result)
        })

        app.get('/bookings', async (req, res) => {
            const email = req.query.email
            //     const decodedEmail = req.decoded.email
            //     if (email !== decodedEmail) {
            //     return res.status(403).send({ message: 'forbidden access' })
            // }

            const query = { email: email }
            const bookings = await bookingsCollection.find(query).toArray()
            res.send(bookings)
        })

        // app.get('/jwt', async (req, res) => {
        //     const email = req.query.email
        //     const query = { email: email }
        //     const user = await usersCollection.findOne(query)

        //     if (user) {
        //         const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' })

        //         return res.send({ AccessToken: token })
        //     }

        // })

        app.get('/appointmentspecialty', async (req, res) => {
            const query = {}
            const result = await appoinCollection.find(query).project({ name: 1 }).toArray()
            res.send(result)
        })

        app.get('/jwt', async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
                return res.send({ accessToken: token })
            }
            res.status(403).send({ accessToken: '' })


        })

        app.post('/users', async (req, res) => {
            const user = req.body
            const result = await usersCollection.insertOne(user)
            res.send(result)
        })

        app.get('/users', async (req, res) => {
            const query = {}
            const users = await usersCollection.find(query).toArray()
            res.send(users)
        })

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query)

            res.send({ isAdmin: user?.role === 'admin' })
        })

        app.put('/users/admin/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: ObjectId(id) }
            const options = { Upsert: true }
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options)
            res.send(result)
        })

        // app.get('/addprice', async (req, res) => {
        //     const filter = {}
        //     const options = { Upsert: true }
        //     const updatedDoc = {
        //         $set: {
        //             price: 100
        //         }
        //     }
        //     const result = await appoinCollection.updateMany(filter, updatedDoc, options)
        //     res.send(result)
        // })

        app.post('/doctors', async (req, res) => {
            const doctor = req.body;
            const result = await doctorsCollection.insertOne(doctor)
            res.send(result)
        })

        app.get('/doctors', async (req, res) => {
            const query = {}
            const doctor = await doctorsCollection.find(query).toArray()
            res.send(doctor)
        })

        app.delete('/doctors/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: ObjectId(id) }
            const result = await doctorsCollection.deleteOne(filter)
            res.send(result)
        })


    }
    finally {

    }
}
run().catch(err => console.error(err))




app.listen(port, () => {
    console.log(`server is running on port ${port}`)
})
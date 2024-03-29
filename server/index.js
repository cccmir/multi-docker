const keys = require('./keys');

// EXPRESS APP SETUP
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

console.error("Starting up with pguser: " + keys.pgUser + " pass:" + keys.pgPassword)
// POSTGRESS CLIENT SETUP
const { Pool } = require('pg');
const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort
})

pgClient.on('error', (err) => {
    console.log('Lost PG connection');
});

pgClient.query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .catch((err) => console.log('Failed to create table: ' + err));


// REDIS CLIENT SETUP
const redis = require("redis");
const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_startegy: () => 1000
});

const redisPublisher = redisClient.duplicate();


// Exporess route handlers

app.get('/', (req, res) => {
    res.send('Hi');
});

app.get('/values/all', async (req, res) => {
    const values = await pgClient.query('SELECT * FROM values');
    res.send(values.rows);
});

app.get('/values/current', async (req, res) => {
    redisClient.hgetall('values', (err, values) => {
        res.send(values);
    });
});

app.post('/values', async (req, res) => {
    const index = req.body.index;
    if (parseInt(index) > 40) {
        res.status(422).send('Index is too high');
    }

    redisClient.hset('values', index, 'Nothing yet!');
    redisPublisher.publish('insert', index);
    pgClient.query('INSERT INTO values(number) VALUES($1)', [index] );
    res.send({working: true});
});

app.listen(5000, err => {
    console.log("Listening ! ");
});
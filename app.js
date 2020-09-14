// Note the connectionString is initialized from an environment variable
require('dotenv').config({ path: './.env' });

var express = require('express'),
    bodyParser = require('body-parser'),
    app = express(),
    path = require('path'),
    http = require('http').Server(app),
    mongoose = require('mongoose'),
    moment = require('moment'),
    btoa = require('btoa'),
    atob = require('atob'),
    promise,
    connectionString = process.env.CONNECTION_STRING,
    port = process.env.PORT || 8080,
    ipAddress = process.env.HOST || 'localhost',
    server = `${ipAddress}:${port}`;

// ExpressJS server start
http.listen(port, () => {
    console.log('Server Started. Listening on:' + port);
});

// ExpressJS middleware for serving static files
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// Counter Collection Schema
var countersSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    count: { type: Number, default: 0 }
});

var CounterModel = mongoose.model('Counter', countersSchema);

// URL Collection Schema
var urlSchema = new mongoose.Schema({
    _id: { type: Number },
    url: '',
    sorterUrl: '',
    clickCount: { type: Number, default: 0 },
    viewRecord: [],
    created_at: ''
});

// URL Schema pre-save step
// This is run BEFORE a new document is persisted in the URL collection. All
// we are doing here is incrementing the counter in the Counter collection which
// then becomes the unique ID for the new document to be inserted in the URL
// collection
urlSchema.pre('save', function (next) {
    var that = this;
    CounterModel.findByIdAndUpdate({ _id: 'url_count' }, { $inc: { count: 1 } }, (err, counter) => {
        if (err) {
            return next(err)
        };
        that._id = counter.count;
        that.created_at = new Date();
        next();
    });
});

var URLModel = mongoose.model('URL', urlSchema);

// Connect to the MongoDB instance
promise = mongoose.connect(connectionString, {
    // useMongoClient: true
});

// Reset the app to default values when starting the server
promise.then((db) => {
    URLModel.deleteOne({}, () => {
        console.log('APP: URL collection emptied');
    })
    CounterModel.deleteOne({}, () => {
        console.log('APP: Counter collection emptied');
        var counter = new CounterModel({ _id: 'url_count', count: 10000 });
        counter.save((err) => {
            if (err) {
                return console.error(err);
            }
        });
    });
});

// Base route for front-end
app.get('/', (req, res) => {
    res.sendFile('views/index.html', {
        root: __dirname
    });
});


// Base route for error page
app.get('/notFound', (req, res) => {
    res.sendFile('views/notFound.html', {
        root: __dirname
    });
});

app.get('/data', (req, res) => {
    let bodyData = ``;
    URLModel.find({}, (err, doc) => {
        if (doc && doc.length) {
            bodyData += `<table border=1 align='center'>`;
            bodyData += `<th colspan='5'><h2>Data is used for now thank you for using our application</h2></th>`;
            bodyData += `<tr>`;
            bodyData += `<th>Sort URL</th>`;
            bodyData += `<th>URL</th>`;
            bodyData += `<th>COUNT</th>`;
            bodyData += `<th>Country Descending order</th>`;
            bodyData += `<th>Create Date</th>`;
            bodyData += `</tr>`;
            doc.map((document) => {
                bodyData += `<tr>`;
                bodyData += `<td>${document.sorterUrl}</td>`;
                bodyData += `<td>${document.url}</td>`;
                bodyData += `<td>${document.clickCount}</td>`;

                // TODO: need to add logic get country name according descending to click
                bodyData += `<td>${document._id}</td>`;
                bodyData += `<td>${moment(document.created_at).format('LL')}</td>`;
                bodyData += `</tr>`;
            });
            bodyData += `</table>`;
        } else {
            bodyData += `<table align='center'>`;
            bodyData += `<th><h2>Data is used for now thank you for using our application</h2></th>`;
            bodyData += `</table>`;
        }
        res.send(bodyData);
    });
});

// API for redirection
app.get('/:hash', (req, res) => {
    const { hash: baseId } = req.params;
    if (baseId) {
        let id = atob(baseId);
        let beforeOneMonthData = moment().subtract(1, 'month').format('YYYY-MM-DD');
        URLModel.findOne({ _id: id, created_at: { "$gte": beforeOneMonthData } }, (err, doc) => {
            if (doc) {
                const { host } = req.headers;
                // Add all details which related to the ip location or client browser 
                let element = {
                    host
                };
                // TODO add record IP data connection on array format
                doc.clickCount = doc.clickCount + 1;
                doc.viewRecord.push(element);
                URLModel.findByIdAndUpdate({ _id: doc._id }, doc, (err, counter) => {
                    if (err) {
                        return next(err)
                    };
                    // IF true
                    // If false then 404
                    res.redirect(doc.url);
                });
            } else {
                res.redirect('/notFound');
            }
        });
    }
});

// API for shortening
app.post('/shorten', (req, res, next) => {
    const { url } = req.body;
    URLModel.findOne({ url }, (err, doc) => {
        if (doc) {
            res.send({
                url,
                hash: btoa(doc._id),
                status: 200,
                statusTxt: 'OK'
            });
        } else {
            const urlSchema = new URLModel({
                url
            });
            urlSchema.save((err) => {
                if (err) {
                    return console.error(err);
                }
                let sortPath = btoa(urlSchema._id);
                urlSchema.sorterUrl = `${server}/${sortPath}`
                URLModel.findByIdAndUpdate({ _id: urlSchema._id }, urlSchema, (err) => {
                    res.send({
                        url,
                        hash: sortPath,
                        status: 200,
                        statusTxt: 'OK'
                    });
                });
            });
        }
    });
});

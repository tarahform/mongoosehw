var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var request = require('request');
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Use body-parser for handling form submissions
app.use(bodyParser.urlencoded({ extended: true }));
// Use express.static to serve the public folder as a static directory
app.use(express.static("public"));

// Connect to the Mongo DB
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoosehw";
mongoose.connect(MONGODB_URI, {
    useMongoClient: true
});

// Routes
// A GET route for scraping the echoJS website
app.get("/scrape", function (req, res) {
    request("https://www.npr.org/", function (error, response, html) {
        var $ = cheerio.load(html);
        $(".story-text").each(function (i, element) {
            var title = $(element).children("a").children(".title").text().replace(/\\'/g, "");
            // console.log('title: ', title);
            var link = $(element).children("a").attr("href");
            // console.log('link: ', link);
            var summary = $(element).children("a").children("p.teaser").text();
            // console.log('summary: ', summary);
            var results = {
                title: title,
                link: link,
                summary: summary
            };
            // console.log("results: ", results);
            db.Article.create(results).then(function (dbArticle) {
                console.log(dbArticle);
            }).catch(function (err) {
                return res.json(err);
            })
        });
    })
    res.send("Scrape Complete");
})

// Route for getting all Articles from the db
app.get("/articles", function (req, res) {
    // TODO: Finish the route so it grabs all of the articles
    db.Article.find({}, function (err, docs) {
        if (err) throw err;
        res.json(docs);
    });
});

// Route for grabbing a specific Article by id, populate it with it's comment
app.get("/articles/:id", function (req, res) {
    db.Article.findOne({ _id: req.params.id })
        .populate("comment")
        .then(function (dbArticle) {
            res.json(dbArticle);
        })
        .catch(function (err) {
            res.json(err);
        });
});


// Route for saving/updating an Article's associated Comment
app.post("/articles/:id", function (req, res) {
    console.log(req.body);
    db.Comment.create(req.body)
        .then(function (dbComment) {
            return db.Article.findOneAndUpdate({ _id: req.params.id }, { comment: dbComment._id }, { new: true })
        })
        .then(function (dbArticle) {
            res.json(dbArticle);
        })
        .catch(function (err) {
            res.json(err);
        });
});

// Start the server
app.listen(PORT, function () {
    console.log("App running on port " + PORT + "!");
});

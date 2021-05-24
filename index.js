const express = require('express')
const app = express()
const port = process.env.port || 3000;
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { connectionString, secretKey } = require('./config');
const deliveryFeeSchema = require('./models/testschema');
const jwt = require('jsonwebtoken');

mongoose.connect(connectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}, (err, client) => {
    if (err) return console.error(err)
    const db = mongoose.connection;
    console.log('Connected to Database');
    app.listen(port, () => {
        console.log(`Example app listening at http://localhost:${port}`)
    })
})

app.use(bodyParser.urlencoded({ extended: true }))
app.set('view engine', 'ejs')

//middleware
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];

        jwt.verify(token, secretKey, (err, user) => {
            if (err) {
                return res.sendStatus(403);
            }

            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/home.html');
})

app.get('/createmaster', (req, res) => {
    try {
        const newSchema = new deliveryFeeSchema({
            productType: "cold_chain",
            deliveryDay: "next_day",
            nameDescription: "Next Day Cold Chain",
            price: "2000",
            bulk_discount: [{
                month_units_minimum: "100",
                discount: "300",
            },
            {
                month_units_minimum: "300",
                discount: "500",
            }, {
                month_units_minimum: "500",
                discount: "600",
            }]
        });

        newSchema.save();
        res.redirect('/')

    }
    catch (err) {
        console.log('Err: ', err)
    }
})

app.get('/getFees', (req, res) => {
    try {
        deliveryFeeSchema.find()
            .then((result) => {
                let allFees = [];
                for (let i = 0; i < result.length; i++) {
                    let getFees = {};
                    getFees._id = result[i]._id;
                    getFees.name = result[i].nameDescription;
                    getFees.price = + result[i].price;
                    getFees.Bulk_100 = '0';
                    getFees.Bulk_300 = '0';
                    getFees.Bulk_500 = '0';
                    for (let j = 0; j < result[i].bulk_discount.length; j++) {
                        if (result[i].bulk_discount[j].month_units_minimum == '100') getFees.Bulk_100 = result[i].bulk_discount[j].discount;
                        if (result[i].bulk_discount[j].month_units_minimum == '300') getFees.Bulk_300 = result[i].bulk_discount[j].discount;
                        if (result[i].bulk_discount[j].month_units_minimum == '500') getFees.Bulk_500 = result[i].bulk_discount[j].discount;
                    }

                    allFees.push(getFees);
                }
                res.send(allFees)
            })
            .catch((err) => {
                console.log(err);
            })
    }
    catch (err) {
        console.log('Err: ', err)
    }
})


app.post('/postcreate', authenticateJWT, (req, res) => {
    if (req.user.role !== '1') {
        return res.sendStatus(403);
    }

    const newSchema = new deliveryFeeSchema({
        productType: req.body.producttype,
        deliveryDay: req.body.deliveryDay,
        nameDescription: req.body.nameDescription,
        price: req.body.price,
        bulk_discount: [{
            month_units_minimum: "100",
            discount: req.body.discount100,
        },
        {
            month_units_minimum: "300",
            discount: req.body.discount300,
        }, {
            month_units_minimum: "500",
            discount: req.body.discount500,
        }]
    });

    newSchema.save();
    res.status(200).json({ success: true })
})

//just for my reference
app.post('/search/:id', async (req, res) => {
    try {
        const post = await deliveryFeeSchema.findById(req.params.id);
        if (!post) throw Error('No Items');
        res.status(200).json(post);
    } catch (err) {
        console.log(err);
        res.status(400).json({ mesg: err })
    }
});

// //just for my reference
app.get('/nested/:month_units_minimum', async (req, res) => {
    try {
        console.log(req.params.month_units_minimum);
        var myquery = { bulk_discount: { $elemMatch: { "_id": "60aaa98fa037a545b4d08347", "month_units_minimum": req.params.month_units_minimum } } }

        const post = await deliveryFeeSchema.find(myquery);
        console.log(post)
        if (!post) throw Error('No Items');
        res.status(200).json(post);
    } catch (err) {
        console.log(err);
        res.status(400).json({ mesg: err })
    }
});

app.delete('/delete/:id', async (req, res) => {
    try {
        const post = await deliveryFeeSchema.findByIdAndDelete(req.params.id);
        if (!post) {
            res.status(200).json({ success: false })
        }
        else {
            res.status(200).json({ success: true })
        }
    } catch (err) {
        res.status(400).json({ msg: err })
    }
});

app.post('/postUpdate', authenticateJWT, async (req, res) => {
    try {
        if (req.user.role !== '2') {
            return res.sendStatus(403);
        }

        const result = await deliveryFeeSchema.findOneAndUpdate(
            { _id: req.body._id },
            {
                $set: {
                    price: req.body.price
                }
            }
        )

        if (!result) {
            res.status(200).json({ success: false })
        }
        else {
            for (const records of result.bulk_discount) {
                var myquery = {_id: result._id, "bulk_discount.month_units_minimum" : records.month_units_minimum };
                var newvalues = { $set: { "bulk_discount.$.discount" : req.body["discount" + records.month_units_minimum] } };
                await deliveryFeeSchema.findOneAndUpdate(myquery, newvalues);
            }

            res.status(200).json({ success: true })
        }

    } catch (err) {
        console.log(err);
        res.status(400).json({ mesg: err })
    }
});

app.post('/createToken', (req, res) => {
    try {
        const accessToken = jwt.sign({ role: req.body.admintype }, secretKey);
        res.json({
            accessToken
        });
    } catch (err) {
        console.log(err);
        res.status(400).json({ mesg: err })
    }
});
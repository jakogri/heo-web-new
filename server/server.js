const EXPRESS = require('express');
const PATH = require('path');
const AWS = require('aws-sdk');
const FILE_UPLOAD = require('express-fileupload');
const CORS = require('cors');
const { MongoClient } = require('mongodb');
const jwt = require('express-jwt');
const jsonwebtoken = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const ethereumutil = require("ethereumjs-util");
const fs = require("fs");
const MessageValidator = require('sns-validator')
const Sentry = require('@sentry/node');
const Tracing = require("@sentry/tracing");
const ServerLib = require('./serverLib');
const CircleLib = require('./circleLib');
const PayadmitLib = require('./payadmitLib');

const StripeLib = require('./stripeLib');
const CoinbaseLib = require('./coinbaseLib');

const PORT = process.env.PORT || 5000;


require('dotenv').config({path : PATH.resolve(process.cwd(), '.env')});

const APP = EXPRESS();

const serverLib = new ServerLib();
const circleLib = new CircleLib();
const payadmitLib = new PayadmitLib();

const stripeLib = new StripeLib();
const coinbaseLib = new CoinbaseLib();

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
        // enable HTTP calls tracing
        new Sentry.Integrations.Http({ tracing: true }),
        // enable Express.js middleware tracing
        new Tracing.Integrations.Express({ APP }),
    ],
    /**
     * Set tracesSampleRate to 1.0 to capture 100%
     * of transactions for performance monitoring.
     * We recommend adjusting this value in production
     */
    tracesSampleRate: 0.1,
});
/**
 * RequestHandler creates a separate execution context using domains, so that every
 * transaction/span/breadcrumb is attached to its own Hub instance
 */
APP.use(Sentry.Handlers.requestHandler());
// TracingHandler creates a trace for every incoming request
APP.use(Sentry.Handlers.tracingHandler());

APP.use(FILE_UPLOAD());
APP.use(CORS());

APP.post('/api/stripenotifications', EXPRESS.raw({type: 'application/json'}),async (req, res) => {
    const DB = CLIENT.db(DBNAME);
    let fiatPayment;
    try {
        fiatPayment = await serverLib.handleGetFiatPaymentSettings(DB, Sentry);
    } catch (err) {Sentry.captureException(new Error(err));}

    if (fiatPayment && fiatPayment === 'stripeLib') {
        stripeLib.handleNotification(req, res, STRIPE_API_KEY, STRIPE_WH_SECRET, CLIENT, DBNAME, Sentry);
        res.sendStatus(200);
    } else {
        res.status(503).send('serviceNotAvailable');
    }
});

APP.use(EXPRESS.json());

const URL = `mongodb+srv://${process.env.MONGO_LOGIN}:${process.env.MONGODB_PWD}${process.env.MONGO_URL}`;
const DBNAME = process.env.MONGO_DB_NAME;
const CLIENT = new MongoClient(URL, { useUnifiedTopology: true });
const CIRCLE_API_URL = process.env.CIRCLE_API_URL;
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY;
const CIRCLEARN = /^arn:aws:sns:.*:908968368384:(sandbox|prod)_platform-notifications-topic$/;
const validator = new MessageValidator();
const PAYADMIT_API_KEY = process.env.PAYADMIT_API_KEY;
const PAYADMIT_API_URL = process.env.PAYADMIT_API_URL;

const STRIPE_API_KEY = process.env.STRIPE_API_KEY;
const STRIPE_WH_SECRET = process.env.STRIPE_WH_SECRET;
const COINBASE_API_KEY = process.env.COINBASE_API_KEY;
const COINBASE_SHARED_SECRET = process.env.COINBASE_SHARED_SECRET;

CLIENT.connect(err => {
    if(err) {
        console.log(err);
        Sentry.captureException(new Error(err));
    }
    console.log('connected succesfully to server');
});

// Serve the static files from the React APP
APP.use(EXPRESS.static(PATH.join(__dirname, '../build')));
const S3 = new AWS.S3({
    accessKeyId: process.env.SERVER_APP_ACCESS_ID,
    secretAccessKey: process.env.SERVER_APP_ACCESS_KEY
});

async function getId(DB, key){
    try {
        const myCollection = await DB.collection('campaigns');
        let result = await myCollection.findOne({"key" : key});
        if (result) return (result._id);
        else return (key);
    } catch (err) {Sentry.captureException(new Error(err));}
}

APP.use(cookieParser());
APP.use(jwt({ secret: process.env.JWT_SECRET, credentialsRequired:false, getToken: req => req.cookies.authToken, algorithms: ['HS256'] }));
APP.use(jwtErrorCatch);
function jwtErrorCatch (err, req, res, next) {
    if(err && err.code == "invalid_token") {
        Sentry.captureException(new Error(err));
        next(null, req, res.clearCookie('authToken'));
    } else {
        next(err, req, res);
    }
}

APP.head('/api/circlenotifications', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/html',
    });
    res.end(`HEAD request for ${req.url}`);
})

APP.post('/api/circlenotifications', async (req, res) => {
    const DB = CLIENT.db(DBNAME);
    let fiatPayment;
    try {
        fiatPayment = await serverLib.handleGetFiatPaymentSettings(DB, Sentry);
    } catch (err) {Sentry.captureException(new Error(err));}

    if (fiatPayment && fiatPayment === 'circleLib') {
        circleLib.handleCircleNotifications(req, res, CIRCLEARN, CIRCLE_API_KEY, validator, CLIENT, DBNAME, Sentry);
    } else {res.status(503).send('serviceNotAvailable');}
});

APP.post('/api/uploadimage', (req,res) => {
 if(serverLib.authenticated(req, res, Sentry))
 serverLib.handleUploadImage(req, res, S3, Sentry);
});

APP.post('/api/deleteimage', (req, res) => {
    if(serverLib.authenticated(req, res, Sentry)) serverLib.handleDeleteImage(req, res, S3, Sentry);
});

APP.post('/api/is_autorisation', function(req, res) {
    if(req.user && req.user.email) {
         res.send(req.user.email);
    } else {
       res.send(false);
    }
});

APP.post('/api/sendemail', async (req, res) => {
    const DB = CLIENT.db(DBNAME);
    serverLib.handleSendEmail(req, res, Sentry, req.body.key, req.body.text, DB);
})

APP.post('/api/campaign/add', async (req, res) => {
    if(serverLib.authenticated(req, res, Sentry)) {
        const DB = CLIENT.db(DBNAME);
        let walletId, fiatPayment;
        try {
            fiatPayment = await serverLib.handleGetFiatPaymentSettings(DB, Sentry);
            if (fiatPayment && fiatPayment === 'circleLib') {
                walletId = await circleLib.createCircleWallet(req.body.mydata.address, CIRCLE_API_KEY, Sentry)
            }
        } catch (err) {Sentry.captureException(new Error(err));}
       if (serverLib.handleAddCampaign(req, res, Sentry, DB, walletId)){
        const text = "There is a new campaign. Please review. " + "Сampaign title - " + req.body.mydata.title["default"] +
        ". Сampaign name " + req.body.mydata.org["default"] + ". Сampaign ID - " +  req.body.mydata.id + ". Сampaign beneficiary - " +
        req.user.email + ". Сampaign owner - " + req.user.email + ". Сampaign key - " + req.body.mydata.key + ".";
        serverLib.handleSendEmail(req, res, Sentry, 'New Campaign Alert', text, DB);
       }
       else res.sendStatus(500);
    }
});

APP.post('/api/donate/adddanate', async (req, res) => {
    if(serverLib.authenticated(req, res, Sentry)){
       const DB = CLIENT.db(DBNAME);
       serverLib.handleUpdateCampaignWallet(req, res, Sentry, DB); 
       serverLib.handleAddDanate(req, res, Sentry, DB);
    }
});

APP.post('/api/campaign/updateWallet', async (req, res) => {
    const DB = CLIENT.db(DBNAME);
    serverLib.handleUpdateCampaignWallet(req, res, Sentry, DB);
});

APP.post('/api/campaign/update', (req, res) => {
    if(serverLib.authenticated(req, res, Sentry)) {
        const DB = CLIENT.db(DBNAME);
        serverLib.handleUpdateCampaign(req, res, Sentry, DB);
    }
});

APP.post('/api/campaign/campaignstouser', (req, res) => {
    if(serverLib.authenticated(req, res, Sentry)) {
        const DB = CLIENT.db(DBNAME);
       serverLib.handleAddCampaignsToUser(req, res, Sentry, DB);
    }
});

APP.post('/api/campaign/deactivate', (req, res) => {
    if(serverLib.authenticated(req, res, Sentry)) {
        const DB = CLIENT.db(DBNAME);
        serverLib.handleDeactivateCampaign(req, res, Sentry, DB);
    }
});

APP.post('/api/campaign/loadFinishedCampaigns', (req, res) => {
    const DB = CLIENT.db(DBNAME);
    serverLib.handleLoadFinishedCampaigns(req, res, Sentry, DB);
});

APP.post('/api/campaign/loadAll', (req, res) => {
    const DB = CLIENT.db(DBNAME);
    serverLib.handleLoadAllCampaigns(req, res, Sentry, DB);
});

APP.post('/api/campaign/getid', (req, res) => {
    const DB = CLIENT.db(DBNAME);
    serverLib.handleGetId(req, res, Sentry, DB);
});

APP.post('/api/campaign/getalldonations', (req, res) => {
    const DB = CLIENT.db(DBNAME);
    serverLib.handleGetAllDonateForCampaign(req, res, Sentry, DB);
});

APP.post('/api/getcoinslist', (req, res) => {
    const DB = CLIENT.db(DBNAME);
    serverLib.handleGetCoinsList(req, res, Sentry, DB);
});

APP.post('/api/gettipforheo', (req, res) => {
    const DB = CLIENT.db(DBNAME);
    serverLib.handleGetTipForHeo(req, res, Sentry, DB);
});

APP.post('/api/getchainslist', (req, res) => {
    const DB = CLIENT.db(DBNAME);
    serverLib.handleGetChainsList(req, res, Sentry, DB);
});

APP.post('/api/campaign/getalldonationsforlist', (req, res) => {
    const DB = CLIENT.db(DBNAME);
    serverLib.handleGetAllDonateForList(req, res, Sentry, DB);
});

APP.post('/api/campaign/getCountInPage', (req, res) => {
    const DB = CLIENT.db(DBNAME);
    serverLib.handleGetCountInPage(res, Sentry, DB);
});

APP.post('/api/campaign/getCountInFinishPage', (req, res) => {
    const DB = CLIENT.db(DBNAME);
    serverLib.handleGetCountInFinashpage(res, Sentry, DB);
});

APP.post('/api/campaign/loadOne', (req, res) => {
    const DB = CLIENT.db(DBNAME);
    serverLib.handleLoadOneCampaign(req, res, Sentry, DB);
});

APP.post('/api/campaign/checkKey', (req, res) => {
    const DB = CLIENT.db(DBNAME);
    serverLib.handlecheckKey(req, res, Sentry, DB);
});

APP.post('/api/campaign/loadUserCampaigns', (req, res) => {
    if(serverLib.authenticated(req, res, Sentry)) {
        const DB = CLIENT.db(DBNAME);
        serverLib.handleLoadUserCampaigns(req, res, Sentry, DB);
    }
});

APP.get('/api/env', (req, res) => {
    const DB = CLIENT.db(DBNAME);
    serverLib.handleLoadEnv(res, process.env.CHAIN, process.env.TRON_CHAIN, Sentry, DB);
});

APP.get('/api/auth/msg', (req, res) => {
    res.json({dataToSign:`Today is ${(new Date()).toDateString()}`});
});


APP.post('/api/auth/registr_start', async (req, res) => {
    const DB = CLIENT.db(DBNAME);
    let result = await serverLib.handleCheckUser(req, DB);
    if(result > 0)  res.send('old_user');
    else if (result === 0){
        let text = await serverLib.handleRegistrationStart(req, res, Sentry);
        await serverLib.handleSendEmail(req, res, Sentry, "HEO-Platform Confirmation Code", text, DB);
    }
})

APP.post('/api/auth/autor_start', async (req, res) => {
    const DB = CLIENT.db(DBNAME);
    let result = await serverLib.handleCheckUser(req, DB);
    if(result === 0)  res.send('no_user');
    else if (result === 2) res.send('bad_password');
    else if (result === 1){
        let text = await serverLib.handleRegistrationStart(req, res, Sentry);
        await serverLib.handleSendEmail(req, res, Sentry, "HEO-Platform Confirmation Code", text, DB);
    }
})

APP.post('/api/auth/change_pass', async (req, res) => {
    const DB = CLIENT.db(DBNAME);
    let result = await serverLib.handleCheckUser(req, DB);
    if(result === 0)  res.send('no_user');
    else{
        let text = await serverLib.handleRegistrationStart(req, res, Sentry);
        await serverLib.handleSendEmail(req, res, Sentry, "HEO-Platform Confirmation Code", text, DB);
    }
})


APP.post('/api/auth/check_code', async (req, res) => {
    await serverLib.handleCheckCode(req, res);
})

APP.post('/api/auth/registr_end', async (req, res) => {
    const DB = CLIENT.db(DBNAME);
    await serverLib.handleRegistrationEnd(req, res, Sentry, DB);
})

APP.post('/api/auth/new_pass', async (req, res) => {
    const DB = CLIENT.db(DBNAME);
    await serverLib.handleNewPassword(req, res, Sentry, DB);
})

APP.post('/api/auth/autor_end', async (req, res) => {
    try{
        let token = jsonwebtoken.sign({ email:req.body.mydata.to_email }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.cookie('authToken', token, { httpOnly: true }).send({success:true});
    } catch (err) {
        console.log("error autorisation:");
        console.log(err);
        Sentry.captureException(new Error(err));
        res.sendStatus(401);
    }
})

APP.post('/api/auth/deautor', async (req, res) => {
    try{
       res.clearCookie('authToken', { httpOnly: true }).send({success:true});
    } catch (err) {
        Sentry.captureException(new Error(err));
        res.sendStatus(401);
    }
})

APP.post('/api/auth/jwt', async(req, res) => {
    //extract Address from signature
    try {
        let dataToSign = `Today is ${(new Date()).toDateString()}`;
        var signature;
        if(req.body.signature && req.body.signature.signature) {
            signature = req.body.signature.signature;
        } else if(req.body.signature) {
            signature = req.body.signature;
        }
        const {v, r, s} = ethereumutil.fromRpcSig(signature);
        let signedData = ethereumutil.keccak("\x19Ethereum Signed Message:\n" + dataToSign.length + dataToSign);
        const pubKey = ethereumutil.ecrecover(signedData, v, r, s);
        const addrBuf = ethereumutil.pubToAddress(pubKey);
        const addr = ethereumutil.bufferToHex(addrBuf).toLowerCase();
        if(addr != req.body.addr.toLowerCase()) {
            Sentry.captureException(new Error('auth failed'));
            res.sendStatus(401);
        } else {
            let token = jsonwebtoken.sign({ address:addr }, process.env.JWT_SECRET, { expiresIn: '7d' });
            res.cookie('authToken', token, { httpOnly: true }).send({success:true});
        }
    } catch (err) {
        console.log(err);
        Sentry.captureException(new Error(err));
        res.sendStatus(401);
    }
});

APP.get('/api/auth/status', (req, res) => {
    if(serverLib.authenticated(req, res, Sentry)) res.send({addr:req.user.address});
});

APP.post('/api/auth/logout', (req, res) => {
    res.clearCookie('authToken').send({});
});

/**
 * webhook for Coinbase Commerce notifications
 */
APP.post('/api/coinbasecommerce', async (req, res) => {
    const sharedSecret = COINBASE_SHARED_SECRET;

    // Verify the webhook notification using the shared secret
    const signature = req.headers['x-cc-webhook-signature'];
    const isValid = coinbaseLib.verifyWebhookPayload(signature, req.body, sharedSecret, Sentry);
    if (isValid) {
        const DB = CLIENT.db(DBNAME);
        coinbaseLib.updateCharge(DB, Sentry, req.body);
        res.sendStatus(200);
    } else {
        Sentry.captureException(new Error('Invalid signature for Coinbase Commerce webhook'));
        res.sendStatus(500);
    }
});

/**
 * webhook for payadmit notifications. Url will have to
 * be changed in the payadmit shop for production
 */
APP.post('/api/payadmitnotifications', async (req, res) => {
    const DB = CLIENT.db(DBNAME);
    const recordId = req.body.id;
    let errCode;
    if(req.body.errorCode) errCode = req.body.errorCode;
    const data = {
        paymentStatus: req.body.state,
        lastUpdated: new Date(),
        errorCode: errCode,
        currency: req.body.currency,
        paymentAmount: req.body.amount
    }
    try {
        const myCollection = await DB.collection('fiat_payment_records');
        await myCollection.updateOne({'_id': recordId}, {$set: data});
        console.log(await DB.collection('fiat_payment_records').findOne({'_id': recordId}));
    }
    catch (err) {Sentry.captureException(new Error(err));}

    res.sendStatus(200);
})

APP.post('/api/payadmit/getPaymentRecord', (req, res) => {
    const DB = CLIENT.db(DBNAME);
    payadmitLib.getPaymentDetails(req, res, Sentry, DB);
})

APP.post('/api/donatefiat', async (req, res) => {
    const DB = CLIENT.db(DBNAME);
    let fiatPayment;
    try {
        fiatPayment = await serverLib.handleGetFiatPaymentSettings(DB, Sentry);
    } catch (err) {
        Sentry.captureException(new Error(err));
    }

    if (fiatPayment && fiatPayment === 'circleLib') {
        circleLib.handleDonateFiat(req, res, CIRCLE_API_URL, CIRCLE_API_KEY, Sentry, CLIENT, DBNAME);
    } else if (fiatPayment && fiatPayment === 'payadmitLib') {
        payadmitLib.handleDonateFiat(req, res, PAYADMIT_API_URL, PAYADMIT_API_KEY, Sentry, CLIENT, DBNAME);
    } else if (fiatPayment && fiatPayment === 'stripeLib') {
        console.log("Handing fiat via Stripe");
        stripeLib.handleDonateFiat(req, res, STRIPE_API_KEY, CLIENT, DBNAME, Sentry);
    } else {
        res.status(503).send('serviceNotAvailable');
    }
});

APP.post('/api/donaterecurring', async (req, res) => {
    const DB = CLIENT.db(DBNAME);
    let fiatPayment;
    try {
        fiatPayment = await serverLib.handleGetFiatPaymentSettings(DB, Sentry);
    } catch (err) {
        Sentry.captureException(new Error(err));
    }

    if (fiatPayment && fiatPayment === 'stripeLib') {
        stripeLib.handleDonateRecurring(req, res, STRIPE_API_KEY, CLIENT, DBNAME, Sentry);
    } else {
        res.status(503).send('serviceNotAvailable');
    }
});
        
// Handles crypto payment initiation via coinbase commerce
APP.post('/api/donatecoinbasecommerce', async (req, res) => {
    try {
        console.log("Looking up coinbase library");
        coinbaseLib.createCharge(req, res, CLIENT, DBNAME, Sentry, COINBASE_API_KEY);
    } catch (err) {
        console.log(err);
        Sentry.captureException(new Error(err));
    }
});

/**
 * Handles any requests that don't match the ones above.
 * All other routing except paths defined above is done by React in the UI
 */
APP.get('*', async(req,res) =>{
    var title = "HEO App";
    var description = "Crowdfunding on blockchain.";
    var image = "https://app.heo.finance/logo512.png";
    var url = "https://app.heo.finance";
    var campaign;
    var splitURL = req.url.split('/');
    var campaignId = splitURL[splitURL.length -1]

    if(splitURL.length > 2) {
        try {
            const DB = CLIENT.db(DBNAME);
            campaignId = await getId(DB, campaignId);
            campaign = await DB.collection("campaigns").findOne({"_id" : campaignId});
            if(campaign) {
                title = (campaign.title.default).replace(/"/g,"&quot;");
                description = (campaign.description.default).replace(/"/g,"&quot;");
                image = campaign.mainImageURL;
                url = req.url;
            } else {
                Sentry.captureException(new Error('campaign no longer available'));
                title="This campaign is no longer available.";
                description="";
            }
        } catch (err) {
            Sentry.captureException(new Error(err));
            console.log(err);
            title="Information Currently Unavailable.";
            description="";
        }
    }

    const filePath = PATH.resolve(__dirname, '..', 'build', '_index.html');
    fs.readFile(filePath, 'utf8', function (err, data) {
        if (err) {
            res.sendStatus(500);
            return console.log(err);
        }
        data = data.replace(/\$OG_TITLE/g, title);
        data = data.replace(/\$OG_DESCRIPTION/g, description);
        data = data.replace(/\$OG_URL/g, url)
        let result = data.replace(/\$OG_IMAGE/g, image);
        res.send(result);
    });
});

APP.use(Sentry.Handlers.errorHandler());

APP.use(function onError(err, req, res, next) {
    /**
     * The error id is attached to `res.sentry` to be returned
     * and optionally displayed to the user for support.
     */
    res.statusCode = 500;
    res.end(res.sentry + "\n");
});

APP.listen(PORT);

console.log('App is listening on port ' + PORT);
